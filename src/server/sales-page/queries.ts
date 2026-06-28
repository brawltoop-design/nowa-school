import {
  CourseStatus,
  OrderStatus,
  SalesPageAnalyticsEventType,
  SalesPageStatus,
  SalesPageSubmissionStatus,
  UserRole,
  type Prisma,
} from "@prisma/client";
import {
  coerceSalesPageObject,
  coerceSalesPageTheme,
  type SalesPageBlockContent,
  type SalesPageBlockDraft,
  type SalesPageBlockSettings,
  type SalesPageCourseContext,
  type SalesPageDraft,
} from "@/lib/sales-page";
import type { ModulePracticeInput } from "@/lib/module-practice";
import { coerceModulePractice } from "@/lib/module-practice";
import { getPrismaClient } from "@/server/db";

export type StudioActor = {
  userId: string;
  role: UserRole;
};

export type SalesPageAnalyticsSummary = {
  pageViews: number;
  uniqueVisitors: number;
  ctaClicks: number;
  checkoutClicks: number;
  purchases: number;
  viewToCheckoutConversion: number;
  checkoutToPurchaseConversion: number;
  totalSales: number;
  gmv: number;
  platformFee: number;
  authorRevenue: number;
  faqOpens: number;
  scrollDepth: {
    scroll25: number;
    scroll50: number;
    scroll75: number;
    scroll100: number;
  };
  viewsByDay: Array<{ date: string; count: number }>;
  clicksByDay: Array<{ date: string; count: number }>;
  purchasesByDay: Array<{ date: string; count: number }>;
  topTrafficSources: Array<{
    source: string;
    views: number;
    clicks: number;
    purchases: number;
  }>;
  topCtas: Array<{
    label: string;
    count: number;
  }>;
};

export type CourseStudioData = {
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
    status: CourseStatus;
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
      practice: ModulePracticeInput | null;
      order: number;
      lessons: Array<{
        id: string;
        title: string;
        description: string;
        order: number;
        durationMinutes: number;
        videoUrl: string | null;
        transcript: string | null;
        contentText: string;
        aiSummary: string | null;
        quiz: {
          title: string;
          questions: unknown;
        } | null;
        assignment: {
          title: string;
          description: string;
          rubric: unknown;
        } | null;
        checklist: {
          items: unknown;
        } | null;
        quest: {
          title: string;
          description: string;
          rewardPoints: number;
        } | null;
        hasQuiz: boolean;
        hasAssignment: boolean;
        hasChecklist: boolean;
        hasQuest: boolean;
      }>;
    }>;
    metrics: {
      moduleCount: number;
      lessonCount: number;
      studentCount: number;
      paidOrders: number;
      gmv: number;
    };
  };
  salesPage: SalesPageDraft | null;
  analytics: SalesPageAnalyticsSummary;
  moderation: {
    latestSubmission: {
      id: string;
      status: SalesPageSubmissionStatus;
      adminComment: string | null;
      createdAt: string;
      reviewedAt: string | null;
    } | null;
    openIssuesCount: number;
    latestIssues: Array<{
      id: string;
      type: string;
      severity: string;
      message: string;
      fieldPath: string | null;
      status: string;
    }>;
  };
};

export type AdminModerationQueueItem = {
  id: string;
  salesPageId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  pageStatus: SalesPageStatus;
  submissionStatus: SalesPageSubmissionStatus;
  submittedAt: Date | null;
  issuesCount: number;
  highSeverityIssuesCount: number;
};

export type AdminModerationDetail = {
  salesPage: SalesPageDraft;
  course: SalesPageCourseContext & {
    status: CourseStatus;
  };
  latestSubmission: {
    id: string;
    status: SalesPageSubmissionStatus;
    message: string | null;
    adminComment: string | null;
    createdAt: string;
    reviewedAt: string | null;
    reviewedBy: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  submissions: Array<{
    id: string;
    status: SalesPageSubmissionStatus;
    message: string | null;
    adminComment: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }>;
  issues: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    fieldPath: string | null;
    status: string;
    createdAt: string;
  }>;
};

function buildCourseAccessWhere(actor: StudioActor) {
  return actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId };
}

function decimalToNumber(value: Prisma.Decimal | number) {
  return Number(value);
}

function safeDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mapDayCounts(items: Map<string, number>) {
  return Array.from(items.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({ date, count }));
}

function getTrafficSource(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "direct";
  }

  const data = metadata as Record<string, unknown>;
  const candidates = [
    data.utm_source,
    data.ref,
    data.referrer,
    data.source,
  ];

  const value = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );

  return typeof value === "string" ? value.trim() : "direct";
}

function getCtaLabel(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "CTA";
  }

  const label = (metadata as Record<string, unknown>).label;
  return typeof label === "string" && label.trim() ? label.trim() : "CTA";
}

export function mapSalesPage(page: {
  id: string;
  courseId: string;
  slug: string;
  status: SalesPageStatus;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  theme: Prisma.JsonValue;
  publishedAt: Date | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  blocks: Array<{
    id: string;
    type: SalesPageBlockDraft["type"];
    order: number;
    title: string | null;
    subtitle: string | null;
    content: Prisma.JsonValue;
    settings: Prisma.JsonValue;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): SalesPageDraft {
  return {
    id: page.id,
    courseId: page.courseId,
    slug: page.slug,
    status: page.status,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    ogImage: page.ogImage,
    theme: coerceSalesPageTheme(page.theme),
    publishedAt: page.publishedAt?.toISOString() ?? null,
    submittedAt: page.submittedAt?.toISOString() ?? null,
    reviewedAt: page.reviewedAt?.toISOString() ?? null,
    reviewedById: page.reviewedById,
    rejectionReason: page.rejectionReason,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
    blocks: page.blocks
      .sort((left, right) => left.order - right.order)
      .map((block) => ({
        id: block.id,
        type: block.type,
        order: block.order,
        title: block.title,
        subtitle: block.subtitle,
        content: coerceSalesPageObject<SalesPageBlockContent>(block.content),
        settings: coerceSalesPageObject<SalesPageBlockSettings>(block.settings),
        isVisible: block.isVisible,
      })),
  };
}

export function mapCourseContext(course: {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  language: string;
  price: Prisma.Decimal;
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
      order: number;
    }>;
  }>;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
  }>;
}) {
  const orderedModules = course.modules
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      order: module.order,
      lessons: module.lessons
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          durationMinutes: lesson.durationMinutes,
          videoUrl: lesson.videoUrl,
          transcript: lesson.transcript,
          contentText: lesson.contentText,
          aiSummary: lesson.aiSummary,
        })),
    }));

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    language: course.language,
    price: decimalToNumber(course.price),
    currency: course.currency,
    coverUrl: course.coverUrl,
    aiEnhanced: course.aiEnhanced,
    author: course.author,
    modules: orderedModules,
    badges: course.badges,
  };
}

export function buildSalesPageAnalyticsSummary(input: {
  events: Array<{
    type: SalesPageAnalyticsEventType;
    visitorId: string | null;
    userId: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }>;
  paidOrders: Array<{
    amount: Prisma.Decimal;
    platformFee: Prisma.Decimal;
    authorRevenue: Prisma.Decimal;
    createdAt: Date;
  }>;
}) {
  const uniqueVisitorKeys = new Set<string>();
  const sourceStats = new Map<
    string,
    { views: number; clicks: number; purchases: number }
  >();
  const ctaStats = new Map<string, number>();
  const viewByDay = new Map<string, number>();
  const clickByDay = new Map<string, number>();
  const purchaseByDay = new Map<string, number>();

  let pageViews = 0;
  let ctaClicks = 0;
  let checkoutClicks = 0;
  let purchases = 0;
  let faqOpens = 0;
  let scroll25 = 0;
  let scroll50 = 0;
  let scroll75 = 0;
  let scroll100 = 0;

  for (const event of input.events) {
    const source = getTrafficSource(event.metadata);
    const dayKey = safeDateKey(event.createdAt);
    const sourceBucket = sourceStats.get(source) ?? {
      views: 0,
      clicks: 0,
      purchases: 0,
    };

    if (event.type === "PAGE_VIEW") {
      pageViews += 1;
      viewByDay.set(dayKey, (viewByDay.get(dayKey) ?? 0) + 1);
      sourceBucket.views += 1;
      uniqueVisitorKeys.add(event.userId ?? event.visitorId ?? `${source}:${dayKey}`);
    }

    if (event.type === "CTA_CLICK") {
      ctaClicks += 1;
      clickByDay.set(dayKey, (clickByDay.get(dayKey) ?? 0) + 1);
      sourceBucket.clicks += 1;
      const label = getCtaLabel(event.metadata);
      ctaStats.set(label, (ctaStats.get(label) ?? 0) + 1);
    }

    if (event.type === "CHECKOUT_CLICK") {
      checkoutClicks += 1;
      clickByDay.set(dayKey, (clickByDay.get(dayKey) ?? 0) + 1);
      sourceBucket.clicks += 1;
    }

    if (event.type === "PURCHASE") {
      purchases += 1;
      purchaseByDay.set(dayKey, (purchaseByDay.get(dayKey) ?? 0) + 1);
      sourceBucket.purchases += 1;
    }

    if (event.type === "FAQ_OPEN") {
      faqOpens += 1;
    }

    if (event.type === "SCROLL_25") scroll25 += 1;
    if (event.type === "SCROLL_50") scroll50 += 1;
    if (event.type === "SCROLL_75") scroll75 += 1;
    if (event.type === "SCROLL_100") scroll100 += 1;

    sourceStats.set(source, sourceBucket);
  }

  const paidPurchasesByDay = input.paidOrders.reduce((acc, order) => {
    const key = safeDateKey(order.createdAt);
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  return {
    pageViews,
    uniqueVisitors: uniqueVisitorKeys.size,
    ctaClicks,
    checkoutClicks,
    purchases: purchases || input.paidOrders.length,
    viewToCheckoutConversion:
      pageViews > 0 ? Number(((checkoutClicks / pageViews) * 100).toFixed(1)) : 0,
    checkoutToPurchaseConversion:
      checkoutClicks > 0
        ? Number((((purchases || input.paidOrders.length) / checkoutClicks) * 100).toFixed(1))
        : 0,
    totalSales: input.paidOrders.length,
    gmv: input.paidOrders.reduce(
      (sum, order) => sum + decimalToNumber(order.amount),
      0,
    ),
    platformFee: input.paidOrders.reduce(
      (sum, order) => sum + decimalToNumber(order.platformFee),
      0,
    ),
    authorRevenue: input.paidOrders.reduce(
      (sum, order) => sum + decimalToNumber(order.authorRevenue),
      0,
    ),
    faqOpens,
    scrollDepth: {
      scroll25,
      scroll50,
      scroll75,
      scroll100,
    },
    viewsByDay: mapDayCounts(viewByDay),
    clicksByDay: mapDayCounts(clickByDay),
    purchasesByDay: mapDayCounts(purchases ? purchaseByDay : paidPurchasesByDay),
    topTrafficSources: Array.from(sourceStats.entries())
      .map(([source, value]) => ({
        source,
        views: value.views,
        clicks: value.clicks,
        purchases: value.purchases,
      }))
      .sort((left, right) => right.views - left.views)
      .slice(0, 8),
    topCtas: Array.from(ctaStats.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
  } satisfies SalesPageAnalyticsSummary;
}

export async function getCourseStudioData(
  courseId: string,
  actor: StudioActor,
): Promise<
  | { status: "ok"; data: CourseStudioData }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  const prisma = getPrismaClient();
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...buildCourseAccessWhere(actor),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      badges: {
        where: {
          certificateId: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
        },
      },
      modules: {
        include: {
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
              quiz: {
                select: {
                  id: true,
                  title: true,
                  questions: true,
                },
              },
              assignment: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  rubric: true,
                },
              },
              checklist: {
                select: {
                  id: true,
                  items: true,
                },
              },
              quest: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  rewardPoints: true,
                },
              },
              order: true,
            },
          },
        },
        orderBy: [{ order: "asc" }],
      },
      enrollments: {
        select: {
          id: true,
        },
      },
      orders: {
        where: {
          status: OrderStatus.PAID,
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      },
      salesPage: {
        include: {
          blocks: {
            orderBy: [{ order: "asc" }],
          },
          submissions: {
            orderBy: [{ createdAt: "desc" }],
            take: 1,
          },
          issues: {
            orderBy: [{ createdAt: "desc" }],
            take: 8,
          },
          events: {
            orderBy: [{ createdAt: "desc" }],
            take: 1000,
          },
        },
      },
    },
  });

  if (!course) {
    const exists = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    return exists ? { status: "forbidden" } : { status: "not_found" };
  }

  const lessonCount = course.modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0,
  );

  const salesPage = course.salesPage ? mapSalesPage(course.salesPage) : null;
  const analytics = buildSalesPageAnalyticsSummary({
    events:
      course.salesPage?.events.map((event) => ({
        type: event.type,
        visitorId: event.visitorId,
        userId: event.userId,
        metadata: event.metadata,
        createdAt: event.createdAt,
      })) ?? [],
    paidOrders: await prisma.order.findMany({
      where: {
        courseId: course.id,
        status: OrderStatus.PAID,
      },
      select: {
        amount: true,
        platformFee: true,
        authorRevenue: true,
        createdAt: true,
      },
    }),
  });

  return {
    status: "ok",
    data: {
      course: {
        ...mapCourseContext(course),
        status: course.status,
        modules: course.modules.map((module) => ({
          id: module.id,
          title: module.title,
          description: module.description,
          practice: module.practice
            ? coerceModulePractice(module.practice, module.title)
            : null,
          order: module.order,
          lessons: module.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            order: lesson.order,
            durationMinutes: lesson.durationMinutes,
            videoUrl: lesson.videoUrl,
            transcript: lesson.transcript,
            contentText: lesson.contentText,
            aiSummary: lesson.aiSummary,
            quiz: lesson.quiz
              ? {
                  title: lesson.quiz.title,
                  questions: lesson.quiz.questions,
                }
              : null,
            assignment: lesson.assignment
              ? {
                  title: lesson.assignment.title,
                  description: lesson.assignment.description,
                  rubric: lesson.assignment.rubric,
                }
              : null,
            checklist: lesson.checklist
              ? {
                  items: lesson.checklist.items,
                }
              : null,
            quest: lesson.quest
              ? {
                  title: lesson.quest.title,
                  description: lesson.quest.description,
                  rewardPoints: lesson.quest.rewardPoints,
                }
              : null,
            hasQuiz: Boolean(lesson.quiz),
            hasAssignment: Boolean(lesson.assignment),
            hasChecklist: Boolean(lesson.checklist),
            hasQuest: Boolean(lesson.quest),
          })),
        })),
        metrics: {
          moduleCount: course.modules.length,
          lessonCount,
          studentCount: course.enrollments.length,
          paidOrders: course.orders.length,
          gmv: course.orders.reduce(
            (sum, order) => sum + decimalToNumber(order.amount),
            0,
          ),
        },
      },
      salesPage,
      analytics,
      moderation: {
        latestSubmission: course.salesPage?.submissions[0]
          ? {
              id: course.salesPage.submissions[0].id,
              status: course.salesPage.submissions[0].status,
              adminComment: course.salesPage.submissions[0].adminComment,
              createdAt: course.salesPage.submissions[0].createdAt.toISOString(),
              reviewedAt:
                course.salesPage.submissions[0].reviewedAt?.toISOString() ?? null,
            }
          : null,
        openIssuesCount:
          course.salesPage?.issues.filter((issue) => issue.status === "OPEN").length ?? 0,
        latestIssues:
          course.salesPage?.issues.map((issue) => ({
            id: issue.id,
            type: issue.type,
            severity: issue.severity,
            message: issue.message,
            fieldPath: issue.fieldPath,
            status: issue.status,
          })) ?? [],
      },
    },
  };
}

export async function getAdminModerationQueue(): Promise<AdminModerationQueueItem[]> {
  const prisma = getPrismaClient();
  const pages = await prisma.courseSalesPage.findMany({
    where: {
      status: {
        in: [SalesPageStatus.PENDING_REVIEW, SalesPageStatus.REJECTED, SalesPageStatus.APPROVED],
      },
    },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      submissions: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
      },
      issues: {
        where: {
          status: "OPEN",
        },
        select: {
          severity: true,
        },
      },
    },
  });

  return pages
    .filter((page) => page.submissions[0])
    .map((page) => ({
      id: page.submissions[0]!.id,
      salesPageId: page.id,
      courseId: page.course.id,
      courseTitle: page.course.title,
      courseSlug: page.course.slug,
      author: page.course.author,
      pageStatus: page.status,
      submissionStatus: page.submissions[0]!.status,
      submittedAt: page.submittedAt,
      issuesCount: page.issues.length,
      highSeverityIssuesCount: page.issues.filter((issue) => issue.severity === "HIGH").length,
    }));
}

export async function getAdminModerationDetail(
  salesPageId: string,
): Promise<AdminModerationDetail | null> {
  const prisma = getPrismaClient();
  const page = await prisma.courseSalesPage.findUnique({
    where: {
      id: salesPageId,
    },
    include: {
      course: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          badges: {
            where: {
              certificateId: null,
            },
            select: {
              id: true,
              title: true,
              description: true,
              icon: true,
            },
          },
          modules: {
            include: {
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
            orderBy: [{ order: "asc" }],
          },
        },
      },
      blocks: {
        orderBy: [{ order: "asc" }],
      },
      submissions: {
        orderBy: [{ createdAt: "desc" }],
        include: {
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      issues: {
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!page) {
    return null;
  }

  return {
    salesPage: mapSalesPage(page),
    course: {
      ...mapCourseContext(page.course),
      status: page.course.status,
    },
    latestSubmission: page.submissions[0]
      ? {
          id: page.submissions[0].id,
          status: page.submissions[0].status,
          message: page.submissions[0].message,
          adminComment: page.submissions[0].adminComment,
          createdAt: page.submissions[0].createdAt.toISOString(),
          reviewedAt: page.submissions[0].reviewedAt?.toISOString() ?? null,
          reviewedBy: page.submissions[0].reviewedBy,
        }
      : null,
    submissions: page.submissions.map((submission) => ({
      id: submission.id,
      status: submission.status,
      message: submission.message,
      adminComment: submission.adminComment,
      createdAt: submission.createdAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    })),
    issues: page.issues.map((issue) => ({
      id: issue.id,
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
      fieldPath: issue.fieldPath,
      status: issue.status,
      createdAt: issue.createdAt.toISOString(),
    })),
  };
}
