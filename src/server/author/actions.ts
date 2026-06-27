"use server";

import {
  AiGenerationStatus,
  CourseStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  generateAssignment,
  generateChecklist,
  generateLessonSummary,
  generateQuest,
  generateQuiz,
} from "@/lib/ai";
import { getAllCourseStudioPaths } from "@/lib/course-studio";
import {
  modulePracticeSchema,
  type ModulePracticeInput,
} from "@/lib/module-practice";
import {
  coerceSalesPageTheme,
  createInitialSalesPage,
} from "@/lib/sales-page";
import {
  authorLessonPracticeSchema,
  type AuthorLessonPracticeInput,
} from "@/lib/validators/author-practice";
import {
  creativeStudioCourseCardSchema,
  creativeStudioFooterSocialsSchema,
  type CreativeStudioCourseCardInput,
  type CreativeStudioFooterSocialsInput,
} from "@/lib/validators/creative-studio";
import {
  courseFormSchema,
  courseOverviewSchema,
  type CourseFormInput,
  type CourseOverviewInput,
  lessonFormSchema,
  type LessonFormInput,
  moduleFormSchema,
  type ModuleFormInput,
} from "@/lib/validators/course";
import { getServerAuthSession } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";

export type AuthorActionResult<T = undefined> = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: T;
};

type AuthorActor = {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
};

type EditableCourse = {
  id: string;
  slug: string;
  authorId: string;
};

type TxClient = Prisma.TransactionClient;

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function buildCourseAccessWhere(actor: AuthorActor) {
  return actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId };
}

function unauthorizedResult<T = undefined>(): AuthorActionResult<T> {
  return {
    success: false,
    message: "У тебя нет доступа к этому действию.",
  };
}

async function getActionActor(): Promise<AuthorActor | null> {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return null;
  }

  if (
    session.user.role !== UserRole.AUTHOR &&
    session.user.role !== UserRole.ADMIN
  ) {
    return null;
  }

  return {
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name ?? "Author",
    email: session.user.email ?? "",
  };
}

async function findEditableCourse(
  courseId: string,
  actor: AuthorActor,
): Promise<EditableCourse | null> {
  const prisma = getPrismaClient();

  return prisma.course.findFirst({
    where: {
      id: courseId,
      ...buildCourseAccessWhere(actor),
    },
    select: {
      id: true,
      slug: true,
      authorId: true,
    },
  });
}

async function reindexModules(tx: TxClient, courseId: string) {
  const modules = await tx.module.findMany({
    where: { courseId },
    orderBy: [{ order: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    modules.map((module, index) =>
      tx.module.update({
        where: { id: module.id },
        data: { order: index + 1 },
      }),
    ),
  );
}

async function reindexLessons(tx: TxClient, moduleId: string) {
  const lessons = await tx.lesson.findMany({
    where: { moduleId },
    orderBy: [{ order: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    lessons.map((lesson, index) =>
      tx.lesson.update({
        where: { id: lesson.id },
        data: { order: index + 1 },
      }),
    ),
  );
}

function revalidateAuthorCourse(courseId: string, slug?: string | null) {
  revalidatePath("/author");
  revalidatePath("/author/courses/new");
  revalidatePath(`/author/courses/${courseId}/builder`);
  revalidatePath(`/author/courses/${courseId}/studio`);
  revalidatePath(`/author/courses/${courseId}/creative-studio`);

  for (const path of getAllCourseStudioPaths(courseId)) {
    revalidatePath(path);
  }

  revalidatePath("/courses");
  revalidatePath(`/learn/${courseId}`);
  revalidatePath(`/learn/${courseId}/assistant`);

  if (slug) {
    revalidatePath(`/courses/${slug}`);
  }
}

function buildAiPrompt(transcript: string) {
  const compactTranscript = transcript.replace(/\s+/g, " ").trim();
  return compactTranscript.length > 2000
    ? `${compactTranscript.slice(0, 1997)}...`
    : compactTranscript;
}

async function ensureEditableSalesPage(
  courseId: string,
  actor: AuthorActor,
) {
  const prisma = getPrismaClient();
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...buildCourseAccessWhere(actor),
    },
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
      authorId: true,
      author: {
        select: {
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      salesPage: {
        select: {
          id: true,
          title: true,
          theme: true,
        },
      },
    },
  });

  if (!course) {
    return null;
  }

  if (course.salesPage) {
    return course;
  }

  const initialSalesPage = createInitialSalesPage({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    language: course.language,
    price: Number(course.price),
    currency: course.currency,
    coverUrl: course.coverUrl,
    aiEnhanced: course.aiEnhanced,
    author: {
      id: course.authorId,
      name: course.author.name,
      email: course.author.email,
      avatarUrl: course.author.avatarUrl,
    },
    modules: [],
    badges: [],
  });

  const createdSalesPage = await prisma.courseSalesPage.create({
    data: {
      courseId: course.id,
      slug: course.slug,
      status: initialSalesPage.status,
      title: initialSalesPage.title,
      metaTitle: initialSalesPage.metaTitle,
      metaDescription: initialSalesPage.metaDescription,
      ogImage: initialSalesPage.ogImage,
      theme: toInputJson(initialSalesPage.theme),
      blocks: {
        create: initialSalesPage.blocks.map((block) => ({
          type: block.type,
          order: block.order,
          title: block.title,
          subtitle: block.subtitle,
          content: toInputJson(block.content),
          settings: toInputJson(block.settings),
          isVisible: block.isVisible,
        })),
      },
    },
    select: {
      id: true,
      title: true,
      theme: true,
    },
  });

  return {
    ...course,
    salesPage: createdSalesPage,
  };
}

export async function createAuthorCourse(
  values: CourseFormInput,
): Promise<AuthorActionResult<{ courseId: string }>> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const parsed = courseFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь поля формы.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const slug = parsed.data.slug.toLowerCase();

  const existingCourse = await prisma.course.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingCourse) {
    return {
      success: false,
      message: "Такой slug уже занят.",
      fieldErrors: {
        slug: ["Выбери другой slug."],
      },
    };
  }

  const course = await prisma.course.create({
    data: {
      authorId: actor.userId,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      category: parsed.data.category,
      price: new Prisma.Decimal(parsed.data.price),
      currency: parsed.data.currency,
      coverUrl: parsed.data.coverUrl ?? null,
      level: parsed.data.level,
      language: parsed.data.language,
      status: CourseStatus.DRAFT,
      aiEnhanced: false,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  const initialSalesPage = createInitialSalesPage({
    id: course.id,
    slug: course.slug,
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    level: parsed.data.level,
    language: parsed.data.language,
    price: parsed.data.price,
    currency: parsed.data.currency,
    coverUrl: parsed.data.coverUrl ?? null,
    aiEnhanced: false,
    author: {
      id: actor.userId,
      name: actor.name,
      email: actor.email,
      avatarUrl: null,
    },
    modules: [],
    badges: [],
  });

  await prisma.courseSalesPage.create({
    data: {
      courseId: course.id,
      slug: course.slug,
      status: initialSalesPage.status,
      title: initialSalesPage.title,
      metaTitle: initialSalesPage.metaTitle,
      metaDescription: initialSalesPage.metaDescription,
      ogImage: initialSalesPage.ogImage,
      theme: toInputJson(initialSalesPage.theme),
      blocks: {
        create: initialSalesPage.blocks.map((block) => ({
          type: block.type,
          order: block.order,
          title: block.title,
          subtitle: block.subtitle,
          content: toInputJson(block.content),
          settings: toInputJson(block.settings),
          isVisible: block.isVisible,
        })),
      },
    },
  });

  revalidateAuthorCourse(course.id, course.slug);

  return {
    success: true,
    message: "Курс создан.",
    data: {
      courseId: course.id,
    },
  };
}

export async function updateAuthorCourseOverview(
  courseId: string,
  values: CourseOverviewInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await findEditableCourse(courseId, actor);

  if (!course) {
    return unauthorizedResult();
  }

  const parsed = courseOverviewSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь поля курса.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const slug = parsed.data.slug.toLowerCase();

  const existingSlug = await prisma.course.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingSlug && existingSlug.id !== courseId) {
    return {
      success: false,
      message: "Такой slug уже существует.",
      fieldErrors: {
        slug: ["Укажи уникальный slug."],
      },
    };
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      category: parsed.data.category,
      price: new Prisma.Decimal(parsed.data.price),
      currency: parsed.data.currency,
      coverUrl: parsed.data.coverUrl ?? null,
      level: parsed.data.level,
      language: parsed.data.language,
      status:
        parsed.data.status === "PUBLISHED"
          ? CourseStatus.PUBLISHED
          : CourseStatus.DRAFT,
    },
  });

  await prisma.courseSalesPage.updateMany({
    where: {
      courseId,
    },
    data: {
      slug,
      ogImage: parsed.data.coverUrl ?? null,
    },
  });

  revalidateAuthorCourse(courseId, slug);
  revalidatePath(`/courses/${course.slug}`);

  return {
    success: true,
    message: "Основные данные курса обновлены.",
  };
}

export async function saveCreativeStudioCourseCard(
  courseId: string,
  values: CreativeStudioCourseCardInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await ensureEditableSalesPage(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  const parsed = creativeStudioCourseCardSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь поля карточки курса.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const currentTheme = coerceSalesPageTheme(course.salesPage.theme);
  const nextTheme = {
    ...currentTheme,
    courseCard: {
      shortDescription: parsed.data.shortDescription,
      oldPrice: parsed.data.oldPrice ?? null,
      authorName: parsed.data.authorName,
      badges: parsed.data.badges,
      duration: parsed.data.duration,
      lessonsCount: parsed.data.lessonsCount,
      accentColor: parsed.data.accentColor || currentTheme.accent,
      cardStyle: parsed.data.cardStyle,
    },
  };

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      level: parsed.data.level,
      price: new Prisma.Decimal(parsed.data.price),
      coverUrl: parsed.data.coverUrl ?? null,
    },
  });

  await prisma.courseSalesPage.update({
    where: {
      id: course.salesPage.id,
    },
    data: {
      title: parsed.data.title,
      ogImage: parsed.data.coverUrl ?? null,
      theme: toInputJson(nextTheme),
    },
  });

  revalidateAuthorCourse(courseId, course.slug);

  return {
    success: true,
    message: "Карточка курса обновлена.",
  };
}

export async function saveCreativeStudioFooterSocials(
  courseId: string,
  values: CreativeStudioFooterSocialsInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await ensureEditableSalesPage(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  const parsed = creativeStudioFooterSocialsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь social links футера.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const currentTheme = coerceSalesPageTheme(course.salesPage.theme);

  await prisma.courseSalesPage.update({
    where: {
      id: course.salesPage.id,
    },
    data: {
      theme: toInputJson({
        ...currentTheme,
        footerSocials: parsed.data,
      }),
    },
  });

  revalidateAuthorCourse(courseId, course.slug);

  return {
    success: true,
    message: "Ссылки футера сохранены.",
  };
}

export async function createAuthorModule(
  courseId: string,
  values: ModuleFormInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await findEditableCourse(courseId, actor);

  if (!course) {
    return unauthorizedResult();
  }

  const parsed = moduleFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь поля модуля.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const lastModule = await prisma.module.findFirst({
    where: { courseId },
    orderBy: [{ order: "desc" }],
    select: { order: true },
  });

  await prisma.module.create({
    data: {
      courseId,
      title: parsed.data.title,
      description: parsed.data.description,
      order: (lastModule?.order ?? 0) + 1,
    },
  });

  revalidateAuthorCourse(courseId, course.slug);

  return {
    success: true,
    message: "Модуль добавлен.",
  };
}

export async function updateAuthorModule(
  moduleId: string,
  values: ModuleFormInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          authorId: true,
        },
      },
    },
  });

  if (
    !courseModule ||
    (actor.role !== UserRole.ADMIN &&
      courseModule.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const parsed = moduleFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь данные модуля.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.module.update({
    where: { id: moduleId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
    },
  });

  revalidateAuthorCourse(courseModule.course.id, courseModule.course.slug);

  return {
    success: true,
    message: "Модуль обновлен.",
  };
}

export async function saveAuthorModulePractice(
  moduleId: string,
  values: ModulePracticeInput | null,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          authorId: true,
        },
      },
    },
  });

  if (
    !courseModule ||
    (actor.role !== UserRole.ADMIN &&
      courseModule.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  if (values === null) {
    await prisma.module.update({
      where: { id: moduleId },
      data: {
        practice: Prisma.JsonNull,
      },
    });

    revalidateAuthorCourse(courseModule.course.id, courseModule.course.slug);

    return {
      success: true,
      message: "Модульное задание отключено.",
    };
  }

  const parsed = modulePracticeSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь настройки модульного задания.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.module.update({
    where: { id: moduleId },
    data: {
      practice: toInputJson(parsed.data),
    },
  });

  revalidateAuthorCourse(courseModule.course.id, courseModule.course.slug);

  return {
    success: true,
    message: "Модульное задание сохранено.",
  };
}

export async function deleteAuthorModule(
  moduleId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          authorId: true,
        },
      },
    },
  });

  if (
    !courseModule ||
    (actor.role !== UserRole.ADMIN &&
      courseModule.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  await prisma.$transaction(async (tx) => {
    await tx.module.delete({
      where: { id: moduleId },
    });
    await reindexModules(tx, courseModule.course.id);
  });

  revalidateAuthorCourse(courseModule.course.id, courseModule.course.slug);

  return {
    success: true,
    message: "Модуль удален.",
  };
}

export async function moveAuthorModule(
  moduleId: string,
  direction: "up" | "down",
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          authorId: true,
        },
      },
    },
  });

  if (
    !courseModule ||
    (actor.role !== UserRole.ADMIN &&
      courseModule.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const modules = await prisma.module.findMany({
    where: { courseId: courseModule.course.id },
    orderBy: [{ order: "asc" }],
    select: { id: true, order: true },
  });

  const currentIndex = modules.findIndex((item) => item.id === moduleId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= modules.length) {
    return {
      success: false,
      message: "Этот модуль уже нельзя сдвинуть дальше.",
    };
  }

  const current = modules[currentIndex];
  const target = modules[targetIndex];

  await prisma.$transaction([
    prisma.module.update({
      where: { id: current.id },
      data: { order: -1 },
    }),
    prisma.module.update({
      where: { id: target.id },
      data: { order: current.order },
    }),
    prisma.module.update({
      where: { id: current.id },
      data: { order: target.order },
    }),
  ]);

  revalidateAuthorCourse(courseModule.course.id, courseModule.course.slug);

  return {
    success: true,
    message: "Порядок модулей обновлен.",
  };
}

export async function createAuthorLesson(
  moduleId: string,
  values: LessonFormInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          authorId: true,
        },
      },
      lessons: {
        select: {
          order: true,
        },
        orderBy: [{ order: "desc" }],
        take: 1,
      },
    },
  });

  if (
    !courseModule ||
    (actor.role !== UserRole.ADMIN &&
      courseModule.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const parsed = lessonFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь данные урока.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.lesson.create({
    data: {
      moduleId,
      title: parsed.data.title,
      description: parsed.data.description,
      videoUrl: parsed.data.videoUrl ?? null,
      contentText: parsed.data.contentText,
      transcript: parsed.data.transcript ?? null,
      materials: parsed.data.materials.length
        ? parsed.data.materials
        : Prisma.JsonNull,
      durationMinutes: parsed.data.durationMinutes,
      order: (courseModule.lessons[0]?.order ?? 0) + 1,
    },
  });

  revalidateAuthorCourse(courseModule.course.id, courseModule.course.slug);

  return {
    success: true,
    message: "Урок добавлен.",
  };
}

export async function updateAuthorLesson(
  lessonId: string,
  values: LessonFormInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !lesson ||
    (actor.role !== UserRole.ADMIN &&
      lesson.module.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const parsed = lessonFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь данные урока.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      videoUrl: parsed.data.videoUrl ?? null,
      contentText: parsed.data.contentText,
      transcript: parsed.data.transcript ?? null,
      materials: parsed.data.materials.length
        ? parsed.data.materials
        : Prisma.JsonNull,
      durationMinutes: parsed.data.durationMinutes,
    },
  });

  revalidateAuthorCourse(lesson.module.course.id, lesson.module.course.slug);

  return {
    success: true,
    message: "Урок обновлен.",
  };
}

export async function generateAuthorLessonAiContent(
  lessonId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !lesson ||
    (actor.role !== UserRole.ADMIN &&
      lesson.module.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const transcript = lesson.transcript?.trim();

  if (!transcript) {
    return {
      success: false,
      message: "Сначала добавь transcript урока, затем запускай AI generation.",
    };
  }

  try {
    const [summary, quiz, assignment, checklist, quest] = await Promise.all([
      generateLessonSummary(transcript),
      generateQuiz(transcript),
      generateAssignment(transcript),
      generateChecklist(transcript),
      generateQuest(transcript),
    ]);

    const prompt = buildAiPrompt(transcript);

    await prisma.$transaction(async (tx) => {
      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          aiSummary: [
            summary.shortSummary,
            summary.keyIdeas.length
              ? `Key ideas: ${summary.keyIdeas.join(", ")}`
              : null,
            summary.studentOutcome
              ? `Student outcome: ${summary.studentOutcome}`
              : null,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      });

      await tx.quiz.upsert({
        where: { lessonId },
        create: {
          lessonId,
          title: quiz.title,
          questions: quiz.questions,
        },
        update: {
          title: quiz.title,
          questions: quiz.questions,
        },
      });

      await tx.assignment.upsert({
        where: { lessonId },
        create: {
          lessonId,
          title: assignment.title,
          description: assignment.description,
          rubric: assignment.rubric,
        },
        update: {
          title: assignment.title,
          description: assignment.description,
          rubric: assignment.rubric,
        },
      });

      await tx.checklist.upsert({
        where: { lessonId },
        create: {
          lessonId,
          items: checklist.items,
        },
        update: {
          items: checklist.items,
        },
      });

      await tx.quest.upsert({
        where: { lessonId },
        create: {
          lessonId,
          title: quest.title,
          description: quest.description,
          rewardPoints: quest.rewardPoints,
        },
        update: {
          title: quest.title,
          description: quest.description,
          rewardPoints: quest.rewardPoints,
        },
      });

      await tx.aiGeneration.createMany({
        data: [
          {
            courseId: lesson.module.course.id,
            lessonId,
            type: "LESSON_SUMMARY",
            prompt,
            result: summary,
            status: AiGenerationStatus.APPLIED,
          },
          {
            courseId: lesson.module.course.id,
            lessonId,
            type: "QUIZ",
            prompt,
            result: quiz,
            status: AiGenerationStatus.APPLIED,
          },
          {
            courseId: lesson.module.course.id,
            lessonId,
            type: "ASSIGNMENT",
            prompt,
            result: assignment,
            status: AiGenerationStatus.APPLIED,
          },
          {
            courseId: lesson.module.course.id,
            lessonId,
            type: "CHECKLIST",
            prompt,
            result: checklist,
            status: AiGenerationStatus.APPLIED,
          },
          {
            courseId: lesson.module.course.id,
            lessonId,
            type: "QUEST",
            prompt,
            result: quest,
            status: AiGenerationStatus.APPLIED,
          },
        ],
      });
    });

    revalidateAuthorCourse(lesson.module.course.id, lesson.module.course.slug);

    return {
      success: true,
      message:
        "AI generation completed. Summary, quiz, assignment, checklist and quest updated.",
    };
  } catch (error) {
    console.error("generateAuthorLessonAiContent", error);

    return {
      success: false,
      message:
        "Не удалось сгенерировать AI-материалы. Проверь transcript или AI provider.",
    };
  }
}

export async function saveAuthorLessonPractice(
  lessonId: string,
  values: AuthorLessonPracticeInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !lesson ||
    (actor.role !== UserRole.ADMIN &&
      lesson.module.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const parsed = authorLessonPracticeSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь practice-блоки урока.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.$transaction(async (tx) => {
    if (parsed.data.quiz) {
      await tx.quiz.upsert({
        where: { lessonId },
        create: {
          lessonId,
          title: parsed.data.quiz.title,
          questions: parsed.data.quiz.questions,
        },
        update: {
          title: parsed.data.quiz.title,
          questions: parsed.data.quiz.questions,
        },
      });
    } else {
      await tx.quiz.deleteMany({ where: { lessonId } });
    }

    if (parsed.data.assignment) {
      await tx.assignment.upsert({
        where: { lessonId },
        create: {
          lessonId,
          title: parsed.data.assignment.title,
          description: parsed.data.assignment.description,
          rubric: parsed.data.assignment.rubric,
        },
        update: {
          title: parsed.data.assignment.title,
          description: parsed.data.assignment.description,
          rubric: parsed.data.assignment.rubric,
        },
      });
    } else {
      await tx.assignment.deleteMany({ where: { lessonId } });
    }

    if (parsed.data.checklist) {
      await tx.checklist.upsert({
        where: { lessonId },
        create: {
          lessonId,
          items: parsed.data.checklist.items,
        },
        update: {
          items: parsed.data.checklist.items,
        },
      });
    } else {
      await tx.checklist.deleteMany({ where: { lessonId } });
    }

    if (parsed.data.quest) {
      await tx.quest.upsert({
        where: { lessonId },
        create: {
          lessonId,
          title: parsed.data.quest.title,
          description: parsed.data.quest.description,
          rewardPoints: parsed.data.quest.rewardPoints,
        },
        update: {
          title: parsed.data.quest.title,
          description: parsed.data.quest.description,
          rewardPoints: parsed.data.quest.rewardPoints,
        },
      });
    } else {
      await tx.quest.deleteMany({ where: { lessonId } });
    }
  });

  revalidateAuthorCourse(lesson.module.course.id, lesson.module.course.slug);

  return {
    success: true,
    message: "Practice layer обновлен.",
  };
}

export async function deleteAuthorLesson(
  lessonId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !lesson ||
    (actor.role !== UserRole.ADMIN &&
      lesson.module.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  await prisma.$transaction(async (tx) => {
    await tx.lesson.delete({
      where: { id: lessonId },
    });
    await reindexLessons(tx, lesson.moduleId);
  });

  revalidateAuthorCourse(lesson.module.course.id, lesson.module.course.slug);

  return {
    success: true,
    message: "Урок удален.",
  };
}

export async function moveAuthorLesson(
  lessonId: string,
  direction: "up" | "down",
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getActionActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !lesson ||
    (actor.role !== UserRole.ADMIN &&
      lesson.module.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const lessons = await prisma.lesson.findMany({
    where: { moduleId: lesson.moduleId },
    orderBy: [{ order: "asc" }],
    select: { id: true, order: true },
  });

  const currentIndex = lessons.findIndex((item) => item.id === lessonId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= lessons.length) {
    return {
      success: false,
      message: "Этот урок уже нельзя сдвинуть дальше.",
    };
  }

  const current = lessons[currentIndex];
  const target = lessons[targetIndex];

  await prisma.$transaction([
    prisma.lesson.update({
      where: { id: current.id },
      data: { order: -1 },
    }),
    prisma.lesson.update({
      where: { id: target.id },
      data: { order: current.order },
    }),
    prisma.lesson.update({
      where: { id: current.id },
      data: { order: target.order },
    }),
  ]);

  revalidateAuthorCourse(lesson.module.course.id, lesson.module.course.slug);

  return {
    success: true,
    message: "Порядок уроков обновлен.",
  };
}
