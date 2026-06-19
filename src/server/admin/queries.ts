import {
  CourseStatus,
  OrderStatus,
  SalesPageStatus,
  SalesPageSubmissionStatus,
  UserRole,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/server/db";

export type AdminDashboardOrder = {
  id: string;
  amount: number;
  platformFee: number;
  authorRevenue: number;
  status: OrderStatus;
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
    status: CourseStatus;
  };
  author: {
    name: string;
    email: string;
  };
};

export type AdminDashboardUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

export type AdminDashboardData = {
  metrics: {
    totalUsers: number;
    totalAuthors: number;
    totalStudents: number;
    totalCourses: number;
    publishedCourses: number;
    blockedCourses: number;
    gmv: number;
    platformRevenue: number;
    authorPayouts: number;
    paidOrders: number;
  };
  recentOrders: AdminDashboardOrder[];
  recentUsers: AdminDashboardUser[];
};

export type AdminCourseFilters = {
  query?: string;
  status?: CourseStatus | "ALL";
};

export type AdminCourseRow = {
  id: string;
  salesPageId: string | null;
  title: string;
  slug: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  status: CourseStatus;
  price: number;
  currency: string;
  createdAt: Date;
  salesCount: number;
  revenue: number;
  salesPageStatus: SalesPageStatus | null;
  moderationStatus: SalesPageSubmissionStatus | null;
  pageViews: number;
  purchases: number;
};

export type AdminUserFilters = {
  query?: string;
  role?: UserRole | "ALL";
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  authoredCoursesCount: number;
  enrollmentsCount: number;
};

export type AdminOrderFilters = {
  query?: string;
  status?: OrderStatus | "ALL";
};

export type AdminOrderRow = {
  id: string;
  user: {
    name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    slug: string;
  };
  amount: number;
  platformFee: number;
  authorRevenue: number;
  currency: string;
  status: OrderStatus;
  paymentProvider: string | null;
  paymentId: string | null;
  createdAt: Date;
};

function decimalToNumber(value: Prisma.Decimal | number) {
  return Number(value);
}

function normalizeQuery(value?: string) {
  const query = value?.trim();
  return query ? query : undefined;
}

function mapOrderToDashboardOrder(order: {
  id: string;
  amount: Prisma.Decimal;
  platformFee: Prisma.Decimal;
  authorRevenue: Prisma.Decimal;
  status: OrderStatus;
  paymentProvider: string | null;
  paymentId: string | null;
  createdAt: Date;
  user: {
    name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    slug: string;
    status: CourseStatus;
    author: {
      name: string;
      email: string;
    };
  };
}): AdminDashboardOrder {
  return {
    id: order.id,
    amount: decimalToNumber(order.amount),
    platformFee: decimalToNumber(order.platformFee),
    authorRevenue: decimalToNumber(order.authorRevenue),
    status: order.status,
    paymentProvider: order.paymentProvider,
    paymentId: order.paymentId,
    createdAt: order.createdAt,
    buyer: {
      name: order.user.name,
      email: order.user.email,
    },
    course: {
      id: order.course.id,
      title: order.course.title,
      slug: order.course.slug,
      status: order.course.status,
    },
    author: order.course.author,
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const prisma = getPrismaClient();

  const [
    totalUsers,
    totalAuthors,
    totalStudents,
    totalCourses,
    publishedCourses,
    blockedCourses,
    paidOrders,
    recentOrders,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.AUTHOR } }),
    prisma.user.count({ where: { role: UserRole.STUDENT } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
    prisma.course.count({ where: { status: CourseStatus.BLOCKED } }),
    prisma.order.findMany({
      where: { status: OrderStatus.PAID },
      select: {
        amount: true,
        platformFee: true,
        authorRevenue: true,
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
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
            status: true,
            author: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    metrics: {
      totalUsers,
      totalAuthors,
      totalStudents,
      totalCourses,
      publishedCourses,
      blockedCourses,
      gmv: paidOrders.reduce((sum, order) => sum + decimalToNumber(order.amount), 0),
      platformRevenue: paidOrders.reduce(
        (sum, order) => sum + decimalToNumber(order.platformFee),
        0,
      ),
      authorPayouts: paidOrders.reduce(
        (sum, order) => sum + decimalToNumber(order.authorRevenue),
        0,
      ),
      paidOrders: paidOrders.length,
    },
    recentOrders: recentOrders.map(mapOrderToDashboardOrder),
    recentUsers,
  };
}

export async function getAdminCourses(
  filters: AdminCourseFilters = {},
): Promise<AdminCourseRow[]> {
  const prisma = getPrismaClient();
  const query = normalizeQuery(filters.query);

  const courses = await prisma.course.findMany({
    where: {
      ...(filters.status && filters.status !== "ALL"
        ? { status: filters.status }
        : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
              {
                author: {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      orders: {
        where: { status: OrderStatus.PAID },
        select: {
          amount: true,
        },
      },
      salesPage: {
        select: {
          id: true,
          status: true,
          submissions: {
            orderBy: [{ createdAt: "desc" }],
            take: 1,
            select: {
              status: true,
            },
          },
          events: {
            select: {
              type: true,
            },
          },
        },
      },
    },
  });

  return courses.map((course) => ({
    id: course.id,
    salesPageId: course.salesPage?.id ?? null,
    title: course.title,
    slug: course.slug,
    author: course.author,
    status: course.status,
    price: decimalToNumber(course.price),
    currency: course.currency,
    createdAt: course.createdAt,
    salesCount: course.orders.length,
    revenue: course.orders.reduce(
      (sum, order) => sum + decimalToNumber(order.amount),
      0,
    ),
    salesPageStatus: course.salesPage?.status ?? null,
    moderationStatus: course.salesPage?.submissions[0]?.status ?? null,
    pageViews:
      course.salesPage?.events.filter((event) => event.type === "PAGE_VIEW").length ??
      0,
    purchases:
      course.salesPage?.events.filter((event) => event.type === "PURCHASE").length ??
      course.orders.length,
  }));
}

export async function getAdminUsers(
  filters: AdminUserFilters = {},
): Promise<AdminUserRow[]> {
  const prisma = getPrismaClient();
  const query = normalizeQuery(filters.query);

  const users = await prisma.user.findMany({
    where: {
      ...(filters.role && filters.role !== "ALL" ? { role: filters.role } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          authoredCourses: true,
          enrollments: true,
        },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    authoredCoursesCount: user._count.authoredCourses,
    enrollmentsCount: user._count.enrollments,
  }));
}

export async function getAdminOrders(
  filters: AdminOrderFilters = {},
): Promise<AdminOrderRow[]> {
  const prisma = getPrismaClient();
  const query = normalizeQuery(filters.query);

  const orders = await prisma.order.findMany({
    where: {
      ...(filters.status && filters.status !== "ALL"
        ? { status: filters.status }
        : {}),
      ...(query
        ? {
            OR: [
              { user: { name: { contains: query, mode: "insensitive" } } },
              { user: { email: { contains: query, mode: "insensitive" } } },
              { course: { title: { contains: query, mode: "insensitive" } } },
              { paymentId: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
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
          currency: true,
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    user: order.user,
    course: {
      id: order.course.id,
      title: order.course.title,
      slug: order.course.slug,
    },
    amount: decimalToNumber(order.amount),
    platformFee: decimalToNumber(order.platformFee),
    authorRevenue: decimalToNumber(order.authorRevenue),
    currency: order.course.currency,
    status: order.status,
    paymentProvider: order.paymentProvider,
    paymentId: order.paymentId,
    createdAt: order.createdAt,
  }));
}
