import {
  AutomationEventType,
  AutomationRunStatus,
  AutomationStatus,
  UserRole,
} from "@prisma/client";
import { coerceAutomationActionConfig } from "@/lib/automations";
import type { AuthorActor } from "@/server/author/queries";
import { getPrismaClient } from "@/server/db";

export type AuthorAutomationCourseOption = {
  id: string;
  title: string;
  slug: string;
};

export type AuthorAutomationSummaryItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: AutomationStatus;
  triggerType: string;
  courseTitle: string | null;
  stepCount: number;
  enteredCount: number;
  activeRuns: number;
  goalMetCount: number;
  sentMessages: number;
  updatedAt: Date;
};

export type AuthorAutomationSummaryData = {
  courses: AuthorAutomationCourseOption[];
  automations: AuthorAutomationSummaryItem[];
};

export type AuthorAutomationDetailData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: AutomationStatus;
  triggerType: string;
  triggerConfig: unknown;
  conditions: unknown;
  goal: unknown;
  courseId: string | null;
  courseTitle: string | null;
  stats: {
    entered: number;
    activeRuns: number;
    completed: number;
    goalMet: number;
    messagesSent: number;
    messagesOpened: number;
  };
  steps: Array<{
    id: string;
    order: number;
    title: string;
    delayAmount: number;
    delayUnit: string;
    actionType: string;
    actionConfig: unknown;
    summary: string;
  }>;
  recentRuns: Array<{
    id: string;
    status: AutomationRunStatus;
    enteredAt: Date;
    exitedAt: Date | null;
    currentStepOrder: number | null;
    contact: {
      id: string;
      fullName: string | null;
      email: string | null;
      telegramUsername: string | null;
    };
  }>;
  courses: AuthorAutomationCourseOption[];
};

type AutomationAggregateStats = {
  entered: number;
  activeRuns: number;
  completed: number;
  goalMet: number;
  messagesSent: number;
  messagesOpened: number;
};

function buildAutomationAccessWhere(actor: AuthorActor) {
  return actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId };
}

function buildStepSummary(step: {
  actionType: string;
  actionConfig: unknown;
}) {
  const config = coerceAutomationActionConfig(
    step.actionType as never,
    step.actionConfig,
  ) as Record<string, string | number | null | undefined>;

  switch (step.actionType) {
    case "SEND_MESSAGE":
      return `${config.channel ?? "TELEGRAM"}: ${String(config.text ?? "").slice(0, 72)}`;
    case "APPLY_TAG":
      return `Тег: ${config.tagName ?? "Новый тег"}`;
    case "CHANGE_DEAL_STAGE":
      return `Сделка -> ${config.stage ?? "INTERESTED"}`;
    case "ISSUE_PROMO_CODE":
      return config.percentOff
        ? `Промокод ${config.percentOff}%`
        : `Промокод ${config.amountOff ?? 0}`;
    case "CREATE_FOLLOW_UP":
      return `Follow-up: ${config.title ?? "Follow-up"}`;
    default:
      return step.actionType;
  }
}

function createEmptyAutomationStats(): AutomationAggregateStats {
  return {
    entered: 0,
    activeRuns: 0,
    completed: 0,
    goalMet: 0,
    messagesSent: 0,
    messagesOpened: 0,
  };
}

async function getAutomationAggregateStats(
  automationIds: string[],
): Promise<Map<string, AutomationAggregateStats>> {
  const prisma = getPrismaClient();
  const statsByAutomation = new Map<string, AutomationAggregateStats>();

  for (const automationId of automationIds) {
    statsByAutomation.set(automationId, createEmptyAutomationStats());
  }

  if (!automationIds.length) {
    return statsByAutomation;
  }

  const [runGroups, eventGroups] = await Promise.all([
    prisma.automationRun.groupBy({
      by: ["automationId", "status"],
      where: {
        automationId: {
          in: automationIds,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.automationRunEvent.groupBy({
      by: ["automationId", "type"],
      where: {
        automationId: {
          in: automationIds,
        },
        type: {
          in: [
            AutomationEventType.AUTOMATION_GOAL_MET,
            AutomationEventType.MESSAGE_SENT,
            AutomationEventType.MESSAGE_OPENED,
          ],
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  for (const group of runGroups) {
    const stats = statsByAutomation.get(group.automationId);

    if (!stats) {
      continue;
    }

    stats.entered += group._count._all;

    if (group.status === "ACTIVE") {
      stats.activeRuns += group._count._all;
    }

    if (group.status === "COMPLETED") {
      stats.completed += group._count._all;
    }
  }

  for (const group of eventGroups) {
    const stats = statsByAutomation.get(group.automationId);

    if (!stats) {
      continue;
    }

    if (group.type === "AUTOMATION_GOAL_MET") {
      stats.goalMet += group._count._all;
    }

    if (group.type === "MESSAGE_SENT") {
      stats.messagesSent += group._count._all;
    }

    if (group.type === "MESSAGE_OPENED") {
      stats.messagesOpened += group._count._all;
    }
  }

  return statsByAutomation;
}

export async function getAuthorAutomationsSummary(
  actor: AuthorActor,
): Promise<AuthorAutomationSummaryData> {
  const prisma = getPrismaClient();
  const where = buildAutomationAccessWhere(actor);

  const [courses, automations] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
      },
    }),
    prisma.automation.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        triggerType: true,
        updatedAt: true,
        course: {
          select: {
            title: true,
          },
        },
        _count: {
          select: {
            steps: true,
          },
        },
      },
    }),
  ]);

  const automationIds = automations.map((automation) => automation.id);
  const statsByAutomation = await getAutomationAggregateStats(automationIds);

  return {
    courses,
    automations: automations.map((automation) => {
      const stats =
        statsByAutomation.get(automation.id) ?? createEmptyAutomationStats();

      return {
        id: automation.id,
        name: automation.name,
        slug: automation.slug,
        description: automation.description,
        status: automation.status,
        triggerType: automation.triggerType,
        courseTitle: automation.course?.title ?? null,
        stepCount: automation._count.steps,
        enteredCount: stats.entered,
        activeRuns: stats.activeRuns,
        goalMetCount: stats.goalMet,
        sentMessages: stats.messagesSent,
        updatedAt: automation.updatedAt,
      };
    }),
  };
}

export async function getAuthorAutomationDetail(
  automationId: string,
  actor: AuthorActor,
): Promise<
  | { status: "ok"; data: AuthorAutomationDetailData }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  const prisma = getPrismaClient();

  const automation = await prisma.automation.findFirst({
    where: {
      id: automationId,
      ...buildAutomationAccessWhere(actor),
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      steps: {
        orderBy: [{ order: "asc" }],
      },
      runs: {
        orderBy: [{ enteredAt: "desc" }],
        take: 12,
        include: {
          contact: {
            select: {
              id: true,
              fullName: true,
              email: true,
              telegramUsername: true,
            },
          },
        },
      },
    },
  });

  if (!automation) {
    const exists = await prisma.automation.findUnique({
      where: { id: automationId },
      select: { id: true },
    });

    return exists ? { status: "forbidden" } : { status: "not_found" };
  }

  const [courses, statsByAutomation] = await Promise.all([
    prisma.course.findMany({
      where: buildAutomationAccessWhere(actor),
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
      },
    }),
    getAutomationAggregateStats([automation.id]),
  ]);
  const stats =
    statsByAutomation.get(automation.id) ?? createEmptyAutomationStats();

  return {
    status: "ok",
    data: {
      id: automation.id,
      name: automation.name,
      slug: automation.slug,
      description: automation.description,
      status: automation.status,
      triggerType: automation.triggerType,
      triggerConfig: automation.triggerConfig,
      conditions: automation.conditions,
      goal: automation.goal,
      courseId: automation.courseId,
      courseTitle: automation.course?.title ?? null,
      stats: {
        entered: stats.entered,
        activeRuns: stats.activeRuns,
        completed: stats.completed,
        goalMet: stats.goalMet,
        messagesSent: stats.messagesSent,
        messagesOpened: stats.messagesOpened,
      },
      steps: automation.steps.map((step) => ({
        id: step.id,
        order: step.order,
        title: step.title,
        delayAmount: step.delayAmount,
        delayUnit: step.delayUnit,
        actionType: step.actionType,
        actionConfig: step.actionConfig,
        summary: buildStepSummary(step),
      })),
      recentRuns: automation.runs.map((run) => ({
        id: run.id,
        status: run.status,
        enteredAt: run.enteredAt,
        exitedAt: run.exitedAt,
        currentStepOrder: run.currentStepOrder,
        contact: run.contact,
      })),
      courses,
    },
  };
}
