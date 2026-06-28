import {
  CourseStatus,
  OrderStatus,
  SalesPageStatus,
  UserRole,
} from "@prisma/client";
import type { LessonMaterial } from "@/lib/lesson-materials";
import { parseLessonMaterials } from "@/lib/lesson-materials";
import type { ModulePracticeInput } from "@/lib/module-practice";
import { coerceModulePractice } from "@/lib/module-practice";
import { getPrismaClient } from "@/server/db";

export type AuthorActor = {
  userId: string;
  role: UserRole;
};

export type AuthorDashboardCourse = {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  category: string;
  level: string;
  coverUrl: string | null;
  price: number;
  currency: string;
  lessonCount: number;
  studentCount: number;
  paidOrders: number;
  gmv: number;
  authorRevenue: number;
  salesPageStatus: SalesPageStatus | null;
  pageViews: number;
  checkoutClicks: number;
  purchases: number;
  conversionRate: number;
  pendingModeration: boolean;
  updatedAt: Date;
};

export type AuthorDashboardSale = {
  id: string;
  status: OrderStatus;
  amount: number;
  platformFee: number;
  authorRevenue: number;
  paymentProvider: string | null;
  paymentId: string | null;
  createdAt: Date;
  buyer: {
    name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    slug: string;
  };
};

export type AuthorDashboardData = {
  metrics: {
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalStudents: number;
    gmv: number;
    platformFee: number;
    authorRevenue: number;
    salesPageViews: number;
    salesPagePendingReview: number;
    publishedSalesPages: number;
  };
  recentSales: AuthorDashboardSale[];
  courses: AuthorDashboardCourse[];
};

export type AuthorBuilderLesson = {
  id: string;
  title: string;
  description: string;
  videoUrl: string | null;
  contentText: string;
  transcript: string | null;
  materials: LessonMaterial[];
  aiSummary: string | null;
  durationMinutes: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthorBuilderModule = {
  id: string;
  title: string;
  description: string;
  practice: ModulePracticeInput | null;
  order: number;
  lessons: AuthorBuilderLesson[];
};

export type AuthorBuilderCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  coverUrl: string | null;
  level: string;
  language: string;
  status: CourseStatus;
  author: {
    id: string;
    name: string;
    email: string;
  };
  metrics: {
    moduleCount: number;
    lessonCount: number;
    studentCount: number;
    paidOrders: number;
    gmv: number;
  };
  modules: AuthorBuilderModule[];
};

export type AuthorCourseStudioShellData = {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  category: string;
  level: string;
  salesPageStatus: SalesPageStatus | null;
  metrics: {
    moduleCount: number;
    lessonCount: number;
  };
};

function buildCourseAccessWhere(actor: AuthorActor) {
  return actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId };
}

export async function getAuthorCourseStudioShellData(
  courseId: string,
  actor: AuthorActor,
): Promise<
  | { status: "ok"; data: AuthorCourseStudioShellData }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  const prisma = getPrismaClient();
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...buildCourseAccessWhere(actor),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      category: true,
      level: true,
      modules: {
        select: {
          _count: {
            select: {
              lessons: true,
            },
          },
        },
      },
      salesPage: {
        select: {
          status: true,
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

  return {
    status: "ok",
    data: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      status: course.status,
      category: course.category,
      level: course.level,
      salesPageStatus: course.salesPage?.status ?? null,
      metrics: {
        moduleCount: course.modules.length,
        lessonCount: course.modules.reduce(
          (sum, module) => sum + module._count.lessons,
          0,
        ),
      },
    },
  };
}

export async function getAuthorDashboardData(
  actor: AuthorActor,
): Promise<AuthorDashboardData> {
  const prisma = getPrismaClient();
  const courseWhere = buildCourseAccessWhere(actor);

  const [courses, recentSales, platformEvents] = await Promise.all([
    prisma.course.findMany({
      where: courseWhere,
      orderBy: [{ updatedAt: "desc" }],
      include: {
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
            amount: true,
            authorRevenue: true,
            platformFee: true,
            id: true,
          },
        },
        modules: {
          include: {
            _count: {
              select: {
                lessons: true,
              },
            },
          },
        },
        salesPage: {
          select: {
            status: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        course: courseWhere,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 8,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    }),
    prisma.event.findMany({
      where: actor.role === UserRole.ADMIN ? {} : { ownerId: actor.userId },
      select: {
        courseId: true,
        source: true,
        name: true,
      },
    }),
  ]);

  const mappedCourses: AuthorDashboardCourse[] = courses.map((course) => {
    const courseEvents = platformEvents.filter((event) => event.courseId === course.id);
    const lessonCount = course.modules.reduce(
      (sum, module) => sum + module._count.lessons,
      0,
    );
    const gmv = course.orders.reduce(
      (sum, order) => sum + Number(order.amount),
      0,
    );
    const authorRevenue = course.orders.reduce(
      (sum, order) => sum + Number(order.authorRevenue),
      0,
    );
    const pageViews = courseEvents.filter(
      (event) => event.source === "sales_page" && event.name === "page_view",
    ).length;
    const checkoutClicks = courseEvents.filter(
      (event) =>
        (event.source === "sales_page" && event.name === "checkout_click") ||
        (event.source === "billing" && event.name === "checkout_start"),
    ).length;
    const purchases = courseEvents.filter(
      (event) => event.source === "billing" && event.name === "payment_succeeded",
    ).length || course.orders.length;

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      status: course.status,
      category: course.category,
      level: course.level,
      coverUrl: course.coverUrl,
      price: Number(course.price),
      currency: course.currency,
      lessonCount,
      studentCount: course.enrollments.length,
      paidOrders: course.orders.length,
      gmv,
      authorRevenue,
      salesPageStatus: course.salesPage?.status ?? null,
      pageViews,
      checkoutClicks,
      purchases,
      conversionRate:
        pageViews > 0 ? Number(((checkoutClicks / pageViews) * 100).toFixed(1)) : 0,
      pendingModeration: course.salesPage?.status === SalesPageStatus.PENDING_REVIEW,
      updatedAt: course.updatedAt,
    };
  });

  return {
    metrics: {
      totalCourses: mappedCourses.length,
      publishedCourses: mappedCourses.filter(
        (course) => course.status === CourseStatus.PUBLISHED,
      ).length,
      draftCourses: mappedCourses.filter(
        (course) => course.status === CourseStatus.DRAFT,
      ).length,
      totalStudents: mappedCourses.reduce(
        (sum, course) => sum + course.studentCount,
        0,
      ),
      gmv: mappedCourses.reduce((sum, course) => sum + course.gmv, 0),
      platformFee: courses.reduce(
        (sum, course) =>
          sum +
          course.orders.reduce(
            (orderSum, order) => orderSum + Number(order.platformFee),
            0,
          ),
        0,
      ),
      authorRevenue: mappedCourses.reduce(
        (sum, course) => sum + course.authorRevenue,
        0,
      ),
      salesPageViews: mappedCourses.reduce(
        (sum, course) => sum + course.pageViews,
        0,
      ),
      salesPagePendingReview: mappedCourses.filter(
        (course) => course.pendingModeration,
      ).length,
      publishedSalesPages: mappedCourses.filter(
        (course) => course.salesPageStatus === SalesPageStatus.PUBLISHED,
      ).length,
    },
    recentSales: recentSales.map((sale) => ({
      id: sale.id,
      status: sale.status,
      amount: Number(sale.amount),
      platformFee: Number(sale.platformFee),
      authorRevenue: Number(sale.authorRevenue),
      paymentProvider: sale.paymentProvider,
      paymentId: sale.paymentId,
      createdAt: sale.createdAt,
      buyer: {
        name: sale.user.name,
        email: sale.user.email,
      },
      course: sale.course,
    })),
    courses: mappedCourses,
  };
}

export async function getAuthorCourseBuilderData(
  courseId: string,
  actor: AuthorActor,
): Promise<
  | { status: "ok"; course: AuthorBuilderCourse }
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
        },
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
        },
      },
      modules: {
        orderBy: [{ order: "asc" }],
        include: {
          lessons: {
            orderBy: [{ order: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              videoUrl: true,
              contentText: true,
              transcript: true,
              materials: true,
              aiSummary: true,
              durationMinutes: true,
              order: true,
              createdAt: true,
              updatedAt: true,
            },
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

  return {
    status: "ok",
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      category: course.category,
      price: Number(course.price),
      currency: course.currency,
      coverUrl: course.coverUrl,
      level: course.level,
      language: course.language,
      status: course.status,
      author: course.author,
      metrics: {
        moduleCount: course.modules.length,
        lessonCount,
        studentCount: course.enrollments.length,
        paidOrders: course.orders.length,
        gmv: course.orders.reduce(
          (sum, order) => sum + Number(order.amount),
          0,
        ),
      },
      modules: course.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        practice: module.practice
          ? coerceModulePractice(module.practice, module.title)
          : null,
        order: module.order,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,
          materials: parseLessonMaterials(lesson.materials),
        })),
      })),
    },
  };
}
