"use server";

import {
  FunnelEventType,
  FunnelStatus,
  FunnelVisitStatus,
  PaymentMethodKind,
  Prisma,
  UserRole,
  type FunnelStepType,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  applyVariantConfig,
  buildDefaultFunnelSteps,
  buildFunnelEntryHref,
  buildFunnelStepHref,
  coerceFunnelStepConfig,
  coerceFunnelTransitions,
  getAllowedTransitionKeys,
  getDefaultFunnelStepConfig,
  parseBulletsInput,
  pickFunnelVariant,
  resolveNextStepKey,
  type FunnelStepConfig,
  type FunnelStepDraft,
  type FunnelStepTransitions,
  type FunnelStepVariantConfig,
} from "@/lib/funnels";
import { slugifyCourseTitle } from "@/lib/validators/course";
import {
  PUBLIC_FORM_HONEYPOT_FIELD,
  PUBLIC_FORM_STARTED_AT_FIELD,
} from "@/lib/public-form-security";
import { recordContactLifecycleEvent } from "@/server/automations/engine";
import { getServerAuthSession, requireUserRole } from "@/server/auth/session";
import { startOrderCheckout } from "@/server/billing/service";
import { getPrismaClient } from "@/server/db";
import { recordPlatformEvent } from "@/server/events";
import { guardPublicFormSubmission } from "@/server/public-security";

type TransitionKey = keyof FunnelStepTransitions;

type RuntimeVisit = {
  id: string;
  userId: string | null;
  currentStepId: string | null;
  status: FunnelVisitStatus;
  leadName: string | null;
  leadEmail: string | null;
  telegramUsername: string | null;
  completedAt: Date | null;
  personalDataConsentGranted: boolean;
  emailConsentGranted: boolean;
  telegramConsentGranted: boolean;
};

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function asObject(value: Prisma.JsonValue | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getVisitConsentState(metadata: Prisma.JsonValue | null | undefined) {
  const root = asObject(metadata);
  const rawConsents =
    root.consents && typeof root.consents === "object" && !Array.isArray(root.consents)
      ? (root.consents as Record<string, unknown>)
      : {};

  return {
    personalDataConsentGranted: Boolean(rawConsents.personalDataConsentGranted),
    emailConsentGranted: Boolean(rawConsents.emailConsentGranted),
    telegramConsentGranted: Boolean(rawConsents.telegramConsentGranted),
  };
}

function buildAuthorAccessWhere(userId: string, role: UserRole) {
  return role === UserRole.ADMIN ? {} : { authorId: userId };
}

function decimalToNumber(value: Prisma.Decimal | number) {
  return Number(value);
}

function clampSplitPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.max(1, Math.min(99, Math.round(value)));
}

function normalizeOptionalText(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function normalizeOptionalNullableText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function normalizeNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePaymentMethod(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value : "";

  switch (raw) {
    case "SBP":
      return PaymentMethodKind.SBP;
    case "INSTALLMENT":
      return PaymentMethodKind.INSTALLMENT;
    case "CARD":
    default:
      return PaymentMethodKind.CARD;
  }
}

function normalizeStepType(value: FormDataEntryValue | null): FunnelStepType {
  const raw = typeof value === "string" ? value : "";
  const allowed: FunnelStepType[] = [
    "LANDING",
    "LEAD_CAPTURE",
    "CHECKOUT",
    "UPSELL",
    "DOWNSELL",
    "THANK_YOU",
  ];

  return allowed.includes(raw as FunnelStepType)
    ? (raw as FunnelStepType)
    : "LANDING";
}

function buildTransitionPayload(
  formData: FormData,
  type: FunnelStepType,
): FunnelStepTransitions {
  const transitions = {} as FunnelStepTransitions;

  for (const key of getAllowedTransitionKeys(type)) {
    const value = normalizeOptionalText(formData.get(`transition_${key}`));

    if (value) {
      transitions[key] = value;
    }
  }

  return transitions;
}

function buildVariantPayload(
  formData: FormData,
  prefix: "variantA" | "variantB",
): FunnelStepVariantConfig {
  return {
    eyebrow: normalizeOptionalText(formData.get(`${prefix}_eyebrow`)),
    headline: normalizeOptionalText(formData.get(`${prefix}_headline`)),
    description: normalizeOptionalText(formData.get(`${prefix}_description`)),
    primaryLabel: normalizeOptionalText(formData.get(`${prefix}_primaryLabel`)),
    secondaryLabel: normalizeOptionalText(formData.get(`${prefix}_secondaryLabel`)),
    note: normalizeOptionalText(formData.get(`${prefix}_note`)),
    priceLabel: normalizeOptionalText(formData.get(`${prefix}_priceLabel`)),
  };
}

function buildStepConfigPayload(
  formData: FormData,
  type: FunnelStepType,
  course: { title: string; currency: string; price: number },
): FunnelStepConfig {
  const defaults = getDefaultFunnelStepConfig(type, course);

  return {
    eyebrow: normalizeOptionalText(formData.get("eyebrow"), defaults.eyebrow),
    headline: normalizeOptionalText(formData.get("headline"), defaults.headline),
    description: normalizeOptionalText(
      formData.get("description"),
      defaults.description,
    ),
    primaryLabel: normalizeOptionalText(
      formData.get("primaryLabel"),
      defaults.primaryLabel,
    ),
    secondaryLabel: normalizeOptionalText(
      formData.get("secondaryLabel"),
      defaults.secondaryLabel,
    ),
    note: normalizeOptionalText(formData.get("note"), defaults.note),
    priceLabel: normalizeOptionalText(
      formData.get("priceLabel"),
      defaults.priceLabel,
    ),
    bullets: parseBulletsInput(
      normalizeOptionalText(formData.get("bullets"), defaults.bullets.join("\n")),
    ),
    orderBumpEnabled: normalizeBoolean(formData.get("orderBumpEnabled")),
    orderBumpTitle: normalizeOptionalText(
      formData.get("orderBumpTitle"),
      defaults.orderBumpTitle,
    ),
    orderBumpDescription: normalizeOptionalText(
      formData.get("orderBumpDescription"),
      defaults.orderBumpDescription,
    ),
    orderBumpAmount: normalizeNumber(
      formData.get("orderBumpAmount"),
      defaults.orderBumpAmount,
    ),
    orderBumpCurrency: normalizeOptionalText(
      formData.get("orderBumpCurrency"),
      defaults.orderBumpCurrency,
    ),
  };
}

async function ensureUniqueFunnelSlug(
  tx: Prisma.TransactionClient,
  baseSlug: string,
  excludeId?: string,
) {
  const safeBase = slugifyCourseTitle(baseSlug) || `funnel-${randomUUID().slice(0, 8)}`;
  let candidate = safeBase;
  let suffix = 2;

  while (true) {
    const existing = await tx.funnel.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${safeBase}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueStepKey(
  tx: Prisma.TransactionClient,
  funnelId: string,
  baseKey: string,
  excludeId?: string,
) {
  const safeBase = slugifyCourseTitle(baseKey) || `step-${randomUUID().slice(0, 6)}`;
  let candidate = safeBase;
  let suffix = 2;

  while (true) {
    const existing = await tx.funnelStep.findFirst({
      where: {
        funnelId,
        key: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${safeBase}-${suffix}`;
    suffix += 1;
  }
}

function buildAuthorFunnelPaths(input: {
  funnelId: string;
  funnelSlug: string;
  courseId: string;
  courseSlug: string;
  stepKeys?: string[];
}) {
  return [
    "/author",
    "/author/funnels",
    `/author/funnels/${input.funnelId}`,
    `/author/courses/${input.courseId}/creative-studio`,
    `/author/courses/${input.courseId}/studio/analytics`,
    "/courses",
    `/courses/${input.courseSlug}`,
    buildFunnelEntryHref(input.funnelSlug),
    buildFunnelEntryHref(input.funnelSlug, true),
    ...(input.stepKeys ?? []).flatMap((stepKey) => [
      buildFunnelStepHref(input.funnelSlug, stepKey),
      buildFunnelStepHref(input.funnelSlug, stepKey, { preview: true }),
    ]),
  ];
}

function revalidateFunnelPaths(input: Parameters<typeof buildAuthorFunnelPaths>[0]) {
  for (const path of buildAuthorFunnelPaths(input)) {
    revalidatePath(path);
  }
}

async function recordUniqueFunnelEvent(
  tx: Prisma.TransactionClient,
  input: {
    funnelId: string;
    visitId: string;
    stepId?: string | null;
    type: FunnelEventType;
    variant?: string | null;
    eventKey?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const event = input.eventKey
    ? await tx.funnelEvent.upsert({
        where: {
          funnelVisitId_eventKey: {
            funnelVisitId: input.visitId,
            eventKey: input.eventKey,
          },
        },
        update: {},
        create: {
          funnelId: input.funnelId,
          funnelVisitId: input.visitId,
          stepId: input.stepId ?? null,
          type: input.type,
          variant: input.variant ?? null,
          eventKey: input.eventKey,
          metadata: toInputJson(input.metadata ?? {}),
        },
      })
    : await tx.funnelEvent.create({
        data: {
          funnelId: input.funnelId,
          funnelVisitId: input.visitId,
          stepId: input.stepId ?? null,
          type: input.type,
          variant: input.variant ?? null,
          metadata: toInputJson(input.metadata ?? {}),
        },
      });

  const visit = await tx.funnelVisit.findUnique({
    where: {
      id: input.visitId,
    },
    include: {
      funnel: {
        select: {
          authorId: true,
          courseId: true,
        },
      },
    },
  });

  if (visit) {
    await recordPlatformEvent(
      {
        ownerId: visit.funnel.authorId,
        contactId: visit.contactId ?? null,
        courseId: visit.funnel.courseId,
        source: "funnel",
        name: input.type,
        eventKey: input.eventKey ?? event.id,
        visitorId: visit.id,
        utm: asObject(visit.utm),
        metadata: {
          funnelId: input.funnelId,
          stepId: input.stepId ?? null,
          variant: input.variant ?? null,
          ...(input.metadata ?? {}),
        },
        timestamp: event.createdAt,
      },
      tx,
    );
  }

  await tx.funnelVisit.update({
    where: { id: input.visitId },
    data: {
      lastEventAt: new Date(),
    },
  });
}

type RuntimeResolvedStep = {
  visit: RuntimeVisit;
  step: FunnelStepDraft;
  variant: "A" | "B";
  renderedConfig: FunnelStepConfig;
  redirectTo: string | null;
};

export async function createFunnel(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/funnels");
  const courseId = normalizeOptionalText(formData.get("courseId"));
  const name = normalizeOptionalText(formData.get("name"));
  const description = normalizeOptionalNullableText(formData.get("description"));

  if (!courseId || !name) {
    redirect("/author/funnels");
  }

  const prisma = getPrismaClient();

  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.findFirst({
      where: {
        id: courseId,
        ...buildAuthorAccessWhere(session.user.id, session.user.role),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        currency: true,
      },
    });

    if (!course) {
      throw new Error("COURSE_NOT_FOUND");
    }

    const slug = await ensureUniqueFunnelSlug(
      tx,
      normalizeOptionalText(formData.get("slug")) || `${course.slug}-funnel`,
    );

    const funnel = await tx.funnel.create({
      data: {
        authorId: session.user.id,
        courseId: course.id,
        name,
        slug,
        description,
      },
    });

    const defaultSteps = buildDefaultFunnelSteps({
      title: course.title,
      currency: course.currency,
      price: decimalToNumber(course.price),
    });

    const createdSteps = [];

    for (const step of defaultSteps) {
      createdSteps.push(
        await tx.funnelStep.create({
          data: {
            funnelId: funnel.id,
            key: step.key,
            name: step.name,
            type: step.type,
            order: step.order,
            config: toInputJson(step.config),
            transitions: toInputJson(step.transitions),
          },
        }),
      );
    }

    await tx.funnel.update({
      where: { id: funnel.id },
      data: {
        entryStepId: createdSteps[0]?.id ?? null,
      },
    });

    return {
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      courseId: course.id,
      courseSlug: course.slug,
      stepKeys: createdSteps.map((step) => step.key),
    };
  });

  revalidateFunnelPaths(created);
  redirect(`/author/funnels/${created.funnelId}`);
}

export async function updateFunnelSettings(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/funnels");
  const funnelId = normalizeOptionalText(formData.get("funnelId"));

  if (!funnelId) {
    redirect("/author/funnels");
  }

  const prisma = getPrismaClient();

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.funnel.findFirst({
      where: {
        id: funnelId,
        ...buildAuthorAccessWhere(session.user.id, session.user.role),
      },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
          },
        },
        steps: {
          select: {
            key: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error("FUNNEL_NOT_FOUND");
    }

    const nextCourseId = normalizeOptionalText(formData.get("courseId")) || existing.courseId;
    const nextCourse = await tx.course.findFirst({
      where: {
        id: nextCourseId,
        ...buildAuthorAccessWhere(session.user.id, session.user.role),
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!nextCourse) {
      throw new Error("COURSE_NOT_FOUND");
    }

    const nextSlug = await ensureUniqueFunnelSlug(
      tx,
      normalizeOptionalText(formData.get("slug")) || existing.slug,
      existing.id,
    );

    const funnel = await tx.funnel.update({
      where: { id: existing.id },
      data: {
        name: normalizeOptionalText(formData.get("name")) || existing.name,
        slug: nextSlug,
        description: normalizeOptionalNullableText(formData.get("description")),
        courseId: nextCourse.id,
      },
      select: {
        id: true,
        slug: true,
        courseId: true,
        course: {
          select: {
            slug: true,
          },
        },
        steps: {
          select: {
            key: true,
          },
        },
      },
    });

    return {
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      courseId: funnel.courseId,
      courseSlug: funnel.course.slug,
      stepKeys: funnel.steps.map((step) => step.key),
    };
  });

  revalidateFunnelPaths(updated);
}

export async function setFunnelStatus(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/funnels");
  const funnelId = normalizeOptionalText(formData.get("funnelId"));
  const rawStatus = normalizeOptionalText(formData.get("status")) as FunnelStatus;

  if (!funnelId || !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(rawStatus)) {
    redirect("/author/funnels");
  }

  const prisma = getPrismaClient();

  const updated = await prisma.$transaction(async (tx) => {
    const funnel = await tx.funnel.findFirst({
      where: {
        id: funnelId,
        ...buildAuthorAccessWhere(session.user.id, session.user.role),
      },
      select: {
        id: true,
        slug: true,
        courseId: true,
        course: {
          select: {
            slug: true,
          },
        },
        steps: {
          select: {
            key: true,
          },
        },
      },
    });

    if (!funnel) {
      throw new Error("FUNNEL_NOT_FOUND");
    }

    await tx.funnel.update({
      where: { id: funnel.id },
      data: {
        status: rawStatus,
        publishedAt: rawStatus === "PUBLISHED" ? new Date() : null,
      },
    });

    return {
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      courseId: funnel.courseId,
      courseSlug: funnel.course.slug,
      stepKeys: funnel.steps.map((step) => step.key),
    };
  });

  revalidateFunnelPaths(updated);
}

export async function addFunnelStep(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/funnels");
  const funnelId = normalizeOptionalText(formData.get("funnelId"));

  if (!funnelId) {
    redirect("/author/funnels");
  }

  const prisma = getPrismaClient();

  const updated = await prisma.$transaction(async (tx) => {
    const funnel = await tx.funnel.findFirst({
      where: {
        id: funnelId,
        ...buildAuthorAccessWhere(session.user.id, session.user.role),
      },
      include: {
        course: {
          select: {
            title: true,
            price: true,
            currency: true,
            slug: true,
            id: true,
          },
        },
        steps: {
          orderBy: [{ order: "desc" }],
          select: {
            id: true,
            order: true,
            key: true,
          },
        },
      },
    });

    if (!funnel) {
      throw new Error("FUNNEL_NOT_FOUND");
    }

    const type = normalizeStepType(formData.get("type"));
    const name =
      normalizeOptionalText(formData.get("name")) ||
      ({
        LANDING: "Лендинг",
        LEAD_CAPTURE: "Lead capture",
        CHECKOUT: "Checkout",
        UPSELL: "Upsell",
        DOWNSELL: "Downsell",
        THANK_YOU: "Спасибо",
      } as const)[type];
    const key = await ensureUniqueStepKey(
      tx,
      funnel.id,
      normalizeOptionalText(formData.get("key")) || name,
    );
    const courseContext = {
      title: funnel.course.title,
      currency: funnel.course.currency,
      price: decimalToNumber(funnel.course.price),
    };

    await tx.funnelStep.create({
      data: {
        funnelId: funnel.id,
        key,
        name,
        type,
        order: (funnel.steps[0]?.order ?? -1) + 1,
        config: toInputJson(getDefaultFunnelStepConfig(type, courseContext)),
        transitions: toInputJson({}),
      },
    });

    const steps = await tx.funnelStep.findMany({
      where: { funnelId: funnel.id },
      orderBy: [{ order: "asc" }],
      select: { key: true },
    });

    if (!funnel.entryStepId && steps[0]) {
      const first = await tx.funnelStep.findFirst({
        where: { funnelId: funnel.id },
        orderBy: [{ order: "asc" }],
        select: { id: true },
      });

      if (first) {
        await tx.funnel.update({
          where: { id: funnel.id },
          data: {
            entryStepId: first.id,
          },
        });
      }
    }

    return {
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      courseId: funnel.course.id,
      courseSlug: funnel.course.slug,
      stepKeys: steps.map((step) => step.key),
    };
  });

  revalidateFunnelPaths(updated);
}

export async function updateFunnelStep(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/funnels");
  const stepId = normalizeOptionalText(formData.get("stepId"));

  if (!stepId) {
    redirect("/author/funnels");
  }

  const prisma = getPrismaClient();

  const updated = await prisma.$transaction(async (tx) => {
    const step = await tx.funnelStep.findFirst({
      where: {
        id: stepId,
        funnel: buildAuthorAccessWhere(session.user.id, session.user.role),
      },
      include: {
        funnel: {
          include: {
            course: {
              select: {
                id: true,
                slug: true,
                title: true,
                price: true,
                currency: true,
              },
            },
            steps: {
              select: { key: true },
            },
          },
        },
      },
    });

    if (!step) {
      throw new Error("STEP_NOT_FOUND");
    }

    const type = normalizeStepType(formData.get("type"));
    const key = await ensureUniqueStepKey(
      tx,
      step.funnelId,
      normalizeOptionalText(formData.get("key")) || step.key,
      step.id,
    );
    const config = buildStepConfigPayload(formData, type, {
      title: step.funnel.course.title,
      currency: step.funnel.course.currency,
      price: decimalToNumber(step.funnel.course.price),
    });
    const transitions = buildTransitionPayload(formData, type);
    const abTestEnabled = normalizeBoolean(formData.get("abTestEnabled"));
    const splitPercent = clampSplitPercent(
      normalizeNumber(formData.get("splitPercent"), step.splitPercent),
    );

    await tx.funnelStep.update({
      where: { id: step.id },
      data: {
        name: normalizeOptionalText(formData.get("name")) || step.name,
        key,
        type,
        config: toInputJson(config),
        transitions: toInputJson(transitions),
        abTestEnabled,
        splitPercent,
        variantA: toInputJson(buildVariantPayload(formData, "variantA")),
        variantB: toInputJson(buildVariantPayload(formData, "variantB")),
      },
    });

    const refreshedSteps = await tx.funnelStep.findMany({
      where: { funnelId: step.funnelId },
      select: { key: true },
    });

    return {
      funnelId: step.funnelId,
      funnelSlug: step.funnel.slug,
      courseId: step.funnel.course.id,
      courseSlug: step.funnel.course.slug,
      stepKeys: refreshedSteps.map((item) => item.key),
    };
  });

  revalidateFunnelPaths(updated);
}

export async function moveFunnelStep(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/funnels");
  const stepId = normalizeOptionalText(formData.get("stepId"));
  const direction = normalizeOptionalText(formData.get("direction"));

  if (!stepId || !["up", "down"].includes(direction)) {
    redirect("/author/funnels");
  }

  const prisma = getPrismaClient();

  const updated = await prisma.$transaction(async (tx) => {
    const step = await tx.funnelStep.findFirst({
      where: {
        id: stepId,
        funnel: buildAuthorAccessWhere(session.user.id, session.user.role),
      },
      include: {
        funnel: {
          include: {
            course: {
              select: {
                id: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!step) {
      throw new Error("STEP_NOT_FOUND");
    }

    const neighbor = await tx.funnelStep.findFirst({
      where: {
        funnelId: step.funnelId,
        ...(direction === "up"
          ? { order: { lt: step.order } }
          : { order: { gt: step.order } }),
      },
      orderBy: [{ order: direction === "up" ? "desc" : "asc" }],
    });

    if (neighbor) {
      await tx.funnelStep.update({
        where: { id: step.id },
        data: { order: neighbor.order },
      });
      await tx.funnelStep.update({
        where: { id: neighbor.id },
        data: { order: step.order },
      });
    }

    const steps = await tx.funnelStep.findMany({
      where: { funnelId: step.funnelId },
      select: { key: true },
    });

    return {
      funnelId: step.funnelId,
      funnelSlug: step.funnel.slug,
      courseId: step.funnel.course.id,
      courseSlug: step.funnel.course.slug,
      stepKeys: steps.map((item) => item.key),
    };
  });

  revalidateFunnelPaths(updated);
}

export async function deleteFunnelStep(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/funnels");
  const stepId = normalizeOptionalText(formData.get("stepId"));

  if (!stepId) {
    redirect("/author/funnels");
  }

  const prisma = getPrismaClient();

  const updated = await prisma.$transaction(async (tx) => {
    const step = await tx.funnelStep.findFirst({
      where: {
        id: stepId,
        funnel: buildAuthorAccessWhere(session.user.id, session.user.role),
      },
      include: {
        funnel: {
          include: {
            course: {
              select: {
                id: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!step) {
      throw new Error("STEP_NOT_FOUND");
    }

    await tx.funnelStep.delete({
      where: { id: step.id },
    });

    const firstRemaining = await tx.funnelStep.findFirst({
      where: { funnelId: step.funnelId },
      orderBy: [{ order: "asc" }],
      select: {
        id: true,
      },
    });

    if (step.funnel.entryStepId === step.id) {
      await tx.funnel.update({
        where: { id: step.funnelId },
        data: {
          entryStepId: firstRemaining?.id ?? null,
        },
      });
    }

    const steps = await tx.funnelStep.findMany({
      where: { funnelId: step.funnelId },
      select: { key: true },
    });

    return {
      funnelId: step.funnelId,
      funnelSlug: step.funnel.slug,
      courseId: step.funnel.course.id,
      courseSlug: step.funnel.course.slug,
      stepKeys: steps.map((item) => item.key),
    };
  });

  revalidateFunnelPaths(updated);
}

export async function setFunnelEntryStep(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/funnels");
  const funnelId = normalizeOptionalText(formData.get("funnelId"));
  const stepId = normalizeOptionalText(formData.get("stepId"));

  if (!funnelId || !stepId) {
    redirect("/author/funnels");
  }

  const prisma = getPrismaClient();

  const updated = await prisma.$transaction(async (tx) => {
    const step = await tx.funnelStep.findFirst({
      where: {
        id: stepId,
        funnelId,
        funnel: buildAuthorAccessWhere(session.user.id, session.user.role),
      },
      include: {
        funnel: {
          include: {
            course: {
              select: {
                id: true,
                slug: true,
              },
            },
            steps: {
              select: { key: true },
            },
          },
        },
      },
    });

    if (!step) {
      throw new Error("STEP_NOT_FOUND");
    }

    await tx.funnel.update({
      where: { id: funnelId },
      data: {
        entryStepId: stepId,
      },
    });

    return {
      funnelId: step.funnelId,
      funnelSlug: step.funnel.slug,
      courseId: step.funnel.course.id,
      courseSlug: step.funnel.course.slug,
      stepKeys: step.funnel.steps.map((item) => item.key),
    };
  });

  revalidateFunnelPaths(updated);
}

export async function startFunnelVisit(input: {
  funnelId: string;
  entryStepId: string;
  userId?: string | null;
  utm?: Record<string, string>;
}) {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    const visit = await tx.funnelVisit.create({
      data: {
        funnelId: input.funnelId,
        userId: input.userId ?? null,
        currentStepId: input.entryStepId,
        utm: toInputJson(input.utm ?? {}),
      },
      select: {
        id: true,
        userId: true,
        currentStepId: true,
        status: true,
        leadName: true,
        leadEmail: true,
        telegramUsername: true,
        metadata: true,
        completedAt: true,
      },
    });

    await recordUniqueFunnelEvent(tx, {
      funnelId: input.funnelId,
      visitId: visit.id,
      stepId: input.entryStepId,
      type: FunnelEventType.FUNNEL_ENTER,
      eventKey: "funnel_enter",
      metadata: {
        utm: input.utm ?? {},
      },
    });

    return visit;
  });
}

export async function prepareFunnelStepRender(input: {
  funnelId: string;
  funnelSlug: string;
  visitId: string;
  step: FunnelStepDraft;
  entryStep: FunnelStepDraft;
  steps: FunnelStepDraft[];
  preview?: boolean;
  fromStepId?: string;
  fromVariant?: string;
  userId?: string | null;
}) : Promise<RuntimeResolvedStep> {
  const prisma = getPrismaClient();

  const prepared = await prisma.$transaction(async (tx) => {
    const visit = await tx.funnelVisit.findFirst({
      where: {
        id: input.visitId,
        funnelId: input.funnelId,
      },
      select: {
        id: true,
        userId: true,
        currentStepId: true,
        status: true,
        leadName: true,
        leadEmail: true,
        telegramUsername: true,
        metadata: true,
        completedAt: true,
      },
    });

    if (!visit) {
      return {
        visit: {
          id: "",
          userId: null,
          currentStepId: null,
          status: FunnelVisitStatus.ACTIVE,
          leadName: null,
          leadEmail: null,
          telegramUsername: null,
          completedAt: null,
          personalDataConsentGranted: false,
          emailConsentGranted: false,
          telegramConsentGranted: false,
        },
        step: input.step,
        variant: "A" as const,
        renderedConfig: input.step.config,
        redirectTo: buildFunnelEntryHref(input.funnelSlug, Boolean(input.preview)),
      };
    }

    const currentStep =
      input.steps.find((step) => step.id === (visit.currentStepId ?? input.entryStep.id)) ??
      input.entryStep;
    const consentState = getVisitConsentState(visit.metadata);

    if (input.step.id !== currentStep.id) {
      const canAdvanceFromLanding =
        currentStep.type === "LANDING" &&
        input.fromStepId === currentStep.id &&
        resolveNextStepKey(currentStep.transitions, "default") === input.step.key;

      if (!canAdvanceFromLanding) {
        return {
          visit: {
            id: visit.id,
            userId: visit.userId,
            currentStepId: visit.currentStepId,
            status: visit.status,
            leadName: visit.leadName,
            leadEmail: visit.leadEmail,
            telegramUsername: visit.telegramUsername,
            completedAt: visit.completedAt,
            ...consentState,
          },
          step: input.step,
          variant: "A" as const,
          renderedConfig: input.step.config,
          redirectTo: buildFunnelStepHref(input.funnelSlug, currentStep.key, {
            visitId: visit.id,
            preview: Boolean(input.preview),
          }),
        };
      }

      await tx.funnelVisit.update({
        where: { id: visit.id },
        data: {
          currentStepId: input.step.id,
          userId: input.userId ?? visit.userId ?? null,
        },
      });
    } else if (input.userId && input.userId !== visit.userId) {
      await tx.funnelVisit.update({
        where: { id: visit.id },
        data: {
          userId: input.userId,
        },
      });
    }

    const variant = input.step.abTestEnabled
      ? pickFunnelVariant(visit.id, input.step.id, input.step.splitPercent)
      : "A";
    const renderedConfig = input.step.abTestEnabled
      ? applyVariantConfig(
          input.step.config,
          input.step.variantA,
          input.step.variantB,
          variant,
        )
      : input.step.config;

    await recordUniqueFunnelEvent(tx, {
      funnelId: input.funnelId,
      visitId: visit.id,
      stepId: input.step.id,
      type: FunnelEventType.STEP_VIEW,
      variant,
      eventKey: `step_view:${input.step.id}`,
      metadata: {
        fromStepId: input.fromStepId ?? null,
        fromVariant: input.fromVariant ?? null,
      },
    });

    if (input.step.type === "CHECKOUT") {
      await recordUniqueFunnelEvent(tx, {
        funnelId: input.funnelId,
        visitId: visit.id,
        stepId: input.step.id,
        type: FunnelEventType.CHECKOUT_START,
        variant,
        eventKey: `checkout_start:${input.step.id}`,
      });
    }

    if (input.step.type === "UPSELL" || input.step.type === "DOWNSELL") {
      await recordUniqueFunnelEvent(tx, {
        funnelId: input.funnelId,
        visitId: visit.id,
        stepId: input.step.id,
        type: FunnelEventType.UPSELL_VIEW,
        variant,
        eventKey: `upsell_view:${input.step.id}`,
        metadata: {
          stage: input.step.type,
        },
      });
    }

    if (input.step.type === "THANK_YOU") {
      await recordUniqueFunnelEvent(tx, {
        funnelId: input.funnelId,
        visitId: visit.id,
        stepId: input.step.id,
        type: FunnelEventType.FUNNEL_COMPLETE,
        variant,
        eventKey: "funnel_complete",
      });

      await tx.funnelVisit.update({
        where: { id: visit.id },
        data: {
          status: FunnelVisitStatus.COMPLETED,
          completedAt: visit.completedAt ?? new Date(),
          currentStepId: input.step.id,
        },
      });
    }

    return {
      visit: {
        id: visit.id,
        userId: visit.userId,
        currentStepId: visit.currentStepId,
        status: visit.status,
        leadName: visit.leadName,
        leadEmail: visit.leadEmail,
        telegramUsername: visit.telegramUsername,
        completedAt: visit.completedAt,
        ...consentState,
      },
      step: input.step,
      variant,
      renderedConfig,
      redirectTo: null,
    };
  });

  if (
    !input.preview &&
    input.step.type === "CHECKOUT" &&
    prepared.visit.id &&
    (prepared.visit.userId ||
      prepared.visit.leadEmail ||
      prepared.visit.telegramUsername)
  ) {
    const funnel = await prisma.funnel.findUnique({
      where: {
        id: input.funnelId,
      },
      select: {
        authorId: true,
        courseId: true,
      },
    });

    if (funnel) {
      await recordContactLifecycleEvent({
        authorId: funnel.authorId,
        courseId: funnel.courseId,
        type: "CHECKOUT_STARTED",
        eventKey: `checkout_started:${input.funnelId}:${input.step.id}:${prepared.visit.id}`,
        metadata: {
          funnelId: input.funnelId,
          visitId: prepared.visit.id,
          stepId: input.step.id,
          variant: prepared.variant,
        },
        contact: {
          userId: input.userId ?? prepared.visit.userId ?? null,
          fullName: prepared.visit.leadName,
          email: prepared.visit.leadEmail,
          telegramUsername: prepared.visit.telegramUsername,
          source: `funnel:${input.funnelSlug}`,
          visitorId: prepared.visit.id,
          emailConsentGranted: prepared.visit.emailConsentGranted,
          telegramConsentGranted: prepared.visit.telegramConsentGranted,
        },
      });
    }
  }

  return prepared;
}

async function resolveActionContext(input: {
  funnelId: string;
  stepId: string;
  visitId: string;
}) {
  const prisma = getPrismaClient();

  return prisma.funnelStep.findFirst({
    where: {
      id: input.stepId,
      funnelId: input.funnelId,
    },
    include: {
      funnel: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              title: true,
              price: true,
              currency: true,
              status: true,
            },
          },
          steps: {
            orderBy: [{ order: "asc" }],
          },
        },
      },
    },
  });
}

export async function submitFunnelLeadCapture(formData: FormData) {
  const funnelId = normalizeOptionalText(formData.get("funnelId"));
  const stepId = normalizeOptionalText(formData.get("stepId"));
  const visitId = normalizeOptionalText(formData.get("visitId"));
  const variant = normalizeOptionalText(formData.get("variant")) || "A";
  const preview = normalizeBoolean(formData.get("preview"));

  if (!funnelId || !stepId || !visitId) {
    redirect("/courses");
  }

  const context = await resolveActionContext({ funnelId, stepId, visitId });

  if (!context || context.type !== "LEAD_CAPTURE") {
    redirect("/courses");
  }

  const transitions = coerceFunnelTransitions(context.transitions);
  const nextStepKey =
    resolveNextStepKey(transitions, "submit") ||
    resolveNextStepKey(transitions, "default");
  const nextStep = context.funnel.steps.find((step) => step.key === nextStepKey);

  if (!nextStep) {
    redirect(buildFunnelStepHref(context.funnel.slug, context.key, { visitId, preview }));
  }

  const session = await getServerAuthSession();
  const prisma = getPrismaClient();
  const leadName = normalizeOptionalNullableText(formData.get("fullName"));
  const leadEmail = normalizeOptionalNullableText(formData.get("email"));
  const telegramUsername = normalizeOptionalNullableText(
    formData.get("telegramUsername"),
  );
  const personalDataConsentGranted = normalizeBoolean(
    formData.get("personalDataConsent"),
  );
  const emailConsentGranted =
    normalizeBoolean(formData.get("emailMarketingConsent")) && Boolean(leadEmail);
  const telegramConsentGranted =
    normalizeBoolean(formData.get("telegramMarketingConsent")) &&
    Boolean(telegramUsername);

  if (!personalDataConsentGranted) {
    redirect(
      buildFunnelStepHref(context.funnel.slug, context.key, {
        visitId,
        preview,
      }),
    );
  }

  try {
    const headerList = await headers();
    await guardPublicFormSubmission({
      headers: headerList,
      scope: "funnel_lead_capture",
      extraKey: `${funnelId}:${visitId}:${leadEmail ?? telegramUsername ?? "anonymous"}`,
      honeypotValue: normalizeOptionalText(
        formData.get(PUBLIC_FORM_HONEYPOT_FIELD),
      ),
      startedAt: normalizeOptionalText(
        formData.get(PUBLIC_FORM_STARTED_AT_FIELD),
      ),
    });
  } catch {
    redirect(
      buildFunnelStepHref(context.funnel.slug, context.key, {
        visitId,
        preview,
      }),
    );
  }

  await prisma.$transaction(async (tx) => {
    const currentVisit = await tx.funnelVisit.findUnique({
      where: { id: visitId },
      select: {
        metadata: true,
      },
    });

    await tx.funnelVisit.update({
      where: { id: visitId },
      data: {
        leadName,
        leadEmail,
        telegramUsername,
        userId: session?.user?.id ?? undefined,
        currentStepId: nextStep.id,
        metadata: toInputJson({
          ...asObject(currentVisit?.metadata),
          consents: {
            personalDataConsentGranted,
            emailConsentGranted,
            telegramConsentGranted,
            capturedAt: new Date().toISOString(),
          },
        }),
      },
    });

    await recordUniqueFunnelEvent(tx, {
      funnelId: context.funnelId,
      visitId,
      stepId,
      type: FunnelEventType.FORM_SUBMIT,
      variant,
      eventKey: `form_submit:${stepId}`,
      metadata: {
        nextStepId: nextStep.id,
        nextStepKey: nextStep.key,
      },
    });
  });

  const recorded = await recordContactLifecycleEvent({
    authorId: context.funnel.authorId,
    courseId: context.funnel.course.id,
    type: "LEAD_CAPTURED",
    eventKey: `lead_capture:${visitId}:${stepId}`,
    metadata: {
      funnelId,
      visitId,
      stepId,
      variant,
      nextStepId: nextStep.id,
      nextStepKey: nextStep.key,
      consents: {
        personalDataConsentGranted,
        emailConsentGranted,
        telegramConsentGranted,
      },
    },
    contact: {
      userId: session?.user?.id ?? null,
      fullName: leadName,
      email: leadEmail,
      telegramUsername,
      source: `funnel:${context.funnel.slug}`,
      visitorId: visitId,
      personalDataConsentGranted,
      emailConsentGranted,
      telegramConsentGranted,
    },
  });

  await prisma.funnelVisit.update({
    where: {
      id: visitId,
    },
    data: {
      contactId: recorded.contactId,
    },
  });

  redirect(
    buildFunnelStepHref(context.funnel.slug, nextStep.key, {
      visitId,
      preview,
      fromStepId: stepId,
      fromVariant: variant,
    }),
  );
}

export async function completeFunnelCheckout(formData: FormData) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === UserRole.AUTHOR) {
    redirect("/forbidden");
  }

  const funnelId = normalizeOptionalText(formData.get("funnelId"));
  const stepId = normalizeOptionalText(formData.get("stepId"));
  const visitId = normalizeOptionalText(formData.get("visitId"));
  const variant = normalizeOptionalText(formData.get("variant")) || "A";
  const preview = normalizeBoolean(formData.get("preview"));

  if (!funnelId || !stepId || !visitId) {
    redirect("/courses");
  }

  const context = await resolveActionContext({ funnelId, stepId, visitId });

  if (!context || context.type !== "CHECKOUT") {
    redirect("/courses");
  }

  const config = coerceFunnelStepConfig(context.type, context.config, {
    title: context.funnel.course.title,
    currency: context.funnel.course.currency,
    price: decimalToNumber(context.funnel.course.price),
  });
  const transitions = coerceFunnelTransitions(context.transitions);
  const checkoutSessionKey = `${visitId}:${stepId}`;
  const orderBumpSelected = config.orderBumpEnabled && normalizeBoolean(formData.get("orderBumpSelected"));
  const paymentMethod = normalizePaymentMethod(formData.get("paymentMethod"));
  const legalConsentAccepted = normalizeBoolean(
    formData.get("checkoutLegalConsent"),
  );
  const nextAfterPaidKey =
    resolveNextStepKey(transitions, "paid") ||
    resolveNextStepKey(transitions, "default");
  const nextAfterOwnedKey =
    resolveNextStepKey(transitions, "alreadyOwned") ||
    nextAfterPaidKey;
  const nextAfterPaid = context.funnel.steps.find((step) => step.key === nextAfterPaidKey) ?? null;
  const nextAfterOwned = context.funnel.steps.find((step) => step.key === nextAfterOwnedKey) ?? nextAfterPaid;

  if (!legalConsentAccepted) {
    redirect(
      buildFunnelStepHref(context.funnel.slug, context.key, {
        visitId,
        preview,
      }),
    );
  }

  try {
    const headerList = await headers();
    await guardPublicFormSubmission({
      headers: headerList,
      scope: "funnel_checkout",
      extraKey: `${funnelId}:${visitId}:${session.user.id}`,
      honeypotValue: normalizeOptionalText(
        formData.get(PUBLIC_FORM_HONEYPOT_FIELD),
      ),
      startedAt: normalizeOptionalText(
        formData.get(PUBLIC_FORM_STARTED_AT_FIELD),
      ),
    });
  } catch {
    redirect(
      buildFunnelStepHref(context.funnel.slug, context.key, {
        visitId,
        preview,
      }),
    );
  }

  const result = await startOrderCheckout({
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    courseId: context.funnel.course.id,
    paymentMethod,
    checkoutSessionKey,
    funnelId: context.funnelId,
    funnelStepId: stepId,
    funnelVisitId: visitId,
    orderBumpTitle: orderBumpSelected ? config.orderBumpTitle : null,
    orderBumpAmountMinor: orderBumpSelected
      ? Math.round(config.orderBumpAmount * 100)
      : 0,
    billingFullName: session.user.name,
    billingEmail: session.user.email,
    offerUrl: `/courses/${context.funnel.course.slug}`,
    refundPolicyUrl: `/courses/${context.funnel.course.slug}#refunds`,
    metadata: {
      funnelId,
      visitId,
      stepId,
      variant,
      preview,
      source: `funnel:${context.funnel.slug}`,
      orderBumpSelected,
      legalAcceptedAt: new Date().toISOString(),
      offerAccepted: true,
      refundPolicyAccepted: true,
    },
  });

  if (orderBumpSelected && result.orderId) {
    const prisma = getPrismaClient();

    await prisma.$transaction(async (tx) => {
      await recordUniqueFunnelEvent(tx, {
        funnelId: context.funnelId,
        visitId,
        stepId,
        type: FunnelEventType.ORDER_BUMP_ADDED,
        variant,
        eventKey: `order_bump_added:${stepId}`,
        metadata: {
          amount: config.orderBumpAmount,
          title: config.orderBumpTitle,
          orderId: result.orderId,
        },
      });
    });
  }

  if (result.state === "already-owned") {
    if (nextAfterOwned) {
      redirect(
        buildFunnelStepHref(context.funnel.slug, nextAfterOwned.key, {
          visitId,
          preview,
          fromStepId: stepId,
          fromVariant: variant,
        }),
      );
    }

    redirect(`/learn/${context.funnel.course.id}`);
  }

  redirect(result.redirectUrl);
}

export async function respondToFunnelOffer(formData: FormData) {
  const funnelId = normalizeOptionalText(formData.get("funnelId"));
  const stepId = normalizeOptionalText(formData.get("stepId"));
  const visitId = normalizeOptionalText(formData.get("visitId"));
  const variant = normalizeOptionalText(formData.get("variant")) || "A";
  const decision = normalizeOptionalText(formData.get("decision"));
  const preview = normalizeBoolean(formData.get("preview"));

  if (!funnelId || !stepId || !visitId || !["accept", "decline"].includes(decision)) {
    redirect("/courses");
  }

  const context = await resolveActionContext({ funnelId, stepId, visitId });

  if (!context || !["UPSELL", "DOWNSELL"].includes(context.type)) {
    redirect("/courses");
  }

  const transitions = coerceFunnelTransitions(context.transitions);
  const nextStepKey = resolveNextStepKey(
    transitions,
    decision as TransitionKey,
  );
  const nextStep = context.funnel.steps.find((step) => step.key === nextStepKey);

  if (!nextStep) {
    redirect(buildFunnelStepHref(context.funnel.slug, context.key, { visitId, preview }));
  }

  const prisma = getPrismaClient();

  await prisma.$transaction(async (tx) => {
    await tx.funnelVisit.update({
      where: { id: visitId },
      data: {
        currentStepId: nextStep.id,
      },
    });

    await recordUniqueFunnelEvent(tx, {
      funnelId,
      visitId,
      stepId,
      type:
        decision === "accept"
          ? FunnelEventType.UPSELL_ACCEPT
          : FunnelEventType.UPSELL_DECLINE,
      variant,
      eventKey: `${decision}:${stepId}`,
      metadata: {
        stage: context.type,
        nextStepId: nextStep.id,
        nextStepKey: nextStep.key,
      },
    });
  });

  redirect(
    buildFunnelStepHref(context.funnel.slug, nextStep.key, {
      visitId,
      preview,
      fromStepId: stepId,
      fromVariant: variant,
    }),
  );
}
