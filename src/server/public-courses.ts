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

const publicPreviewFallbackCourses: PublicCourseDetail[] = [
  {
    id: "fallback-course-ai-systems",
    slug: "ai-course-systems",
    title: "AI Course Systems",
    description:
      "Собери сильную AI-образовательную систему: оффер, программу, сценарий уроков, вовлечение и аккуратную упаковку без хаоса.",
    category: "AI",
    level: "Intermediate",
    language: "Русский",
    coverUrl: null,
    price: 349,
    currency: "USD",
    aiEnhanced: true,
    createdAt: new Date("2026-05-10T09:00:00.000Z"),
    author: {
      id: "fallback-author-nika",
      name: "Nika Petrova",
      avatarUrl: null,
    },
    badges: [
      {
        id: "fallback-badge-ai-1",
        title: "AI-enhanced",
        description: "Программа усилена AI-выжимками, заданиями и помощником.",
        icon: "sparkles",
      },
      {
        id: "fallback-badge-ai-2",
        title: "Практический спринт",
        description: "Каждый модуль заканчивается практикой и проектным шагом.",
        icon: "target",
      },
    ],
    modules: [
      {
        id: "fallback-module-ai-1",
        title: "Архитектура курса",
        description: "Оффер, результат, структура и логика спринтов.",
        order: 1,
        lessons: [
          {
            id: "fallback-lesson-ai-1",
            title: "Как собрать курс вокруг результата",
            description: "Определяем outcome, promise и учебный маршрут.",
            order: 1,
            durationMinutes: 18,
          },
          {
            id: "fallback-lesson-ai-2",
            title: "Программа без лишней воды",
            description: "Собираем модули так, чтобы ученик видел прогресс.",
            order: 2,
            durationMinutes: 22,
          },
          {
            id: "fallback-lesson-ai-3",
            title: "AI-усиление уроков",
            description: "Где AI реально помогает в обучающем продукте.",
            order: 3,
            durationMinutes: 20,
          },
        ],
      },
      {
        id: "fallback-module-ai-2",
        title: "Вовлечение и удержание",
        description: "Домашки, квесты, прогресс и AI-наставник.",
        order: 2,
        lessons: [
          {
            id: "fallback-lesson-ai-4",
            title: "Геймификация без перегруза",
            description: "Бейджи, points и streak как часть premium UX.",
            order: 1,
            durationMinutes: 17,
          },
          {
            id: "fallback-lesson-ai-5",
            title: "AI-наставник в курсе",
            description: "Как ограничить ответы материалами курса и не галлюцинировать.",
            order: 2,
            durationMinutes: 24,
          },
          {
            id: "fallback-lesson-ai-6",
            title: "Финальная упаковка витрины",
            description: "Как превратить курс в продукт, который хочется купить.",
            order: 3,
            durationMinutes: 21,
          },
        ],
      },
    ],
    reviews: [
      {
        id: "fallback-review-ai-1",
        rating: 5,
        text: "Наконец увидел, как из набора уроков собрать настоящий AI-продукт для учеников.",
        createdAt: new Date("2026-05-21T13:00:00.000Z"),
        user: {
          name: "Artem Sidorov",
          avatarUrl: null,
        },
      },
    ],
    metrics: {
      lessonCount: 6,
      moduleCount: 2,
      durationMinutes: 122,
      studentCount: 38,
      reviewCount: 1,
      averageRating: 5,
    },
    viewer: {
      isEnrolled: false,
    },
    salesPage: null,
  },
  {
    id: "fallback-course-designing-cohorts",
    slug: "designing-signature-cohorts",
    title: "Designing Signature Cohorts",
    description:
      "Курс про то, как проектировать сильные когорты, ритм обучения и дорогой ученический опыт для дизайнерских и creator-программ.",
    category: "Design",
    level: "Advanced Beginner",
    language: "Русский",
    coverUrl: null,
    price: 289,
    currency: "USD",
    aiEnhanced: true,
    createdAt: new Date("2026-05-18T09:00:00.000Z"),
    author: {
      id: "fallback-author-marco",
      name: "Marco Lee",
      avatarUrl: null,
    },
    badges: [
      {
        id: "fallback-badge-design-1",
        title: "Marketplace-ready",
        description: "Курс упакован как премиальный digital-продукт.",
        icon: "layers",
      },
      {
        id: "fallback-badge-design-2",
        title: "Community-driven",
        description: "Внутри сильный акцент на ритме, когортности и удержании.",
        icon: "users",
      },
    ],
    modules: [
      {
        id: "fallback-module-design-1",
        title: "Каркас когорты",
        description: "Позиционирование, фрейм прохождения и точки результата.",
        order: 1,
        lessons: [
          {
            id: "fallback-lesson-design-1",
            title: "Обещание результата",
            description: "Как сделать программу понятной до первого урока.",
            order: 1,
            durationMinutes: 16,
          },
          {
            id: "fallback-lesson-design-2",
            title: "Ритм недели",
            description: "Спринты, дедлайны и формат без перегруза.",
            order: 2,
            durationMinutes: 18,
          },
          {
            id: "fallback-lesson-design-3",
            title: "Карта мотивации ученика",
            description: "Что удерживает внимание сильнее маркетинга.",
            order: 3,
            durationMinutes: 19,
          },
        ],
      },
      {
        id: "fallback-module-design-2",
        title: "Experience layer",
        description: "Визуал, общение, проверка практики и обратная связь.",
        order: 2,
        lessons: [
          {
            id: "fallback-lesson-design-4",
            title: "Премиальный UX ученика",
            description: "Как интерфейс усиливает ощущение качества.",
            order: 1,
            durationMinutes: 14,
          },
          {
            id: "fallback-lesson-design-5",
            title: "Домашки и разборы",
            description: "Проверка практики без ощущения скучной школы.",
            order: 2,
            durationMinutes: 21,
          },
          {
            id: "fallback-lesson-design-6",
            title: "Финальный кейс",
            description: "Как закрывать поток сильным демонстрационным результатом.",
            order: 3,
            durationMinutes: 23,
          },
        ],
      },
    ],
    reviews: [
      {
        id: "fallback-review-design-1",
        rating: 5,
        text: "Очень сильный курс по упаковке когорты. Взял идеи и сразу внедрил в свой запуск.",
        createdAt: new Date("2026-05-28T16:00:00.000Z"),
        user: {
          name: "Maria Volkova",
          avatarUrl: null,
        },
      },
    ],
    metrics: {
      lessonCount: 6,
      moduleCount: 2,
      durationMinutes: 111,
      studentCount: 24,
      reviewCount: 1,
      averageRating: 5,
    },
    viewer: {
      isEnrolled: false,
    },
    salesPage: null,
  },
  {
    id: "fallback-course-marketing-launches",
    slug: "performance-marketing-course-launches",
    title: "Performance Marketing for Course Launches",
    description:
      "Практический курс для авторов, которые хотят выстроить воронку запуска курса, контент-поток и понятную систему продаж без суеты.",
    category: "Marketing",
    level: "Intermediate",
    language: "Русский",
    coverUrl: null,
    price: 319,
    currency: "USD",
    aiEnhanced: true,
    createdAt: new Date("2026-05-24T09:00:00.000Z"),
    author: {
      id: "fallback-author-nika",
      name: "Nika Petrova",
      avatarUrl: null,
    },
    badges: [
      {
        id: "fallback-badge-marketing-1",
        title: "Launch-ready",
        description: "Внутри воронка запуска, контент и CTA-логика.",
        icon: "rocket",
      },
      {
        id: "fallback-badge-marketing-2",
        title: "Creator Economy",
        description: "Подходит для авторов, экспертов и образовательных продуктов.",
        icon: "briefcase",
      },
    ],
    modules: [
      {
        id: "fallback-module-marketing-1",
        title: "Оффер и воронка",
        description: "Позиционирование курса и маршрут пользователя до покупки.",
        order: 1,
        lessons: [
          {
            id: "fallback-lesson-marketing-1",
            title: "Оффер, который конвертит",
            description: "Как сформулировать ценность без шаблонного маркетинга.",
            order: 1,
            durationMinutes: 20,
          },
          {
            id: "fallback-lesson-marketing-2",
            title: "Контент до продажи",
            description: "Какие касания нужны до заявки или покупки.",
            order: 2,
            durationMinutes: 17,
          },
          {
            id: "fallback-lesson-marketing-3",
            title: "Путь до checkout",
            description: "Как сделать движение к покупке спокойным и понятным.",
            order: 3,
            durationMinutes: 19,
          },
        ],
      },
      {
        id: "fallback-module-marketing-2",
        title: "Запуск и аналитика",
        description: "Продажи, распределение трафика и контроль unit-экономики.",
        order: 2,
        lessons: [
          {
            id: "fallback-lesson-marketing-4",
            title: "Креативы и посадочные",
            description: "Что реально влияет на конверсию курса.",
            order: 1,
            durationMinutes: 18,
          },
          {
            id: "fallback-lesson-marketing-5",
            title: "Прогрев и ретаргетинг",
            description: "Как не терять теплую аудиторию.",
            order: 2,
            durationMinutes: 22,
          },
          {
            id: "fallback-lesson-marketing-6",
            title: "Что смотреть в аналитике",
            description: "Фокус на GMV, ROMI и здоровой economics курса.",
            order: 3,
            durationMinutes: 23,
          },
        ],
      },
    ],
    reviews: [
      {
        id: "fallback-review-marketing-1",
        rating: 4,
        text: "Очень прикладной курс: стало понятно, как запускать программу и не тонуть в разрозненных задачах.",
        createdAt: new Date("2026-06-02T12:00:00.000Z"),
        user: {
          name: "Igor Belov",
          avatarUrl: null,
        },
      },
    ],
    metrics: {
      lessonCount: 6,
      moduleCount: 2,
      durationMinutes: 119,
      studentCount: 19,
      reviewCount: 1,
      averageRating: 4,
    },
    viewer: {
      isEnrolled: false,
    },
    salesPage: null,
  },
];

function shouldUsePublicPreviewFallback() {
  return (
    process.env.VERCEL === "1" &&
    /localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL ?? "")
  );
}

function mapFallbackCourseToCard(course: PublicCourseDetail): PublicCourseCardData {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    coverUrl: course.coverUrl,
    price: course.price,
    currency: course.currency,
    aiEnhanced: course.aiEnhanced,
    authorName: course.author.name,
    lessonCount: course.metrics.lessonCount,
    studentCount: course.metrics.studentCount,
    reviewCount: course.metrics.reviewCount,
    averageRating: course.metrics.averageRating,
    salesPageStatus: null,
    heroBadges: course.badges.slice(0, 2).map((badge) => badge.title),
  };
}

function getFallbackPublishedCourses(filters: CourseCatalogFilters) {
  const q = normalizeFilterValue(filters.q)?.trim().toLowerCase();
  const category = normalizeFilterValue(filters.category);
  const level = normalizeFilterValue(filters.level);
  const sort = filters.sort === "price-desc" ? "desc" : "asc";

  const courses = publicPreviewFallbackCourses
    .filter((course) => {
      if (q) {
        const haystack = `${course.title} ${course.description} ${course.category} ${course.author.name}`.toLowerCase();

        if (!haystack.includes(q)) {
          return false;
        }
      }

      if (category && course.category !== category) {
        return false;
      }

      if (level && course.level !== level) {
        return false;
      }

      return true;
    })
    .sort((a, b) => (sort === "desc" ? b.price - a.price : a.price - b.price))
    .map(mapFallbackCourseToCard);

  return {
    courses,
    total: courses.length,
  };
}

function getFallbackCourseBySlug(slug: string, userId?: string): PublicCourseDetail | null {
  const course = publicPreviewFallbackCourses.find((item) => item.slug === slug);

  if (!course) {
    return null;
  }

  return {
    ...course,
    badges: [...course.badges],
    modules: course.modules.map((module) => ({
      ...module,
      lessons: [...module.lessons],
    })),
    reviews: [...course.reviews],
    metrics: { ...course.metrics },
    viewer: {
      isEnrolled: Boolean(userId) && course.viewer.isEnrolled,
    },
    salesPage: null,
  };
}

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
  if (shouldUsePublicPreviewFallback()) {
    return {
      publishedCourses: publicPreviewFallbackCourses.length,
      authors: new Set(publicPreviewFallbackCourses.map((course) => course.author.id)).size,
      enrollments: publicPreviewFallbackCourses.reduce(
        (sum, course) => sum + course.metrics.studentCount,
        0,
      ),
      lessons: publicPreviewFallbackCourses.reduce(
        (sum, course) => sum + course.metrics.lessonCount,
        0,
      ),
    };
  }

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
  if (shouldUsePublicPreviewFallback()) {
    return {
      categories: Array.from(
        new Set(publicPreviewFallbackCourses.map((course) => course.category)),
      ).sort(),
      levels: Array.from(
        new Set(publicPreviewFallbackCourses.map((course) => course.level)),
      ).sort(),
    };
  }

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
  if (shouldUsePublicPreviewFallback()) {
    return getFallbackPublishedCourses(filters);
  }

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
  if (shouldUsePublicPreviewFallback()) {
    return getFallbackCourseBySlug(slug, userId);
  }

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
