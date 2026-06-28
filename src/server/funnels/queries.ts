import {
  FunnelEventType,
  FunnelStatus,
  OrderStatus,
  UserRole,
  type FunnelStepType,
  type Prisma,
} from "@prisma/client";
import {
  buildFunnelEntryHref,
  buildFunnelStepHref,
  coerceFunnelStepConfig,
  coerceFunnelStepVariant,
  coerceFunnelTransitions,
  funnelStepTypeLabels,
  type FunnelStepDraft,
} from "@/lib/funnels";
import { getPrismaClient } from "@/server/db";
import { mapCourseContext, mapSalesPage } from "@/server/sales-page/queries";

export type FunnelActor = {
  userId: string;
  role: UserRole;
};

export type AuthorFunnelListItem = {
  id: string;
  name: string;
  slug: string;
  status: FunnelStatus;
  description: string | null;
  entryStepId: string | null;
  publishedAt: string | null;
  updatedAt: string;
  course: {
    id: string;
    title: string;
    slug: string;
  };
  stepCount: number;
  visitCount: number;
  completionCount: number;
  paidOrders: number;
  revenue: number;
};

export type AuthorFunnelSummary = {
  funnels: AuthorFunnelListItem[];
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    price: number;
    currency: string;
  }>;
};

export type AuthorFunnelStepAnalytics = {
  stepId: string;
  stepKey: string;
  stepName: string;
  stepType: FunnelStepType;
  stepLabel: string;
  views: number;
  progressed: number;
  dropOff: number;
  conversionRate: number;
  eventCounts: Record<string, number>;
  variantStats: Array<{
    variant: "A" | "B";
    views: number;
    progressed: number;
    winRate: number;
  }>;
};

export type AuthorFunnelDetail = {
  funnel: {
    id: string;
    name: string;
    slug: string;
    status: FunnelStatus;
    description: string | null;
    entryStepId: string | null;
    publishedAt: string | null;
    updatedAt: string;
    publicHref: string;
    previewHref: string;
    course: {
      id: string;
      title: string;
      slug: string;
      price: number;
      currency: string;
      status: string;
    };
  };
  steps: FunnelStepDraft[];
  analytics: {
    totalVisits: number;
    completedVisits: number;
    paidOrders: number;
    revenue: number;
    stepStats: Record<string, AuthorFunnelStepAnalytics>;
  };
  courseOptions: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
};

export type RuntimeFunnelData = {
  funnel: {
    id: string;
    slug: string;
    name: string;
    status: FunnelStatus;
    description: string | null;
    entryStepId: string | null;
    publicHref: string;
    previewHref: string;
    authorId: string;
  };
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    level: string;
    language: string;
    price: number;
    currency: string;
    coverUrl: string | null;
    aiEnhanced: boolean;
    author: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    };
    modules: Array<{
      id: string;
      title: string;
      description: string;
      order: number;
      lessons: Array<{
        id: string;
        title: string;
        description: string;
        durationMinutes: number;
        videoUrl: string | null;
        transcript: string | null;
        contentText: string;
        aiSummary: string | null;
      }>;
    }>;
    badges: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
    }>;
  };
  salesPage: ReturnType<typeof mapSalesPage> | null;
  steps: FunnelStepDraft[];
};

function buildFunnelWhere(actor: FunnelActor) {
  return actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId };
}

function decimalToNumber(value: Prisma.Decimal | number) {
  return Number(value);
}

function getMetadataObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getMetadataString(
  metadata: Prisma.JsonValue | null | undefined,
  key: string,
) {
  const value = getMetadataObject(metadata)[key];
  return typeof value === "string" ? value : "";
}

function mapStepDraft(step: {
  id: string;
  key: string;
  name: string;
  type: FunnelStepType;
  order: number;
  config: Prisma.JsonValue;
  transitions: Prisma.JsonValue | null;
  abTestEnabled: boolean;
  splitPercent: number;
  variantA: Prisma.JsonValue | null;
  variantB: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}, course: { title: string; currency: string; price: number }): FunnelStepDraft {
  return {
    id: step.id,
    key: step.key,
    name: step.name,
    type: step.type,
    order: step.order,
    config: coerceFunnelStepConfig(step.type, step.config, course),
    transitions: coerceFunnelTransitions(step.transitions),
    abTestEnabled: step.abTestEnabled,
    splitPercent: step.splitPercent,
    variantA: coerceFunnelStepVariant(step.variantA),
    variantB: coerceFunnelStepVariant(step.variantB),
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString(),
  };
}

function buildStepAnalytics(
  steps: FunnelStepDraft[],
  events: Array<{
    funnelVisitId: string;
    stepId: string | null;
    type: FunnelEventType;
    variant: string | null;
    metadata: Prisma.JsonValue | null;
  }>,
  completedVisits: number,
) {
  const views = new Map<string, Set<string>>();
  const progressed = new Map<string, Set<string>>();
  const eventCounts = new Map<string, Map<string, number>>();
  const variantViews = new Map<string, Map<"A" | "B", Set<string>>>();
  const variantProgress = new Map<string, Map<"A" | "B", Set<string>>>();

  function ensureSet(map: Map<string, Set<string>>, key: string) {
    const bucket = map.get(key) ?? new Set<string>();
    map.set(key, bucket);
    return bucket;
  }

  function ensureVariantSet(
    map: Map<string, Map<"A" | "B", Set<string>>>,
    key: string,
    variant: "A" | "B",
  ) {
    const variants =
      map.get(key) ??
      new Map<"A" | "B", Set<string>>([
        ["A", new Set<string>()],
        ["B", new Set<string>()],
      ]);

    map.set(key, variants);
    return variants.get(variant)!;
  }

  function ensureEventCount(stepId: string) {
    const counts = eventCounts.get(stepId) ?? new Map<string, number>();
    eventCounts.set(stepId, counts);
    return counts;
  }

  for (const event of events) {
    if (event.stepId) {
      const counts = ensureEventCount(event.stepId);
      counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    }

    if (event.type === FunnelEventType.STEP_VIEW && event.stepId) {
      ensureSet(views, event.stepId).add(event.funnelVisitId);

      if (event.variant === "A" || event.variant === "B") {
        ensureVariantSet(variantViews, event.stepId, event.variant).add(
          event.funnelVisitId,
        );
      }
    }

    const fromStepId = getMetadataString(event.metadata, "fromStepId");
    const fromVariant = getMetadataString(event.metadata, "fromVariant");

    if (event.type === FunnelEventType.STEP_VIEW && fromStepId) {
      ensureSet(progressed, fromStepId).add(event.funnelVisitId);

      if (fromVariant === "A" || fromVariant === "B") {
        ensureVariantSet(variantProgress, fromStepId, fromVariant).add(
          event.funnelVisitId,
        );
      }
    }
  }

  return Object.fromEntries(
    steps.map((step) => {
      const stepViews = views.get(step.id)?.size ?? 0;
      const stepProgressed =
        step.type === "THANK_YOU"
          ? completedVisits
          : progressed.get(step.id)?.size ?? 0;
      const dropOff = Math.max(stepViews - stepProgressed, 0);
      const conversionRate = stepViews
        ? Number(((stepProgressed / stepViews) * 100).toFixed(1))
        : 0;
      const counts = eventCounts.get(step.id) ?? new Map<string, number>();

      const variantStats = step.abTestEnabled
        ? (["A", "B"] as const).map((variant) => {
            const variantViewCount =
              variantViews.get(step.id)?.get(variant)?.size ?? 0;
            const variantProgressCount =
              variantProgress.get(step.id)?.get(variant)?.size ?? 0;

            return {
              variant,
              views: variantViewCount,
              progressed: variantProgressCount,
              winRate: variantViewCount
                ? Number(((variantProgressCount / variantViewCount) * 100).toFixed(1))
                : 0,
            };
          })
        : [];

      return [
        step.id,
        {
          stepId: step.id,
          stepKey: step.key,
          stepName: step.name,
          stepType: step.type,
          stepLabel: funnelStepTypeLabels[step.type],
          views: stepViews,
          progressed: stepProgressed,
          dropOff,
          conversionRate,
          eventCounts: Object.fromEntries(counts.entries()),
          variantStats,
        } satisfies AuthorFunnelStepAnalytics,
      ];
    }),
  ) as Record<string, AuthorFunnelStepAnalytics>;
}

export async function getAuthorFunnelsSummary(
  actor: FunnelActor,
): Promise<AuthorFunnelSummary> {
  const prisma = getPrismaClient();
  const where = buildFunnelWhere(actor);

  const [funnels, courses] = await Promise.all([
    prisma.funnel.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        steps: {
          select: {
            id: true,
          },
        },
        visits: {
          select: {
            id: true,
            status: true,
          },
        },
        orders: {
          where: {
            status: OrderStatus.PAID,
          },
          select: {
            amount: true,
          },
        },
      },
    }),
    prisma.course.findMany({
      where: actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        price: true,
        currency: true,
      },
    }),
  ]);

  return {
    funnels: funnels.map((funnel) => ({
      id: funnel.id,
      name: funnel.name,
      slug: funnel.slug,
      status: funnel.status,
      description: funnel.description,
      entryStepId: funnel.entryStepId,
      publishedAt: funnel.publishedAt?.toISOString() ?? null,
      updatedAt: funnel.updatedAt.toISOString(),
      course: funnel.course,
      stepCount: funnel.steps.length,
      visitCount: funnel.visits.length,
      completionCount: funnel.visits.filter((visit) => visit.status === "COMPLETED").length,
      paidOrders: funnel.orders.length,
      revenue: funnel.orders.reduce(
        (sum, order) => sum + decimalToNumber(order.amount),
        0,
      ),
    })),
    courses: courses.map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      status: course.status,
      price: decimalToNumber(course.price),
      currency: course.currency,
    })),
  };
}

export async function getAuthorFunnelDetail(
  funnelId: string,
  actor: FunnelActor,
): Promise<
  | { status: "ok"; data: AuthorFunnelDetail }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  const prisma = getPrismaClient();

  const funnel = await prisma.funnel.findFirst({
    where: {
      id: funnelId,
      ...buildFunnelWhere(actor),
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          currency: true,
          status: true,
        },
      },
      steps: {
        orderBy: [{ order: "asc" }],
      },
      visits: {
        select: {
          id: true,
          status: true,
        },
      },
      orders: {
        where: {
          status: OrderStatus.PAID,
        },
        select: {
          amount: true,
        },
      },
    },
  });

  if (!funnel) {
    const exists = await prisma.funnel.findUnique({
      where: { id: funnelId },
      select: { id: true },
    });

    return exists ? { status: "forbidden" } : { status: "not_found" };
  }

  const [events, courseOptions] = await Promise.all([
    prisma.funnelEvent.findMany({
      where: { funnelId },
      select: {
        funnelVisitId: true,
        stepId: true,
        type: true,
        variant: true,
        metadata: true,
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.course.findMany({
      where: actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
      },
    }),
  ]);

  const courseForConfig = {
    title: funnel.course.title,
    currency: funnel.course.currency,
    price: decimalToNumber(funnel.course.price),
  };
  const steps = funnel.steps.map((step) => mapStepDraft(step, courseForConfig));
  const completedVisits = funnel.visits.filter((visit) => visit.status === "COMPLETED").length;
  const paidOrders = funnel.orders.length;
  const revenue = funnel.orders.reduce(
    (sum, order) => sum + decimalToNumber(order.amount),
    0,
  );

  return {
    status: "ok",
    data: {
      funnel: {
        id: funnel.id,
        name: funnel.name,
        slug: funnel.slug,
        status: funnel.status,
        description: funnel.description,
        entryStepId: funnel.entryStepId,
        publishedAt: funnel.publishedAt?.toISOString() ?? null,
        updatedAt: funnel.updatedAt.toISOString(),
        publicHref: buildFunnelEntryHref(funnel.slug, false),
        previewHref: buildFunnelEntryHref(funnel.slug, true),
        course: {
          id: funnel.course.id,
          title: funnel.course.title,
          slug: funnel.course.slug,
          price: decimalToNumber(funnel.course.price),
          currency: funnel.course.currency,
          status: funnel.course.status,
        },
      },
      steps,
      analytics: {
        totalVisits: funnel.visits.length,
        completedVisits,
        paidOrders,
        revenue,
        stepStats: buildStepAnalytics(steps, events, completedVisits),
      },
      courseOptions,
    },
  };
}

export async function getRuntimeFunnelData(input: {
  slug: string;
  actor?: FunnelActor | null;
  preview?: boolean;
}): Promise<RuntimeFunnelData | null> {
  const prisma = getPrismaClient();
  const preview = Boolean(input.preview);

  const funnel = await prisma.funnel.findFirst({
    where: preview
      ? input.actor
        ? {
            slug: input.slug,
            ...(input.actor.role === UserRole.ADMIN
              ? {}
              : { authorId: input.actor.userId }),
          }
        : {
            slug: "__forbidden__",
          }
      : {
          slug: input.slug,
          status: FunnelStatus.PUBLISHED,
        },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          level: true,
          language: true,
          price: true,
          currency: true,
          coverUrl: true,
          aiEnhanced: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          modules: {
            orderBy: [{ order: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              lessons: {
                orderBy: [{ order: "asc" }],
                select: {
                  id: true,
                  title: true,
                  description: true,
                  durationMinutes: true,
                  videoUrl: true,
                  transcript: true,
                  contentText: true,
                  aiSummary: true,
                  order: true,
                },
              },
            },
          },
          badges: {
            select: {
              id: true,
              title: true,
              description: true,
              icon: true,
            },
          },
          salesPage: {
            include: {
              blocks: {
                orderBy: [{ order: "asc" }],
              },
            },
          },
        },
      },
      steps: {
        orderBy: [{ order: "asc" }],
      },
    },
  });

  if (!funnel) {
    return null;
  }

  const courseForConfig = {
    title: funnel.course.title,
    currency: funnel.course.currency,
    price: decimalToNumber(funnel.course.price),
  };

  return {
    funnel: {
      id: funnel.id,
      slug: funnel.slug,
      name: funnel.name,
      status: funnel.status,
      description: funnel.description,
      entryStepId: funnel.entryStepId,
      publicHref: buildFunnelEntryHref(funnel.slug, false),
      previewHref: buildFunnelEntryHref(funnel.slug, true),
      authorId: funnel.authorId,
    },
    course: mapCourseContext(funnel.course),
    salesPage: funnel.course.salesPage ? mapSalesPage(funnel.course.salesPage) : null,
    steps: funnel.steps.map((step) => mapStepDraft(step, courseForConfig)),
  };
}

export function findFunnelStep(steps: FunnelStepDraft[], stepKey: string) {
  return steps.find((step) => step.key === stepKey) ?? null;
}

export function findFunnelEntryStep(
  steps: FunnelStepDraft[],
  entryStepId: string | null,
) {
  if (entryStepId) {
    const explicit = steps.find((step) => step.id === entryStepId);

    if (explicit) {
      return explicit;
    }
  }

  return steps[0] ?? null;
}

export function buildNextStepHref(input: {
  funnelSlug: string;
  nextStepKey: string;
  visitId: string;
  preview?: boolean;
  fromStepId?: string;
  fromVariant?: string;
}) {
  return buildFunnelStepHref(input.funnelSlug, input.nextStepKey, {
    visitId: input.visitId,
    preview: input.preview,
    fromStepId: input.fromStepId,
    fromVariant: input.fromVariant,
  });
}
