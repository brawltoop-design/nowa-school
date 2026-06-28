"use server";

import {
  AutomationTriggerType,
  AutomationRunStatus,
  AutomationStatus,
  ContactEventType,
  DealStage,
  MessageStatus,
  OrderStatus,
  Prisma,
  PrismaClient,
  type Automation,
  type AutomationDispatch,
  type Contact,
  type ContactEvent,
  type DiscountCode,
} from "@prisma/client";
import { randomUUID } from "crypto";
import {
  coerceAutomationActionConfig,
  coerceAutomationConditions,
  coerceAutomationGoal,
  coerceAutomationTriggerConfig,
  getAutomationDelayMs,
  interpolateAutomationTemplate,
  normalizeEmail,
  normalizeTelegramUsername,
} from "@/lib/automations";
import { getMessagingProvider } from "@/lib/messaging";
import { slugifyCourseTitle } from "@/lib/validators/course";
import { getAppUrl } from "@/server/app-url";
import { getPrismaClient } from "@/server/db";
import { recordPlatformEvent } from "@/server/events";

type DbClient = PrismaClient | Prisma.TransactionClient;

type ContactSignal = {
  userId?: string | null;
  fullName?: string | null;
  email?: string | null;
  telegramUsername?: string | null;
  source?: string | null;
  visitorId?: string | null;
  isStudent?: boolean;
  personalDataConsentGranted?: boolean;
  emailConsentGranted?: boolean;
  telegramConsentGranted?: boolean;
  metadata?: Record<string, unknown>;
};

type RecordContactLifecycleInput = {
  authorId: string;
  courseId?: string | null;
  orderId?: string | null;
  eventKey?: string | null;
  type: ContactEventType;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
  contact: ContactSignal;
};

type ProcessQueueResult = {
  synced: number;
  processed: number;
  skipped: number;
  failed: number;
};

type CreateAutomationRunResult = {
  runId: string;
  created: boolean;
};

const DEFAULT_DAILY_MESSAGE_LIMIT = 3;
const DEFAULT_MAX_ATTEMPTS = 3;
const LOCK_STALE_AFTER_MS = 10 * 60_000;

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: Prisma.JsonValue | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function mergeMetadata(
  existing: Prisma.JsonValue | null | undefined,
  extra: Record<string, unknown> | undefined,
) {
  return toInputJson({
    ...asRecord(existing),
    ...(extra ?? {}),
  });
}

function getDailyMessageLimit() {
  const raw = Number(process.env.AUTOMATION_DAILY_MESSAGE_LIMIT ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_MESSAGE_LIMIT;
}

function getMaxAttempts() {
  const raw = Number(process.env.AUTOMATION_MAX_ATTEMPTS ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_ATTEMPTS;
}

function getWorkerId() {
  return `automation-${process.pid}-${randomUUID().slice(0, 8)}`;
}

function getDayStart(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function getFirstName(fullName: string | null | undefined) {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}

function buildMessageTemplateVars(input: {
  contact: Contact;
  automation: Automation & {
    course?: {
      title: string;
      currency: string;
    } | null;
  };
  discountCode?: DiscountCode | null;
}) {
  return {
    fullName: input.contact.fullName ?? "",
    firstName: getFirstName(input.contact.fullName),
    email: input.contact.email ?? "",
    telegramUsername: input.contact.telegramUsername ?? "",
    courseTitle: input.automation.course?.title ?? "",
    discountCode: input.discountCode?.code ?? "",
    discountPercent: input.discountCode?.percentOff ?? "",
    appUrl: getAppUrl(),
  };
}

function buildPromoCodePrefix(prefix: string | null | undefined) {
  const base = slugifyCourseTitle(prefix || "nowa")
    .replaceAll("-", "")
    .toUpperCase()
    .slice(0, 6);
  return base || "NOWA";
}

async function createUniquePromoCode(
  tx: DbClient,
  prefix: string | null | undefined,
) {
  const safePrefix = buildPromoCodePrefix(prefix);

  while (true) {
    const code = `${safePrefix}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const existing = await tx.discountCode.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }
}

async function recordAutomationRunEvent(
  tx: DbClient,
  input: {
    automationId: string;
    runId: string;
    contactId: string;
    stepId?: string | null;
    messageId?: string | null;
    type:
      | "AUTOMATION_ENTER"
      | "MESSAGE_SENT"
      | "MESSAGE_OPENED"
      | "AUTOMATION_GOAL_MET"
      | "AUTOMATION_EXIT";
    metadata?: Record<string, unknown>;
  },
) {
  const created = await tx.automationRunEvent.create({
    data: {
      automationId: input.automationId,
      runId: input.runId,
      contactId: input.contactId,
      stepId: input.stepId ?? null,
      messageId: input.messageId ?? null,
      type: input.type,
      metadata: toInputJson(input.metadata ?? {}),
    },
  });

  const run = await tx.automationRun.findUnique({
    where: {
      id: input.runId,
    },
    include: {
      automation: {
        select: {
          authorId: true,
          courseId: true,
        },
      },
    },
  });

  if (!run) {
    return;
  }

  await recordPlatformEvent(
    {
      ownerId: run.automation.authorId,
      contactId: input.contactId,
      courseId: run.automation.courseId ?? null,
      source: "automation",
      name: input.type,
      eventKey: created.id,
      metadata: {
        automationId: input.automationId,
        runId: input.runId,
        stepId: input.stepId ?? null,
        messageId: input.messageId ?? null,
        ...(input.metadata ?? {}),
      },
      timestamp: created.createdAt,
    },
    tx,
  );
}

async function upsertContact(
  tx: DbClient,
  authorId: string,
  signal: ContactSignal,
) {
  const emailNormalized = normalizeEmail(signal.email);
  const telegramUsernameNormalized = normalizeTelegramUsername(
    signal.telegramUsername,
  );
  const orWhere: Prisma.ContactWhereInput[] = [];

  if (signal.userId) {
    orWhere.push({ userId: signal.userId });
  }

  if (emailNormalized) {
    orWhere.push({ emailNormalized });
  }

  if (telegramUsernameNormalized) {
    orWhere.push({ telegramUsernameNormalized });
  }

  const matches = orWhere.length
    ? await tx.contact.findMany({
        where: {
          authorId,
          OR: orWhere,
        },
        orderBy: [{ createdAt: "asc" }],
      })
    : [];

  const primaryMatch =
    matches.find((contact) => signal.userId && contact.userId === signal.userId) ??
    matches.find(
      (contact) => emailNormalized && contact.emailNormalized === emailNormalized,
    ) ??
    matches.find(
      (contact) =>
        telegramUsernameNormalized &&
        contact.telegramUsernameNormalized === telegramUsernameNormalized,
    ) ??
    null;

  const nextMetadata = {
    ...(signal.visitorId ? { visitorId: signal.visitorId } : {}),
    ...(signal.metadata ?? {}),
  };

  if (!primaryMatch) {
    const now = new Date();
    return tx.contact.create({
      data: {
        authorId,
        userId: signal.userId ?? null,
        fullName: signal.fullName ?? null,
        email: signal.email?.trim() || null,
        emailNormalized,
        telegramUsername: signal.telegramUsername?.trim().replace(/^@+/, "") || null,
        telegramUsernameNormalized,
        source: signal.source ?? null,
        isStudent: Boolean(signal.isStudent),
        personalDataConsentGranted: Boolean(signal.personalDataConsentGranted),
        personalDataConsentAt: signal.personalDataConsentGranted ? now : null,
        emailConsentGranted: Boolean(signal.emailConsentGranted),
        emailConsentAt: signal.emailConsentGranted ? now : null,
        telegramConsentGranted: Boolean(signal.telegramConsentGranted),
        telegramConsentAt: signal.telegramConsentGranted ? now : null,
        unsubscribeToken: randomUUID(),
        metadata: toInputJson(nextMetadata),
        lastSeenAt: new Date(),
      },
    });
  }

  const now = new Date();
  return tx.contact.update({
    where: { id: primaryMatch.id },
    data: {
      userId: primaryMatch.userId ?? signal.userId ?? null,
      fullName: signal.fullName ?? primaryMatch.fullName,
      email: signal.email?.trim() || primaryMatch.email,
      emailNormalized: emailNormalized ?? primaryMatch.emailNormalized,
      telegramUsername:
        signal.telegramUsername?.trim().replace(/^@+/, "") ||
        primaryMatch.telegramUsername,
      telegramUsernameNormalized:
        telegramUsernameNormalized ?? primaryMatch.telegramUsernameNormalized,
      source: primaryMatch.source ?? signal.source ?? null,
      isStudent: primaryMatch.isStudent || Boolean(signal.isStudent),
      personalDataConsentGranted:
        primaryMatch.personalDataConsentGranted ||
        Boolean(signal.personalDataConsentGranted),
      personalDataConsentAt:
        primaryMatch.personalDataConsentAt ??
        (signal.personalDataConsentGranted ? now : null),
      emailConsentGranted:
        primaryMatch.emailConsentGranted || Boolean(signal.emailConsentGranted),
      emailConsentAt:
        primaryMatch.emailConsentAt ??
        (signal.emailConsentGranted ? now : null),
      telegramConsentGranted:
        primaryMatch.telegramConsentGranted ||
        Boolean(signal.telegramConsentGranted),
      telegramConsentAt:
        primaryMatch.telegramConsentAt ??
        (signal.telegramConsentGranted ? now : null),
      metadata: mergeMetadata(primaryMatch.metadata, nextMetadata),
      lastSeenAt: new Date(),
    },
  });
}

async function upsertDealForEvent(
  tx: DbClient,
  input: {
    authorId: string;
    contactId: string;
    courseId?: string | null;
    orderId?: string | null;
    source?: string | null;
    stage: DealStage;
    value?: number | null;
  },
) {
  const existing = await tx.deal.findFirst({
    where: {
      authorId: input.authorId,
      contactId: input.contactId,
      courseId: input.courseId ?? null,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  if (existing) {
    const updated = await tx.deal.update({
      where: { id: existing.id },
      data: {
        stage: input.stage,
        orderId: input.orderId ?? existing.orderId,
        source: existing.source ?? input.source ?? null,
        value:
          input.value == null
            ? existing.value
            : new Prisma.Decimal(input.value),
      },
    });

    if (existing.stage !== input.stage) {
      await recordPlatformEvent(
        {
          ownerId: input.authorId,
          contactId: input.contactId,
          courseId: input.courseId ?? null,
          orderId: input.orderId ?? null,
          source: "crm",
          name: "deal_stage_changed",
          eventKey: `deal:${updated.id}:${input.stage}:${input.orderId ?? "none"}`,
          metadata: {
            dealId: updated.id,
            fromStage: existing.stage,
            toStage: input.stage,
            source: input.source ?? null,
          },
        },
        tx,
      );
    }

    return updated;
  }

  const created = await tx.deal.create({
    data: {
      authorId: input.authorId,
      contactId: input.contactId,
      courseId: input.courseId ?? null,
      orderId: input.orderId ?? null,
      stage: input.stage,
      source: input.source ?? null,
      value:
        input.value == null ? null : new Prisma.Decimal(input.value),
    },
  });

  await recordPlatformEvent(
    {
      ownerId: input.authorId,
      contactId: input.contactId,
      courseId: input.courseId ?? null,
      orderId: input.orderId ?? null,
      source: "crm",
      name: "deal_stage_changed",
      eventKey: `deal:${created.id}:${input.stage}:created`,
      metadata: {
        dealId: created.id,
        fromStage: null,
        toStage: input.stage,
        source: input.source ?? null,
      },
    },
    tx,
  );

  return created;
}

async function contactHasPaidOrder(
  tx: DbClient,
  contactId: string,
  courseId: string,
) {
  const order = await tx.order.findFirst({
    where: {
      contactId,
      courseId,
      status: OrderStatus.PAID,
    },
    select: { id: true },
  });

  return Boolean(order);
}

async function evaluateConditions(
  tx: DbClient,
  automation: Automation,
  contact: Contact,
  depth = 0,
) {
  const conditions = coerceAutomationConditions(automation.conditions);

  if (
    conditions.sources?.length &&
    (!contact.source || !conditions.sources.includes(contact.source))
  ) {
    return false;
  }

  if (conditions.tagSlugs?.length) {
    const count = await tx.contactTag.count({
      where: {
        contactId: contact.id,
        tag: {
          slug: {
            in: conditions.tagSlugs,
          },
        },
      },
    });

    if (count < conditions.tagSlugs.length) {
      return false;
    }
  }

  for (const courseId of conditions.purchasedCourseIds ?? []) {
    if (!(await contactHasPaidOrder(tx, contact.id, courseId))) {
      return false;
    }
  }

  for (const courseId of conditions.excludedPurchasedCourseIds ?? []) {
    if (await contactHasPaidOrder(tx, contact.id, courseId)) {
      return false;
    }
  }

  if (conditions.segmentKey && depth < 2) {
    const segment = await tx.segment.findFirst({
      where: {
        authorId: automation.authorId,
        key: conditions.segmentKey,
      },
    });

    if (!segment) {
      return false;
    }

    const nestedAutomation = {
      ...automation,
      conditions: segment.filters,
    };

    return evaluateConditions(tx, nestedAutomation, contact, depth + 1);
  }

  return true;
}

async function createAutomationRun(
  tx: DbClient,
  input: {
    automation: Automation;
    contact: Contact;
    entryKey: string;
    triggerEventId?: string | null;
    userId?: string | null;
    metadata?: Record<string, unknown>;
    initialDelayMs?: number;
  },
): Promise<CreateAutomationRunResult> {
  const existing = await tx.automationRun.findUnique({
    where: {
      automationId_entryKey: {
        automationId: input.automation.id,
        entryKey: input.entryKey,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return {
      runId: existing.id,
      created: false,
    };
  }

  const steps = await tx.automationStep.findMany({
    where: {
      automationId: input.automation.id,
    },
    orderBy: [{ order: "asc" }],
  });

  const enteredAt = new Date();
  const run = await tx.automationRun.create({
    data: {
      automationId: input.automation.id,
      contactId: input.contact.id,
      userId: input.userId ?? input.contact.userId ?? null,
      triggerEventId: input.triggerEventId ?? null,
      entryKey: input.entryKey,
      currentStepOrder: steps[0]?.order ?? null,
      enteredAt,
      metadata: toInputJson(input.metadata ?? {}),
    },
  });

  let cumulativeDelayMs = input.initialDelayMs ?? 0;
  const dispatches = steps.map((step) => {
    cumulativeDelayMs += getAutomationDelayMs(step.delayAmount, step.delayUnit);

    return {
      runId: run.id,
      stepId: step.id,
      dueAt: new Date(enteredAt.getTime() + cumulativeDelayMs),
    };
  });

  if (dispatches.length) {
    await tx.automationDispatch.createMany({
      data: dispatches,
      skipDuplicates: true,
    });
  }

  await recordAutomationRunEvent(tx, {
    automationId: input.automation.id,
    runId: run.id,
    contactId: input.contact.id,
    type: "AUTOMATION_ENTER",
    metadata: {
      triggerEventId: input.triggerEventId ?? null,
    },
  });

  return {
    runId: run.id,
    created: true,
  };
}

async function markRunExited(
  tx: DbClient,
  input: {
    runId: string;
    automationId: string;
    contactId: string;
    status: AutomationRunStatus;
    reason: string;
    goalMet?: boolean;
  },
) {
  const now = new Date();

  await tx.automationRun.update({
    where: { id: input.runId },
    data: {
      status: input.status,
      goalMetAt: input.goalMet ? now : undefined,
      completedAt: input.status === "COMPLETED" ? now : undefined,
      exitedAt: now,
      exitReason: input.reason,
    },
  });

  await tx.automationDispatch.updateMany({
    where: {
      runId: input.runId,
      status: {
        in: ["PENDING", "RETRYING", "PROCESSING"],
      },
    },
    data: {
      status: "CANCELLED",
      lockedAt: null,
      lockedBy: null,
    },
  });

  if (input.goalMet) {
    await recordAutomationRunEvent(tx, {
      automationId: input.automationId,
      runId: input.runId,
      contactId: input.contactId,
      type: "AUTOMATION_GOAL_MET",
      metadata: {
        reason: input.reason,
      },
    });
  }

  await recordAutomationRunEvent(tx, {
    automationId: input.automationId,
    runId: input.runId,
    contactId: input.contactId,
    type: "AUTOMATION_EXIT",
    metadata: {
      reason: input.reason,
      status: input.status,
    },
  });
}

export async function stopAutomationRunsForAutomation(
  input: {
    automationId: string;
    reason: string;
  },
  db: DbClient = getPrismaClient(),
) {
  const activeRuns = await db.automationRun.findMany({
    where: {
      automationId: input.automationId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      automationId: true,
      contactId: true,
    },
  });

  for (const run of activeRuns) {
    await markRunExited(db, {
      runId: run.id,
      automationId: run.automationId,
      contactId: run.contactId,
      status: "STOPPED",
      reason: input.reason,
    });
  }

  return activeRuns.length;
}

async function isGoalMet(
  tx: DbClient,
  run: {
    id: string;
    automationId: string;
    contactId: string;
    enteredAt: Date;
    automation: Automation;
  },
) {
  const goal = coerceAutomationGoal(run.automation.goal, run.automation.courseId);

  if (goal.type === "NONE") {
    return false;
  }

  const event = await tx.contactEvent.findFirst({
    where: {
      authorId: run.automation.authorId,
      contactId: run.contactId,
      type: ContactEventType.COURSE_PURCHASED,
      occurredAt: {
        gte: run.enteredAt,
      },
      ...(goal.courseId ? { courseId: goal.courseId } : {}),
    },
    select: { id: true },
  });

  return Boolean(event);
}

async function maybeCompleteRun(tx: DbClient, runId: string) {
  const run = await tx.automationRun.findUnique({
    where: { id: runId },
    include: {
      automation: true,
    },
  });

  if (!run || run.status !== "ACTIVE") {
    return;
  }

  const pendingCount = await tx.automationDispatch.count({
    where: {
      runId,
      status: {
        in: ["PENDING", "RETRYING", "PROCESSING"],
      },
    },
  });

  if (!pendingCount) {
    await markRunExited(tx, {
      runId,
      automationId: run.automationId,
      contactId: run.contactId,
      status: "COMPLETED",
      reason: "all_steps_processed",
    });
  }
}

async function maybeStopGoalMetRuns(
  tx: DbClient,
  input: {
    authorId: string;
    contactId: string;
    courseId?: string | null;
  },
) {
  const activeRuns = await tx.automationRun.findMany({
    where: {
      contactId: input.contactId,
      status: "ACTIVE",
      automation: {
        authorId: input.authorId,
      },
    },
    include: {
      automation: true,
    },
  });

  for (const run of activeRuns) {
    const goal = coerceAutomationGoal(run.automation.goal, run.automation.courseId);

    if (
      goal.type === "COURSE_PURCHASED" &&
      (!goal.courseId || !input.courseId || goal.courseId === input.courseId)
    ) {
      await markRunExited(tx, {
        runId: run.id,
        automationId: run.automationId,
        contactId: run.contactId,
        status: "GOAL_MET",
        reason: "purchase_detected",
        goalMet: true,
      });
    }
  }
}

async function scheduleEventDrivenAutomations(
  tx: DbClient,
  input: {
    contact: Contact;
    event: ContactEvent;
  },
) {
  const triggerTypes =
    input.event.type === ContactEventType.LEAD_CAPTURED
      ? ([AutomationTriggerType.LEAD_CAPTURED] as AutomationTriggerType[])
      : input.event.type === ContactEventType.CHECKOUT_STARTED
        ? ([AutomationTriggerType.ABANDONED_CHECKOUT] as AutomationTriggerType[])
        : input.event.type === ContactEventType.WEBINAR_REGISTERED
          ? ([AutomationTriggerType.WEBINAR_REGISTERED] as AutomationTriggerType[])
          : input.event.type === ContactEventType.MODULE_COMPLETED
            ? ([AutomationTriggerType.MODULE_COMPLETED] as AutomationTriggerType[])
            : ([] as AutomationTriggerType[]);

  if (!triggerTypes.length) {
    return 0;
  }

  const automations = await tx.automation.findMany({
    where: {
      authorId: input.event.authorId,
      status: AutomationStatus.ACTIVE,
      triggerType: {
        in: triggerTypes,
      },
      ...(input.event.courseId ? { OR: [{ courseId: null }, { courseId: input.event.courseId }] } : {}),
    },
  });

  let scheduled = 0;

  for (const automation of automations) {
    if (!(await evaluateConditions(tx, automation, input.contact))) {
      continue;
    }

    const triggerConfig = coerceAutomationTriggerConfig(
      automation.triggerType,
      automation.triggerConfig,
    );

    const createdRun = await createAutomationRun(tx, {
      automation,
      contact: input.contact,
      userId: input.contact.userId,
      triggerEventId: input.event.id,
      entryKey:
        automation.triggerType === "ABANDONED_CHECKOUT"
          ? `abandoned:${input.event.id}`
          : `event:${input.event.id}`,
      metadata: {
        triggerType: automation.triggerType,
        sourceEvent: input.event.type,
      },
      initialDelayMs:
        automation.triggerType === "ABANDONED_CHECKOUT"
          ? (triggerConfig.delayMinutes ?? 60) * 60_000
          : 0,
    });

    if (createdRun.created) {
      scheduled += 1;
    }
  }

  return scheduled;
}

async function syncInactiveCourseAutomations(
  prisma: PrismaClient,
  automationId?: string,
) {
  const automations = await prisma.automation.findMany({
    where: {
      status: AutomationStatus.ACTIVE,
      triggerType: "COURSE_INACTIVE_DAYS",
      ...(automationId ? { id: automationId } : {}),
    },
  });

  let scheduled = 0;

  for (const automation of automations) {
    const triggerConfig = coerceAutomationTriggerConfig(
      automation.triggerType,
      automation.triggerConfig,
    );
    const threshold = addMinutes(
      new Date(),
      -1 * (triggerConfig.inactiveDays ?? 7) * 24 * 60,
    );

    const enrollments = await prisma.enrollment.findMany({
      where: {
        lastActivityAt: {
          lte: threshold,
        },
        course: {
          authorId: automation.authorId,
          ...(automation.courseId ? { id: automation.courseId } : {}),
        },
      },
      include: {
        course: {
          select: {
            id: true,
            authorId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 100,
    });

    for (const enrollment of enrollments) {
      await prisma.$transaction(async (tx) => {
        const contact = await upsertContact(tx, automation.authorId, {
          userId: enrollment.user.id,
          fullName: enrollment.user.name,
          email: enrollment.user.email,
          source: `course:${enrollment.course.id}`,
        });

        if (!(await evaluateConditions(tx, automation, contact))) {
          return;
        }

        const createdRun = await createAutomationRun(tx, {
          automation,
          contact,
          userId: enrollment.user.id,
          entryKey: `inactive:${enrollment.id}:${enrollment.lastActivityAt.toISOString()}`,
          metadata: {
            courseId: enrollment.course.id,
            lastActivityAt: enrollment.lastActivityAt.toISOString(),
          },
        });

        if (createdRun.created) {
          scheduled += 1;
        }
      });
    }
  }

  return scheduled;
}

async function syncDaysAfterEventAutomations(
  prisma: PrismaClient,
  automationId?: string,
) {
  const automations = await prisma.automation.findMany({
    where: {
      status: AutomationStatus.ACTIVE,
      triggerType: "DAYS_AFTER_EVENT",
      ...(automationId ? { id: automationId } : {}),
    },
  });

  let scheduled = 0;

  for (const automation of automations) {
    const triggerConfig = coerceAutomationTriggerConfig(
      automation.triggerType,
      automation.triggerConfig,
    );
    const threshold = addMinutes(
      new Date(),
      -1 * (triggerConfig.daysAfter ?? 3) * 24 * 60,
    );

    const events = await prisma.contactEvent.findMany({
      where: {
        authorId: automation.authorId,
        type: triggerConfig.eventType ?? ContactEventType.LEAD_CAPTURED,
        occurredAt: {
          lte: threshold,
        },
        ...(automation.courseId ? { courseId: automation.courseId } : {}),
      },
      include: {
        contact: true,
      },
      take: 100,
      orderBy: [{ occurredAt: "asc" }],
    });

    for (const event of events) {
      await prisma.$transaction(async (tx) => {
        if (!(await evaluateConditions(tx, automation, event.contact))) {
          return;
        }

        const createdRun = await createAutomationRun(tx, {
          automation,
          contact: event.contact,
          userId: event.contact.userId,
          triggerEventId: event.id,
          entryKey: `days-after:${event.id}:${triggerConfig.daysAfter ?? 3}`,
          metadata: {
            sourceEvent: event.type,
            occurredAt: event.occurredAt.toISOString(),
          },
        });

        if (createdRun.created) {
          scheduled += 1;
        }
      });
    }
  }

  return scheduled;
}

async function syncTimeBasedAutomations(
  prisma: PrismaClient,
  automationId?: string,
) {
  const [inactiveScheduled, daysAfterScheduled] = await Promise.all([
    syncInactiveCourseAutomations(prisma, automationId),
    syncDaysAfterEventAutomations(prisma, automationId),
  ]);

  return inactiveScheduled + daysAfterScheduled;
}

async function canSendMessageToContact(
  tx: DbClient,
  input: {
    authorId: string;
    contact: Contact;
    channel: "EMAIL" | "TELEGRAM";
  },
) {
  if (input.contact.globalUnsubscribedAt) {
    return { allowed: false, reason: "global_unsubscribed" };
  }

  if (input.channel === "EMAIL") {
    if (!input.contact.email) {
      return { allowed: false, reason: "email_missing" };
    }

    if (!input.contact.emailConsentGranted) {
      return { allowed: false, reason: "email_consent_missing" };
    }

    if (input.contact.emailUnsubscribedAt) {
      return { allowed: false, reason: "email_unsubscribed" };
    }
  }

  if (input.channel === "TELEGRAM") {
    if (!input.contact.telegramUsername) {
      return { allowed: false, reason: "telegram_missing" };
    }

    if (!input.contact.telegramConsentGranted) {
      return { allowed: false, reason: "telegram_consent_missing" };
    }

    if (input.contact.telegramUnsubscribedAt) {
      return { allowed: false, reason: "telegram_unsubscribed" };
    }
  }

  const sentToday = await tx.message.count({
    where: {
      authorId: input.authorId,
      contactId: input.contact.id,
      status: {
        in: [MessageStatus.SENT, MessageStatus.OPENED],
      },
      sentAt: {
        gte: getDayStart(),
      },
    },
  });

  if (sentToday >= getDailyMessageLimit()) {
    return { allowed: false, reason: "daily_limit_reached" };
  }

  return { allowed: true as const };
}

async function executeDispatchAction(
  tx: DbClient,
  dispatch: AutomationDispatch & {
    step: {
      id: string;
      order: number;
      actionType: Automation["triggerType"] | string;
      actionConfig: Prisma.JsonValue;
    };
    run: {
      id: string;
      automationId: string;
      contactId: string;
      status: AutomationRunStatus;
      metadata: Prisma.JsonValue | null;
      contact: Contact;
      automation: Automation & {
        course?: {
          title: string;
          currency: string;
        } | null;
      };
    };
  },
) {
  switch (dispatch.step.actionType) {
    case "APPLY_TAG": {
      const config = coerceAutomationActionConfig(
        "APPLY_TAG",
        dispatch.step.actionConfig,
      ) as {
        tagName: string;
        color?: string | null;
      };
      const slug = slugifyCourseTitle(config.tagName);
      const tag = await tx.tag.upsert({
        where: {
          authorId_slug: {
            authorId: dispatch.run.automation.authorId,
            slug,
          },
        },
        update: {
          color: config.color ?? undefined,
        },
        create: {
          authorId: dispatch.run.automation.authorId,
          name: config.tagName,
          slug,
          color: config.color ?? undefined,
        },
      });

      await tx.contactTag.upsert({
        where: {
          contactId_tagId: {
            contactId: dispatch.run.contactId,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          contactId: dispatch.run.contactId,
          tagId: tag.id,
        },
      });
      break;
    }

    case "CHANGE_DEAL_STAGE": {
      const config = coerceAutomationActionConfig(
        "CHANGE_DEAL_STAGE",
        dispatch.step.actionConfig,
      ) as {
        stage: DealStage;
        courseId?: string | null;
      };
      await upsertDealForEvent(tx, {
        authorId: dispatch.run.automation.authorId,
        contactId: dispatch.run.contactId,
        courseId: config.courseId ?? dispatch.run.automation.courseId,
        stage: config.stage,
      });
      break;
    }

    case "ISSUE_PROMO_CODE": {
      const config = coerceAutomationActionConfig(
        "ISSUE_PROMO_CODE",
        dispatch.step.actionConfig,
      ) as {
        percentOff?: number | null;
        amountOff?: number | null;
        currency?: string | null;
        expiresInDays?: number | null;
        prefix?: string | null;
      };
      const code = await createUniquePromoCode(tx, config.prefix);
      const expiresAt =
        config.expiresInDays != null
          ? addMinutes(new Date(), config.expiresInDays * 24 * 60)
          : null;

      await tx.discountCode.create({
        data: {
          authorId: dispatch.run.automation.authorId,
          contactId: dispatch.run.contactId,
          automationRunId: dispatch.run.id,
          code,
          percentOff:
            config.percentOff == null ? null : Math.round(config.percentOff),
          amountOff:
            config.amountOff == null
              ? null
              : new Prisma.Decimal(config.amountOff),
          currency: config.currency ?? dispatch.run.automation.course?.currency ?? null,
          expiresAt,
          metadata: toInputJson({
            source: "automation",
            stepId: dispatch.step.id,
          }),
        },
      });
      break;
    }

    case "CREATE_FOLLOW_UP": {
      const config = coerceAutomationActionConfig(
        "CREATE_FOLLOW_UP",
        dispatch.step.actionConfig,
      ) as {
        title: string;
        note?: string | null;
      };
      await tx.automationRun.update({
        where: { id: dispatch.run.id },
        data: {
          metadata: mergeMetadata(dispatch.run.metadata, {
            followUp: {
              title: config.title,
              note: config.note ?? null,
              createdAt: new Date().toISOString(),
            },
          }),
        },
      });
      break;
    }

    case "SEND_MESSAGE":
    default: {
      const config = coerceAutomationActionConfig(
        "SEND_MESSAGE",
        dispatch.step.actionConfig,
      ) as {
        channel: "EMAIL" | "TELEGRAM";
        subject?: string | null;
        text: string;
        html?: string | null;
      };
      const channel = config.channel;
      const dedupeKey = `${dispatch.run.id}:${dispatch.step.id}:${channel}`;
      const existingMessage = await tx.message.findUnique({
        where: {
          dedupeKey,
        },
      });

      if (
        existingMessage?.status === MessageStatus.SENT ||
        existingMessage?.status === MessageStatus.OPENED ||
        existingMessage?.status === MessageStatus.SKIPPED
      ) {
        return;
      }

      const permission = await canSendMessageToContact(tx, {
        authorId: dispatch.run.automation.authorId,
        contact: dispatch.run.contact,
        channel,
      });

      const persistedMessage =
        existingMessage ??
        (await tx.message.create({
          data: {
            authorId: dispatch.run.automation.authorId,
            contactId: dispatch.run.contactId,
            automationRunId: dispatch.run.id,
            automationStepId: dispatch.step.id,
            channel,
            provider: "MOCK",
            status: MessageStatus.PENDING,
            dedupeKey,
            subject: config.subject ?? null,
            contentText: config.text,
            contentHtml: config.html ?? null,
          },
        }));

      if (!permission.allowed) {
        await tx.message.update({
          where: { id: persistedMessage.id },
          data: {
            status: MessageStatus.SKIPPED,
            skipReason: permission.reason,
          },
        });
        return;
      }

      const latestDiscountCode = await tx.discountCode.findFirst({
        where: {
          automationRunId: dispatch.run.id,
          contactId: dispatch.run.contactId,
        },
        orderBy: [{ createdAt: "desc" }],
      });
      const variables = buildMessageTemplateVars({
        contact: dispatch.run.contact,
        automation: dispatch.run.automation,
        discountCode: latestDiscountCode,
      });
      const text = interpolateAutomationTemplate(config.text, variables);
      const html = config.html
        ? interpolateAutomationTemplate(config.html, variables)
        : null;
      const provider = getMessagingProvider(channel);
      const sendResult = await provider.sendMessage({
        authorId: dispatch.run.automation.authorId,
        messageId: persistedMessage.id,
        recipient: {
          contactId: dispatch.run.contactId,
          fullName: dispatch.run.contact.fullName,
          email: dispatch.run.contact.email,
          telegramUsername: dispatch.run.contact.telegramUsername,
          metadata: asRecord(dispatch.run.contact.metadata),
          unsubscribeToken: dispatch.run.contact.unsubscribeToken,
        },
        payload: {
          channel,
          dedupeKey,
          subject: config.subject ?? null,
          text,
          html,
          trackingPixelUrl:
            channel === "EMAIL"
              ? `${getAppUrl()}/api/messages/open/${encodeURIComponent(
                  persistedMessage.id,
                )}`
              : null,
        },
      });

      await tx.message.update({
        where: { id: persistedMessage.id },
        data: {
          provider: sendResult.provider,
          status:
            sendResult.status === "sent"
              ? MessageStatus.SENT
              : MessageStatus.SKIPPED,
          externalMessageId: sendResult.externalMessageId,
          skipReason: sendResult.skipReason,
          sentAt: sendResult.status === "sent" ? new Date() : null,
          metadata: mergeMetadata(persistedMessage.metadata, sendResult.metadata),
          subject: config.subject ?? null,
          contentText: text,
          contentHtml: html,
        },
      });

      if (sendResult.status === "sent") {
        await recordAutomationRunEvent(tx, {
          automationId: dispatch.run.automationId,
          runId: dispatch.run.id,
          contactId: dispatch.run.contactId,
          stepId: dispatch.step.id,
          messageId: persistedMessage.id,
          type: "MESSAGE_SENT",
          metadata: {
            channel,
            provider: sendResult.provider,
          },
        });
      }
    }
  }
}

async function executeDispatch(
  prisma: PrismaClient,
  dispatchId: string,
  workerId: string,
) {
  const dispatch = await prisma.automationDispatch.findUnique({
    where: {
      id: dispatchId,
    },
    include: {
      step: true,
      run: {
        include: {
          contact: true,
          automation: {
            include: {
              course: {
                select: {
                  title: true,
                  currency: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!dispatch) {
    return "skipped" as const;
  }

  if (
    dispatch.run.status !== "ACTIVE" ||
    dispatch.run.automation.status !== "ACTIVE"
  ) {
    await prisma.automationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: "CANCELLED",
        processedAt: new Date(),
        lockedAt: null,
        lockedBy: workerId,
      },
    });
    return "skipped" as const;
  }

  const goalMet = await prisma.$transaction(async (tx) =>
    isGoalMet(tx, {
      id: dispatch.run.id,
      automationId: dispatch.run.automationId,
      contactId: dispatch.run.contactId,
      enteredAt: dispatch.run.enteredAt,
      automation: dispatch.run.automation,
    }),
  );

  if (goalMet) {
    await prisma.$transaction(async (tx) => {
      await markRunExited(tx, {
        runId: dispatch.run.id,
        automationId: dispatch.run.automationId,
        contactId: dispatch.run.contactId,
        status: "GOAL_MET",
        reason: "goal_met_before_dispatch",
        goalMet: true,
      });
    });

    await prisma.automationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: "CANCELLED",
        processedAt: new Date(),
        lockedAt: null,
        lockedBy: workerId,
      },
    });
    return "skipped" as const;
  }

  await prisma.$transaction(async (tx) => {
    await executeDispatchAction(tx, dispatch);

    await tx.automationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        lockedAt: null,
        lockedBy: workerId,
      },
    });

    await tx.automationRun.update({
      where: { id: dispatch.run.id },
      data: {
        currentStepOrder: dispatch.step.order,
      },
    });

    await maybeCompleteRun(tx, dispatch.run.id);
  });

  return "processed" as const;
}

export async function recordContactLifecycleEvent(
  input: RecordContactLifecycleInput,
) {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    const contact = await upsertContact(tx, input.authorId, input.contact);

    if (input.orderId) {
      await tx.order.update({
        where: { id: input.orderId },
        data: {
          contactId: contact.id,
        },
      });
    }

    const event = input.eventKey
      ? await tx.contactEvent.upsert({
          where: {
            authorId_type_eventKey: {
              authorId: input.authorId,
              type: input.type,
              eventKey: input.eventKey,
            },
          },
          update: {
            contactId: contact.id,
            courseId: input.courseId ?? null,
            orderId: input.orderId ?? null,
            metadata: toInputJson(input.metadata ?? {}),
            occurredAt: input.occurredAt ?? new Date(),
          },
          create: {
            authorId: input.authorId,
            contactId: contact.id,
            courseId: input.courseId ?? null,
            orderId: input.orderId ?? null,
            eventKey: input.eventKey,
            type: input.type,
            metadata: toInputJson(input.metadata ?? {}),
            occurredAt: input.occurredAt ?? new Date(),
          },
        })
      : await tx.contactEvent.create({
          data: {
            authorId: input.authorId,
            contactId: contact.id,
            courseId: input.courseId ?? null,
            orderId: input.orderId ?? null,
            type: input.type,
            metadata: toInputJson(input.metadata ?? {}),
            occurredAt: input.occurredAt ?? new Date(),
          },
        });

    await recordPlatformEvent(
      {
        ownerId: input.authorId,
        contactId: contact.id,
        courseId: input.courseId ?? null,
        orderId: input.orderId ?? null,
        source: "contact",
        name:
          input.type === ContactEventType.LEAD_CAPTURED
            ? "contact_created"
            : input.type,
        eventKey: input.eventKey ?? event.id,
        visitorId: input.contact.visitorId ?? null,
        metadata: {
          source: input.contact.source ?? null,
          ...(input.metadata ?? {}),
        },
        timestamp: input.occurredAt ?? event.occurredAt,
      },
      tx,
    );

    if (input.type === ContactEventType.LEAD_CAPTURED) {
      await upsertDealForEvent(tx, {
        authorId: input.authorId,
        contactId: contact.id,
        courseId: input.courseId ?? null,
        orderId: input.orderId ?? null,
        source: input.contact.source ?? null,
        stage: DealStage.NEW_LEAD,
      });
    }

    if (input.type === ContactEventType.CHECKOUT_STARTED) {
      await upsertDealForEvent(tx, {
        authorId: input.authorId,
        contactId: contact.id,
        courseId: input.courseId ?? null,
        orderId: input.orderId ?? null,
        source: input.contact.source ?? null,
        stage: DealStage.CHECKOUT_STARTED,
      });
    }

    if (input.type === ContactEventType.COURSE_PURCHASED) {
      const order = input.orderId
        ? await tx.order.findUnique({
            where: { id: input.orderId },
            select: { amount: true },
          })
        : null;

      await upsertDealForEvent(tx, {
        authorId: input.authorId,
        contactId: contact.id,
        courseId: input.courseId ?? null,
        orderId: input.orderId ?? null,
        source: input.contact.source ?? null,
        stage: DealStage.PAID,
        value: order ? Number(order.amount) : null,
      });

      await tx.contact.update({
        where: { id: contact.id },
        data: {
          isStudent: true,
        },
      });
    }

    const scheduled = await scheduleEventDrivenAutomations(tx, {
      contact,
      event,
    });

    if (input.type === ContactEventType.COURSE_PURCHASED) {
      await maybeStopGoalMetRuns(tx, {
        authorId: input.authorId,
        contactId: contact.id,
        courseId: input.courseId ?? null,
      });
    }

    return {
      contactId: contact.id,
      eventId: event.id,
      scheduledRuns: scheduled,
    };
  });
}

export async function processAutomationQueue(
  options: {
    limit?: number;
    workerId?: string;
    automationId?: string;
  } = {},
): Promise<ProcessQueueResult> {
  const prisma = getPrismaClient();
  const limit = options.limit ?? 20;
  const workerId = options.workerId ?? getWorkerId();
  const synced = await syncTimeBasedAutomations(prisma, options.automationId);
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  while (processed + skipped + failed < limit) {
    const candidates = await prisma.automationDispatch.findMany({
      where: {
        dueAt: {
          lte: new Date(),
        },
        status: {
          in: ["PENDING", "RETRYING"],
        },
        run: {
          status: "ACTIVE",
          ...(options.automationId ? { automationId: options.automationId } : {}),
          automation: {
            status: "ACTIVE",
          },
        },
      },
      orderBy: [{ dueAt: "asc" }],
      take: Math.min(5, limit - processed - skipped - failed),
      select: {
        id: true,
      },
    });

    if (!candidates.length) {
      break;
    }

    for (const candidate of candidates) {
      const lock = await prisma.automationDispatch.updateMany({
        where: {
          id: candidate.id,
          status: {
            in: ["PENDING", "RETRYING"],
          },
          OR: [
            { lockedAt: null },
            {
              lockedAt: {
                lt: new Date(Date.now() - LOCK_STALE_AFTER_MS),
              },
            },
          ],
        },
        data: {
          status: "PROCESSING",
          lockedAt: new Date(),
          lockedBy: workerId,
          attempts: {
            increment: 1,
          },
        },
      });

      if (!lock.count) {
        continue;
      }

      try {
        const result = await executeDispatch(prisma, candidate.id, workerId);

        if (result === "processed") {
          processed += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        const current = await prisma.automationDispatch.findUnique({
          where: { id: candidate.id },
          include: {
            run: true,
          },
        });
        const attempts = current?.attempts ?? 1;
        const canRetry = attempts < getMaxAttempts();

        await prisma.automationDispatch.update({
          where: { id: candidate.id },
          data: {
            status: canRetry ? "RETRYING" : "FAILED",
            dueAt: canRetry ? addMinutes(new Date(), attempts * 5) : current?.dueAt,
            lastError: error instanceof Error ? error.message : "Unknown error",
            lockedAt: null,
            lockedBy: workerId,
          },
        });

        if (!canRetry && current?.runId) {
          await prisma.$transaction(async (tx) => {
            const run = await tx.automationRun.findUnique({
              where: { id: current.runId },
            });

            if (run?.status === "ACTIVE") {
              await markRunExited(tx, {
                runId: run.id,
                automationId: run.automationId,
                contactId: run.contactId,
                status: "FAILED",
                reason: "dispatch_failed",
              });
            }
          });
        }
      }
    }
  }

  return {
    synced,
    processed,
    skipped,
    failed,
  };
}

export async function recordMessageOpened(messageId: string) {
  const prisma = getPrismaClient();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return false;
  }

  if (message.openedAt) {
    return true;
  }

  await prisma.$transaction(async (tx) => {
    await tx.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.OPENED,
        openedAt: new Date(),
      },
    });

    if (message.automationRunId) {
      const run = await tx.automationRun.findUnique({
        where: {
          id: message.automationRunId,
        },
      });

      if (run) {
        await recordAutomationRunEvent(tx, {
          automationId: run.automationId,
          runId: run.id,
          contactId: run.contactId,
          stepId: message.automationStepId,
          messageId: message.id,
          type: "MESSAGE_OPENED",
          metadata: {
            channel: message.channel,
          },
        });
      }
    }
  });

  return true;
}
