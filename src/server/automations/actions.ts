"use server";

import {
  AutomationActionType,
  AutomationDelayUnit,
  AutomationStatus,
  AutomationTriggerType,
  Prisma,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  coerceAutomationGoal,
  parseListInput,
} from "@/lib/automations";
import { slugifyCourseTitle } from "@/lib/validators/course";
import { stopAutomationRunsForAutomation } from "@/server/automations/engine";
import { requireUserRole } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function buildAutomationAccessWhere(userId: string, role: UserRole) {
  return role === UserRole.ADMIN ? {} : { authorId: userId };
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeRequiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDelayUnit(
  value: FormDataEntryValue | null,
  fallback: AutomationDelayUnit,
): AutomationDelayUnit {
  const raw = normalizeRequiredText(value);

  return ["MINUTES", "HOURS", "DAYS"].includes(raw)
    ? (raw as AutomationDelayUnit)
    : fallback;
}

async function ensureUniqueAutomationSlug(
  tx: Prisma.TransactionClient,
  authorId: string,
  name: string,
  excludeId?: string,
) {
  const safeBase =
    slugifyCourseTitle(name) || `automation-${Math.random().toString(36).slice(2, 8)}`;
  let candidate = safeBase;
  let suffix = 2;

  while (true) {
    const existing = await tx.automation.findFirst({
      where: {
        authorId,
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${safeBase}-${suffix}`;
    suffix += 1;
  }
}

function buildTriggerConfig(
  triggerType: AutomationTriggerType,
  formData: FormData,
) {
  switch (triggerType) {
    case "ABANDONED_CHECKOUT":
      return {
        delayMinutes: normalizeNumber(formData.get("delayMinutes"), 60),
      };
    case "COURSE_INACTIVE_DAYS":
      return {
        inactiveDays: normalizeNumber(formData.get("inactiveDays"), 7),
      };
    case "DAYS_AFTER_EVENT":
      return {
        daysAfter: normalizeNumber(formData.get("daysAfter"), 3),
        eventType: normalizeRequiredText(formData.get("eventType")) || "LEAD_CAPTURED",
      };
    default:
      return {};
  }
}

function buildConditions(formData: FormData) {
  return {
    segmentKey: normalizeOptionalText(formData.get("segmentKey")),
    tagSlugs: parseListInput(normalizeOptionalText(formData.get("tagSlugs"))),
    sources: parseListInput(normalizeOptionalText(formData.get("sources"))),
    purchasedCourseIds: parseListInput(
      normalizeOptionalText(formData.get("purchasedCourseIds")),
    ),
    excludedPurchasedCourseIds: parseListInput(
      normalizeOptionalText(formData.get("excludedPurchasedCourseIds")),
    ),
  };
}

function buildActionConfig(actionType: AutomationActionType, formData: FormData) {
  switch (actionType) {
    case "APPLY_TAG":
      return {
        tagName: normalizeRequiredText(formData.get("tagName")) || "Новый тег",
        color: normalizeOptionalText(formData.get("tagColor")),
      };
    case "CHANGE_DEAL_STAGE":
      return {
        stage: normalizeRequiredText(formData.get("dealStage")) || "INTERESTED",
        courseId: normalizeOptionalText(formData.get("dealCourseId")),
      };
    case "ISSUE_PROMO_CODE":
      return {
        percentOff: normalizeOptionalText(formData.get("percentOff"))
          ? normalizeNumber(formData.get("percentOff"))
          : null,
        amountOff: normalizeOptionalText(formData.get("amountOff"))
          ? normalizeNumber(formData.get("amountOff"))
          : null,
        currency: normalizeOptionalText(formData.get("promoCurrency")),
        expiresInDays: normalizeOptionalText(formData.get("expiresInDays"))
          ? normalizeNumber(formData.get("expiresInDays"))
          : null,
        prefix: normalizeOptionalText(formData.get("promoPrefix")),
      };
    case "CREATE_FOLLOW_UP":
      return {
        title: normalizeRequiredText(formData.get("followUpTitle")) || "Follow-up",
        note: normalizeOptionalText(formData.get("followUpNote")),
      };
    case "SEND_MESSAGE":
    default:
      return {
        channel: normalizeRequiredText(formData.get("messageChannel")) || "TELEGRAM",
        subject: normalizeOptionalText(formData.get("messageSubject")),
        text:
          normalizeRequiredText(formData.get("messageText")) ||
          "Привет! Возвращаю тебя в воронку Nowa School.",
        html: normalizeOptionalText(formData.get("messageHtml")),
      };
  }
}

function revalidateAutomationPaths(automationId?: string) {
  revalidatePath("/author");
  revalidatePath("/author/automations");

  if (automationId) {
    revalidatePath(`/author/automations/${automationId}`);
  }
}

export async function createAutomation(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/automations");
  const name = normalizeRequiredText(formData.get("name"));

  if (!name) {
    redirect("/author/automations");
  }

  const prisma = getPrismaClient();
  const triggerType =
    (normalizeRequiredText(formData.get("triggerType")) as AutomationTriggerType) ||
    "LEAD_CAPTURED";

  const created = await prisma.$transaction(async (tx) => {
    const slug = await ensureUniqueAutomationSlug(
      tx,
      session.user.id,
      normalizeRequiredText(formData.get("slug")) || name,
    );

    const automation = await tx.automation.create({
      data: {
        authorId: session.user.id,
        courseId: normalizeOptionalText(formData.get("courseId")),
        name,
        slug,
        description: normalizeOptionalText(formData.get("description")),
        triggerType,
        triggerConfig: toInputJson(buildTriggerConfig(triggerType, formData)),
        conditions: toInputJson(buildConditions(formData)),
        goal: toInputJson(
          coerceAutomationGoal(
            {
              type: normalizeRequiredText(formData.get("goalType")) || "COURSE_PURCHASED",
              courseId: normalizeOptionalText(formData.get("goalCourseId")),
            },
            normalizeOptionalText(formData.get("courseId")),
          ),
        ),
      },
    });

    await tx.automationStep.create({
      data: {
        automationId: automation.id,
        order: 0,
        title: "Первое сообщение",
        delayAmount: 0,
        delayUnit: "HOURS",
        actionType: "SEND_MESSAGE",
        actionConfig: toInputJson({
          channel: "TELEGRAM",
          text: "Привет, {{firstName}}! Ты уже рядом с покупкой. Если хочешь, помогу вернуться в checkout.",
        }),
      },
    });

    return automation.id;
  });

  revalidateAutomationPaths(created);
  redirect(`/author/automations/${created}`);
}

export async function updateAutomation(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/automations");
  const automationId = normalizeRequiredText(formData.get("automationId"));

  if (!automationId) {
    redirect("/author/automations");
  }

  const prisma = getPrismaClient();
  const triggerType =
    (normalizeRequiredText(formData.get("triggerType")) as AutomationTriggerType) ||
    "LEAD_CAPTURED";

  await prisma.$transaction(async (tx) => {
    const existing = await tx.automation.findFirst({
      where: {
        id: automationId,
        ...buildAutomationAccessWhere(session.user.id, session.user.role),
      },
    });

    if (!existing) {
      throw new Error("AUTOMATION_NOT_FOUND");
    }

    const slug = await ensureUniqueAutomationSlug(
      tx,
      existing.authorId,
      normalizeRequiredText(formData.get("slug")) || existing.slug,
      existing.id,
    );

    await tx.automation.update({
      where: { id: existing.id },
      data: {
        courseId: normalizeOptionalText(formData.get("courseId")),
        name: normalizeRequiredText(formData.get("name")) || existing.name,
        slug,
        description: normalizeOptionalText(formData.get("description")),
        triggerType,
        triggerConfig: toInputJson(buildTriggerConfig(triggerType, formData)),
        conditions: toInputJson(buildConditions(formData)),
        goal: toInputJson(
          coerceAutomationGoal(
            {
              type: normalizeRequiredText(formData.get("goalType")) || "COURSE_PURCHASED",
              courseId: normalizeOptionalText(formData.get("goalCourseId")),
            },
            normalizeOptionalText(formData.get("courseId")),
          ),
        ),
      },
    });
  });

  revalidateAutomationPaths(automationId);
}

export async function setAutomationStatus(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/automations");
  const automationId = normalizeRequiredText(formData.get("automationId"));
  const rawStatus =
    (normalizeRequiredText(formData.get("status")) as AutomationStatus) || "DRAFT";

  if (
    !automationId ||
    !["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"].includes(rawStatus)
  ) {
    redirect("/author/automations");
  }

  const prisma = getPrismaClient();

  await prisma.$transaction(async (tx) => {
    const automation = await tx.automation.findFirst({
      where: {
        id: automationId,
        ...buildAutomationAccessWhere(session.user.id, session.user.role),
      },
      select: {
        id: true,
      },
    });

    if (!automation) {
      throw new Error("AUTOMATION_NOT_FOUND");
    }

    await tx.automation.update({
      where: { id: automation.id },
      data: {
        status: rawStatus,
      },
    });

    if (rawStatus !== "ACTIVE") {
      await stopAutomationRunsForAutomation(
        {
          automationId: automation.id,
          reason: `automation_${rawStatus.toLowerCase()}`,
        },
        tx,
      );
    }
  });

  revalidateAutomationPaths(automationId);
}

export async function addAutomationStep(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/automations");
  const automationId = normalizeRequiredText(formData.get("automationId"));

  if (!automationId) {
    redirect("/author/automations");
  }

  const prisma = getPrismaClient();

  await prisma.$transaction(async (tx) => {
    const automation = await tx.automation.findFirst({
      where: {
        id: automationId,
        ...buildAutomationAccessWhere(session.user.id, session.user.role),
      },
      include: {
        steps: {
          orderBy: [{ order: "desc" }],
          take: 1,
        },
      },
    });

    if (!automation) {
      throw new Error("AUTOMATION_NOT_FOUND");
    }

    await tx.automationStep.create({
      data: {
        automationId: automation.id,
        order: (automation.steps[0]?.order ?? -1) + 1,
        title: "Новый шаг",
        delayAmount: 24,
        delayUnit: "HOURS",
        actionType: "SEND_MESSAGE",
        actionConfig: toInputJson({
          channel: "EMAIL",
          subject: "Напоминание от Nowa School",
          text: "Возвращаю тебя к следующему шагу. Мы сохранили для тебя место.",
        }),
      },
    });
  });

  revalidateAutomationPaths(automationId);
}

export async function updateAutomationStep(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/automations");
  const stepId = normalizeRequiredText(formData.get("stepId"));

  if (!stepId) {
    redirect("/author/automations");
  }

  const prisma = getPrismaClient();

  const automationId = await prisma.$transaction(async (tx) => {
    const step = await tx.automationStep.findFirst({
      where: {
        id: stepId,
        automation: buildAutomationAccessWhere(session.user.id, session.user.role),
      },
      include: {
        automation: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!step) {
      throw new Error("STEP_NOT_FOUND");
    }

    const actionType =
      (normalizeRequiredText(formData.get("actionType")) as AutomationActionType) ||
      "SEND_MESSAGE";

    await tx.automationStep.update({
      where: { id: step.id },
      data: {
        title: normalizeRequiredText(formData.get("title")) || step.title,
        delayAmount: normalizeNumber(formData.get("delayAmount"), step.delayAmount),
        delayUnit: normalizeDelayUnit(formData.get("delayUnit"), step.delayUnit),
        actionType,
        actionConfig: toInputJson(buildActionConfig(actionType, formData)),
      },
    });

    return step.automation.id;
  });

  revalidateAutomationPaths(automationId);
}

export async function moveAutomationStep(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/automations");
  const stepId = normalizeRequiredText(formData.get("stepId"));
  const direction = normalizeRequiredText(formData.get("direction"));

  if (!stepId || !["up", "down"].includes(direction)) {
    redirect("/author/automations");
  }

  const prisma = getPrismaClient();

  const automationId = await prisma.$transaction(async (tx) => {
    const step = await tx.automationStep.findFirst({
      where: {
        id: stepId,
        automation: buildAutomationAccessWhere(session.user.id, session.user.role),
      },
      include: {
        automation: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!step) {
      throw new Error("STEP_NOT_FOUND");
    }

    const neighbor = await tx.automationStep.findFirst({
      where: {
        automationId: step.automationId,
        ...(direction === "up"
          ? { order: { lt: step.order } }
          : { order: { gt: step.order } }),
      },
      orderBy: [{ order: direction === "up" ? "desc" : "asc" }],
    });

    if (neighbor) {
      await tx.automationStep.update({
        where: { id: step.id },
        data: {
          order: neighbor.order,
        },
      });

      await tx.automationStep.update({
        where: { id: neighbor.id },
        data: {
          order: step.order,
        },
      });
    }

    return step.automation.id;
  });

  revalidateAutomationPaths(automationId);
}

export async function deleteAutomationStep(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/automations");
  const stepId = normalizeRequiredText(formData.get("stepId"));

  if (!stepId) {
    redirect("/author/automations");
  }

  const prisma = getPrismaClient();

  const automationId = await prisma.$transaction(async (tx) => {
    const step = await tx.automationStep.findFirst({
      where: {
        id: stepId,
        automation: buildAutomationAccessWhere(session.user.id, session.user.role),
      },
      select: {
        id: true,
        automationId: true,
      },
    });

    if (!step) {
      throw new Error("STEP_NOT_FOUND");
    }

    await tx.automationStep.delete({
      where: { id: step.id },
    });

    return step.automationId;
  });

  revalidateAutomationPaths(automationId);
}
