import { CourseStatus, Prisma, SalesPageStatus } from "@prisma/client";
import {
  coerceSalesPageObject,
  coerceSalesPageTheme,
  extractSalesPageHero,
  type SalesPageBlockContent,
  type SalesPageBlockDraft,
  type SalesPageBlockSettings,
  type SalesPageDraft,
} from "@/lib/sales-page";
import { getPrismaClient } from "@/server/db";

export type CourseCatalogSort = "price-asc" | "price-desc";

export type CourseCatalogFilters = {
  q?: string;
  category?: string;
  level?: string;
  sort?: CourseCatalogSort;
};

export type PublicCourseCardData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  coverUrl: string | null;
  price: number;
  currency: string;
  aiEnhanced: boolean;
  authorName: string;
  lessonCount: number;
  studentCount: number;
  reviewCount: number;
  averageRating: number | null;
  salesPageStatus: SalesPageStatus | null;
  heroBadges: string[];
};

export type PublicCourseDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  language: string;
  coverUrl: string | null;
  price: number;
  currency: string;
  aiEnhanced: boolean;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
  }>;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    order: number;
    lessons: Array<{
      id: string;
      title: string;
      description: string;
      order: number;
      durationMinutes: number;
    }>;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    text: string;
    createdAt: Date;
    user: {
      name: string;
      avatarUrl: string | null;
    };
  }>;
  metrics: {
    lessonCount: number;
    moduleCount: number;
    durationMinutes: number;
    studentCount: number;
    reviewCount: number;
    averageRating: number | null;
  };
  viewer: {
    isEnrolled: boolean;
  };
  salesPage: SalesPageDraft | null;
};

function normalizeFilterValue(value?: string) {
  return value && value !== "all" ? value : undefined;
}

function buildCatalogWhere(filters: CourseCatalogFilters): Prisma.CourseWhereInput {
  const q = normalizeFilterValue(filters.q)?.trim();
  const category = normalizeFilterValue(filters.category);
  const level = normalizeFilterValue(filters.level);

  return {
    status: CourseStatus.PUBLISHED,
    OR: [
      {
        salesPage: {
          is: null,
        },
      },
      {
        salesPage: {
          is: {
            status: SalesPageStatus.PUBLISHED,
          },
        },
      },
    ],
    ...(q
      ? {
          title: {
            contains: q,
            mode: "insensitive",
          },
        }
      : {}),
    ...(category ? { category } : {}),
    ...(level ? { level } : {}),
  };
}

function mapSalesPage(page: {
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
    blocks: page.blocks.map((block) => ({
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

export async function getPublicPlatformStats() {
  const prisma = getPrismaClient();

  const [publishedCourses, authors, enrollments, lessons] = await Promise.all([
    prisma.course.count({
      where: { status: CourseStatus.PUBLISHED },
    }),
    prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      distinct: ["authorId"],
      select: { authorId: true },
    }),
    prisma.enrollment.count({
      where: {
        course: {
          status: CourseStatus.PUBLISHED,
        },
      },
    }),
    prisma.lesson.count({
      where: {
        module: {
          course: {
            status: CourseStatus.PUBLISHED,
          },
        },
      },
    }),
  ]);

  return {
    publishedCourses,
    authors: authors.length,
    enrollments,
    lessons,
  };
}

export async function getCourseCatalogOptions() {
  const prisma = getPrismaClient();

  const [categories, levels] = await Promise.all([
    prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    }),
    prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      distinct: ["level"],
      orderBy: { level: "asc" },
      select: { level: true },
    }),
  ]);

  return {
    categories: categories.map((item) => item.category),
    levels: levels.map((item) => item.level),
  };
}

export async function getPublishedCourses(filters: CourseCatalogFilters) {
  const prisma = getPrismaClient();
  const where = buildCatalogWhere(filters);
  const sort = filters.sort === "price-desc" ? "desc" : "asc";

  const courses = await prisma.course.findMany({
    where,
    orderBy: { price: sort },
    include: {
      salesPage: {
        include: {
          blocks: {
            orderBy: [{ order: "asc" }],
          },
        },
      },
      author: {
        select: {
          name: true,
        },
      },
      enrollments: {
        select: {
          id: true,
        },
      },
      reviews: {
        select: {
          rating: true,
        },
      },
      modules: {
        select: {
          _count: {
            select: {
              lessons: true,
            },
          },
        },
      },
    },
  });

  const mappedCourses: PublicCourseCardData[] = courses.map((course) => {
    const salesPage = course.salesPage ? mapSalesPage(course.salesPage) : null;
    const hero = salesPage ? extractSalesPageHero(salesPage.blocks) : null;
    const lessonCount = course.modules.reduce(
      (sum, module) => sum + module._count.lessons,
      0,
    );
    const reviewAverage = course.reviews.length
      ? course.reviews.reduce((sum, review) => sum + review.rating, 0) /
        course.reviews.length
      : null;

    return {
      id: course.id,
      slug: course.slug,
      title: hero?.headline || course.title,
      description: hero?.subheadline || course.description,
      category: course.category,
      level: course.level,
      coverUrl: hero?.coverImage || course.coverUrl,
      price: Number(course.price),
      currency: course.currency,
      aiEnhanced: course.aiEnhanced,
      authorName: course.author.name,
      lessonCount,
      studentCount: course.enrollments.length,
      reviewCount: course.reviews.length,
      averageRating: reviewAverage,
      salesPageStatus: course.salesPage?.status ?? null,
      heroBadges: hero?.badges ?? [],
    };
  });

  return {
    courses: mappedCourses,
    total: mappedCourses.length,
  };
}

export async function getPublishedCourseBySlug(
  slug: string,
  userId?: string,
): Promise<PublicCourseDetail | null> {
  const prisma = getPrismaClient();

  const course = await prisma.course.findFirst({
    where: {
      slug,
      status: CourseStatus.PUBLISHED,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      badges: {
        orderBy: {
          title: "asc",
        },
      },
      salesPage: {
        include: {
          blocks: {
            orderBy: [{ order: "asc" }],
          },
        },
      },
      modules: {
        orderBy: {
          order: "asc",
        },
        include: {
          lessons: {
            orderBy: {
              order: "asc",
            },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              durationMinutes: true,
            },
          },
        },
      },
      reviews: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
      enrollments: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!course) {
    return null;
  }

  const lessonCount = course.modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0,
  );
  const durationMinutes = course.modules.reduce(
    (sum, module) =>
      sum +
      module.lessons.reduce(
        (lessonSum, lesson) => lessonSum + lesson.durationMinutes,
        0,
      ),
    0,
  );
  const averageRating = course.reviews.length
    ? course.reviews.reduce((sum, review) => sum + review.rating, 0) /
      course.reviews.length
    : null;

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    language: course.language,
    coverUrl: course.coverUrl,
    price: Number(course.price),
    currency: course.currency,
    aiEnhanced: course.aiEnhanced,
    createdAt: course.createdAt,
    author: course.author,
    badges: course.badges,
    modules: course.modules,
    reviews: course.reviews,
    metrics: {
      lessonCount,
      moduleCount: course.modules.length,
      durationMinutes,
      studentCount: course.enrollments.length,
      reviewCount: course.reviews.length,
      averageRating,
    },
    viewer: {
      isEnrolled: userId
        ? course.enrollments.some((enrollment) => enrollment.userId === userId)
        : false,
    },
    salesPage: course.salesPage ? mapSalesPage(course.salesPage) : null,
  };
}
