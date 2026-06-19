import { CourseStatus, UserRole } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getPrismaClient } from "@/server/db";

const MAX_ASSISTANT_CONTEXT_CHARS = 18000;

export type StudentActor = {
  userId: string;
  role: UserRole;
};

export type StudentDashboardCourse = {
  enrollmentId: string;
  courseId: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  coverUrl: string | null;
  progressPercent: number;
  points: number;
  streakDays: number;
  lessonCount: number;
  completedLessons: number;
  durationMinutes: number;
  authorName: string;
  updatedAt: Date;
  nextLessonId: string | null;
};

export type StudentDashboardRecentLesson = {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  durationMinutes: number;
  completedAt: Date;
  score: number | null;
};

export type StudentDashboardBadge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
};

export type StudentDashboardData = {
  metrics: {
    totalCourses: number;
    completedLessons: number;
    totalPoints: number;
    currentLevel: number;
    currentStreakDays: number;
  };
  courses: StudentDashboardCourse[];
  recentLessons: StudentDashboardRecentLesson[];
  earnedBadges: StudentDashboardBadge[];
};

export type StudentLearningQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctAnswerIndex: number | null;
  explanation: string | null;
  type: "multiple_choice" | "reflection";
};

export type StudentLearningQuiz = {
  title: string;
  questions: StudentLearningQuizQuestion[];
};

export type StudentLearningAssignmentRubricItem = {
  criterion: string;
  points: number;
};

export type StudentLearningAssignment = {
  title: string;
  description: string;
  passingScore: number | null;
  rubric: StudentLearningAssignmentRubricItem[];
};

export type StudentLearningChecklistItem = {
  text: string;
  required: boolean;
};

export type StudentLearningQuest = {
  title: string;
  description: string;
  rewardPoints: number;
};

export type StudentLearningLesson = {
  id: string;
  title: string;
  description: string;
  videoUrl: string | null;
  contentText: string;
  transcript: string | null;
  aiSummary: string | null;
  durationMinutes: number;
  order: number;
  completed: boolean;
  score: number | null;
  quiz: StudentLearningQuiz | null;
  assignment: StudentLearningAssignment | null;
  checklist: {
    items: StudentLearningChecklistItem[];
  } | null;
  quest: StudentLearningQuest | null;
};

export type StudentLearningModule = {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: StudentLearningLesson[];
};

export type StudentLearningData = {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    level: string;
    language: string;
    coverUrl: string | null;
    author: {
      name: string;
      avatarUrl: string | null;
    };
    badges: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
    }>;
    earnedBadges: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
    }>;
    modules: StudentLearningModule[];
    metrics: {
      moduleCount: number;
      lessonCount: number;
      durationMinutes: number;
      completedLessons: number;
      earnedBadgeCount: number;
    };
  };
  enrollment: {
    id: string | null;
    progressPercent: number;
    points: number;
    level: number;
    streakDays: number;
  };
  viewer: {
    isAdminPreview: boolean;
  };
};

export type StudentAssistantMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAtIso: string;
  createdAtLabel: string;
};

export type StudentAssistantData = {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    level: string;
    coverUrl: string | null;
    author: {
      name: string;
      avatarUrl: string | null;
    };
    metrics: {
      moduleCount: number;
      lessonCount: number;
      progressPercent: number;
      messageCount: number;
    };
  };
  messages: StudentAssistantMessage[];
};

function formatAssistantTimestamp(value: Date) {
  return format(value, "d MMM, HH:mm", { locale: ru });
}

function truncateAssistantContext(value: string) {
  const normalized = value.trim();

  if (normalized.length <= MAX_ASSISTANT_CONTEXT_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_ASSISTANT_CONTEXT_CHARS)}...`;
}

export function buildStudentCourseAssistantContext(course: {
  title: string;
  description: string;
  modules: Array<{
    title: string;
    description: string;
    order: number;
    lessons: Array<{
      title: string;
      description: string;
      contentText: string;
      transcript: string | null;
      aiSummary: string | null;
      order: number;
    }>;
  }>;
}) {
  const parts = [
    `Курс: ${course.title}`,
    `Описание курса: ${course.description}`,
    ...course.modules.flatMap((module) => [
      `Модуль ${module.order}: ${module.title}`,
      `Описание модуля: ${module.description}`,
      ...module.lessons.flatMap((lesson) => [
        `Урок ${module.order}.${lesson.order}: ${lesson.title}`,
        `Описание урока: ${lesson.description}`,
        `Материал урока: ${lesson.contentText}`,
        lesson.transcript ? `Транскрипт: ${lesson.transcript}` : null,
        lesson.aiSummary ? `AI summary: ${lesson.aiSummary}` : null,
      ]),
    ]),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  return truncateAssistantContext(parts);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getBadgeThresholds(badgeCount: number, lessonCount: number) {
  if (!badgeCount || !lessonCount) {
    return [];
  }

  return Array.from({ length: badgeCount }, (_, index) => {
    if (index === badgeCount - 1) {
      return lessonCount;
    }

    return Math.max(
      1,
      Math.ceil(((index + 1) * lessonCount) / (badgeCount + 1)),
    );
  });
}

function getEarnedBadges<T extends { id: string }>(
  badges: T[],
  lessonCount: number,
  completedLessons: number,
) {
  if (!completedLessons) {
    return [] as T[];
  }

  const thresholds = getBadgeThresholds(badges.length, lessonCount);

  return badges.filter((badge, index) => completedLessons >= thresholds[index]);
}

function normalizeQuiz(
  lessonId: string,
  quiz:
    | {
        title: string;
        questions: unknown;
      }
    | null
    | undefined,
): StudentLearningQuiz | null {
  if (!quiz) {
    return null;
  }

  const questionSource = Array.isArray(quiz.questions)
    ? quiz.questions
    : asRecord(quiz.questions)?.questions;
  const rawQuestions = Array.isArray(questionSource) ? questionSource : [];

  const questions = rawQuestions
    .map((rawQuestion, index) => {
      const record = asRecord(rawQuestion);
      if (!record) {
        return null;
      }

      const prompt =
        typeof record.question === "string"
          ? record.question
          : typeof record.prompt === "string"
            ? record.prompt
            : `Question ${index + 1}`;
      const options = asStringArray(record.options);
      const rawCorrectAnswer =
        typeof record.correctAnswerIndex === "number"
          ? record.correctAnswerIndex
          : typeof record.answer === "number"
            ? record.answer
            : null;
      const type =
        options.length >= 2 && rawCorrectAnswer !== null
          ? "multiple_choice"
          : "reflection";

      return {
        id: `${lessonId}-quiz-${index + 1}`,
        prompt,
        options,
        correctAnswerIndex: type === "multiple_choice" ? rawCorrectAnswer : null,
        explanation:
          typeof record.explanation === "string" ? record.explanation : null,
        type,
      } satisfies StudentLearningQuizQuestion;
    })
    .filter((question): question is StudentLearningQuizQuestion => Boolean(question));

  return questions.length
    ? {
        title: quiz.title,
        questions,
      }
    : null;
}

function normalizeAssignment(
  assignment:
    | {
        title: string;
        description: string;
        rubric: unknown;
      }
    | null
    | undefined,
): StudentLearningAssignment | null {
  if (!assignment) {
    return null;
  }

  let rubric: StudentLearningAssignmentRubricItem[] = [];
  let passingScore: number | null = null;

  if (Array.isArray(assignment.rubric)) {
    rubric = assignment.rubric
      .map((item) => {
        const record = asRecord(item);
        if (!record || typeof record.criterion !== "string") {
          return null;
        }

        return {
          criterion: record.criterion,
          points:
            typeof record.points === "number" && Number.isFinite(record.points)
              ? record.points
              : 10,
        };
      })
      .filter((item): item is StudentLearningAssignmentRubricItem => Boolean(item));
  } else {
    const rubricRecord = asRecord(assignment.rubric);
    if (rubricRecord) {
      passingScore =
        typeof rubricRecord.passingScore === "number"
          ? rubricRecord.passingScore
          : null;
      const criteria = asStringArray(rubricRecord.criteria);
      rubric = criteria.map((criterion) => ({
        criterion,
        points: 10,
      }));
    }
  }

  return {
    title: assignment.title,
    description: assignment.description,
    passingScore,
    rubric,
  };
}

function normalizeChecklist(
  checklist:
    | {
        items: unknown;
      }
    | null
    | undefined,
) {
  if (!checklist) {
    return null;
  }

  const source = Array.isArray(checklist.items)
    ? checklist.items
    : asRecord(checklist.items)?.items;
  const items = Array.isArray(source)
    ? source
        .map((item) => {
          if (typeof item === "string") {
            return {
              text: item,
              required: true,
            } satisfies StudentLearningChecklistItem;
          }

          const record = asRecord(item);
          if (!record || typeof record.text !== "string") {
            return null;
          }

          return {
            text: record.text,
            required:
              typeof record.required === "boolean" ? record.required : true,
          } satisfies StudentLearningChecklistItem;
        })
        .filter((item): item is StudentLearningChecklistItem => Boolean(item))
    : [];

  return items.length ? { items } : null;
}

export async function getStudentDashboardData(
  actor: StudentActor,
): Promise<StudentDashboardData> {
  const prisma = getPrismaClient();
  const enrollmentWhere =
    actor.role === UserRole.ADMIN ? {} : { userId: actor.userId };

  const [enrollments, recentLessonProgresses] = await Promise.all([
    prisma.enrollment.findMany({
      where: enrollmentWhere,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        lessonProgresses: {
          select: {
            lessonId: true,
            completed: true,
          },
        },
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            category: true,
            level: true,
            coverUrl: true,
            updatedAt: true,
            badges: {
              orderBy: {
                title: "asc",
              },
              select: {
                id: true,
                title: true,
                description: true,
                icon: true,
              },
            },
            author: {
              select: {
                name: true,
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
                    durationMinutes: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.lessonProgress.findMany({
      where: {
        completed: true,
        completedAt: {
          not: null,
        },
        ...(actor.role === UserRole.ADMIN
          ? {}
          : {
              enrollment: {
                userId: actor.userId,
              },
            }),
      },
      orderBy: {
        completedAt: "desc",
      },
      take: 6,
      select: {
        lessonId: true,
        score: true,
        completedAt: true,
        lesson: {
          select: {
            title: true,
            durationMinutes: true,
            module: {
              select: {
                course: {
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const earnedBadges: StudentDashboardBadge[] = [];

  const courses: StudentDashboardCourse[] = enrollments.map((enrollment) => {
    const lessonCount = enrollment.course.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0,
    );
    const durationMinutes = enrollment.course.modules.reduce(
      (sum, module) =>
        sum +
        module.lessons.reduce(
          (lessonSum, lesson) => lessonSum + lesson.durationMinutes,
          0,
        ),
      0,
    );
    const completedLessonIds = new Set(
      enrollment.lessonProgresses
        .filter((progress) => progress.completed)
        .map((progress) => progress.lessonId),
    );
    const completedLessons = completedLessonIds.size;
    const nextLessonId =
      enrollment.course.modules
        .flatMap((module) => module.lessons)
        .find((lesson) => !completedLessonIds.has(lesson.id))
        ?.id ?? enrollment.course.modules[0]?.lessons[0]?.id ?? null;

    const courseEarnedBadges = getEarnedBadges(
      enrollment.course.badges,
      lessonCount,
      completedLessons,
    );

    earnedBadges.push(
      ...courseEarnedBadges.map((badge) => ({
        id: badge.id,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        courseId: enrollment.course.id,
        courseSlug: enrollment.course.slug,
        courseTitle: enrollment.course.title,
      })),
    );

    return {
      enrollmentId: enrollment.id,
      courseId: enrollment.course.id,
      slug: enrollment.course.slug,
      title: enrollment.course.title,
      description: enrollment.course.description,
      category: enrollment.course.category,
      level: enrollment.course.level,
      coverUrl: enrollment.course.coverUrl,
      progressPercent: enrollment.progressPercent,
      points: enrollment.points,
      streakDays: enrollment.streakDays,
      lessonCount,
      completedLessons,
      durationMinutes,
      authorName: enrollment.course.author.name,
      updatedAt: enrollment.course.updatedAt,
      nextLessonId,
    };
  });

  const totalPoints = courses.reduce((sum, course) => sum + course.points, 0);

  return {
    metrics: {
      totalCourses: courses.length,
      completedLessons: courses.reduce(
        (sum, course) => sum + course.completedLessons,
        0,
      ),
      totalPoints,
      currentLevel: Math.floor(totalPoints / 100) + 1,
      currentStreakDays: courses.reduce(
        (max, course) => Math.max(max, course.streakDays),
        0,
      ),
    },
    courses,
    recentLessons: recentLessonProgresses
      .filter((progress): progress is typeof progress & { completedAt: Date } =>
        Boolean(progress.completedAt),
      )
      .map((progress) => ({
        lessonId: progress.lessonId,
        lessonTitle: progress.lesson.title,
        courseId: progress.lesson.module.course.id,
        courseSlug: progress.lesson.module.course.slug,
        courseTitle: progress.lesson.module.course.title,
        durationMinutes: progress.lesson.durationMinutes,
        completedAt: progress.completedAt,
        score: progress.score,
      })),
    earnedBadges,
  };
}

function mapCourseToLearningData(args: {
  enrollment:
    | {
        id: string;
        progressPercent: number;
        points: number;
        level: number;
        streakDays: number;
      }
    | null;
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    level: string;
    language: string;
    coverUrl: string | null;
    author: {
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
        videoUrl: string | null;
        contentText: string;
        transcript: string | null;
        aiSummary: string | null;
        durationMinutes: number;
        order: number;
        quiz:
          | {
              title: string;
              questions: unknown;
            }
          | null;
        assignment:
          | {
              title: string;
              description: string;
              rubric: unknown;
            }
          | null;
        checklist:
          | {
              items: unknown;
            }
          | null;
        quest:
          | {
              title: string;
              description: string;
              rewardPoints: number;
            }
          | null;
      }>;
    }>;
  };
  progressMap: Map<
    string,
    {
      completed: boolean;
      score: number | null;
    }
  >;
  isAdminPreview: boolean;
}): StudentLearningData {
  const { enrollment, course, progressMap, isAdminPreview } = args;

  const modules = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    order: module.order,
    lessons: module.lessons.map((lesson) => {
      const progress = progressMap.get(lesson.id);

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl,
        contentText: lesson.contentText,
        transcript: lesson.transcript,
        aiSummary: lesson.aiSummary,
        durationMinutes: lesson.durationMinutes,
        order: lesson.order,
        completed: progress?.completed ?? false,
        score: progress?.score ?? null,
        quiz: normalizeQuiz(lesson.id, lesson.quiz),
        assignment: normalizeAssignment(lesson.assignment),
        checklist: normalizeChecklist(lesson.checklist),
        quest: lesson.quest
          ? {
              title: lesson.quest.title,
              description: lesson.quest.description,
              rewardPoints: lesson.quest.rewardPoints,
            }
          : null,
      } satisfies StudentLearningLesson;
    }),
  }));

  const lessonCount = modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0,
  );
  const durationMinutes = modules.reduce(
    (sum, module) =>
      sum +
      module.lessons.reduce(
        (lessonSum, lesson) => lessonSum + lesson.durationMinutes,
        0,
      ),
    0,
  );
  const completedLessons = Array.from(progressMap.values()).filter(
    (progress) => progress.completed,
  ).length;
  const earnedBadges = getEarnedBadges(
    course.badges,
    lessonCount,
    completedLessons,
  );

  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      language: course.language,
      coverUrl: course.coverUrl,
      author: course.author,
      badges: course.badges,
      earnedBadges,
      modules,
      metrics: {
        moduleCount: modules.length,
        lessonCount,
        durationMinutes,
        completedLessons,
        earnedBadgeCount: earnedBadges.length,
      },
    },
    enrollment: {
      id: enrollment?.id ?? null,
      progressPercent: enrollment?.progressPercent ?? 0,
      points: enrollment?.points ?? 0,
      level: enrollment?.level ?? 1,
      streakDays: enrollment?.streakDays ?? 0,
    },
    viewer: {
      isAdminPreview,
    },
  };
}

export async function getStudentLearningData(
  courseId: string,
  actor: StudentActor,
): Promise<
  | { status: "ok"; data: StudentLearningData }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  const prisma = getPrismaClient();

  if (actor.role === UserRole.ADMIN) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        level: true,
        language: true,
        coverUrl: true,
        author: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        badges: {
          orderBy: { title: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            icon: true,
          },
        },
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                description: true,
                videoUrl: true,
                contentText: true,
                transcript: true,
                aiSummary: true,
                durationMinutes: true,
                order: true,
                quiz: {
                  select: {
                    title: true,
                    questions: true,
                  },
                },
                assignment: {
                  select: {
                    title: true,
                    description: true,
                    rubric: true,
                  },
                },
                checklist: {
                  select: {
                    items: true,
                  },
                },
                quest: {
                  select: {
                    title: true,
                    description: true,
                    rewardPoints: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return { status: "not_found" };
    }

    return {
      status: "ok",
      data: mapCourseToLearningData({
        enrollment: null,
        course,
        progressMap: new Map(),
        isAdminPreview: true,
      }),
    };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: actor.userId,
        courseId,
      },
    },
    select: {
      id: true,
      progressPercent: true,
      points: true,
      level: true,
      streakDays: true,
      lessonProgresses: {
        select: {
          lessonId: true,
          completed: true,
          score: true,
        },
      },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          level: true,
          language: true,
          coverUrl: true,
          author: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
          badges: {
            orderBy: { title: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              icon: true,
            },
          },
          modules: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              lessons: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  videoUrl: true,
                  contentText: true,
                  transcript: true,
                  aiSummary: true,
                  durationMinutes: true,
                  order: true,
                  quiz: {
                    select: {
                      title: true,
                      questions: true,
                    },
                  },
                  assignment: {
                    select: {
                      title: true,
                      description: true,
                      rubric: true,
                    },
                  },
                  checklist: {
                    select: {
                      items: true,
                    },
                  },
                  quest: {
                    select: {
                      title: true,
                      description: true,
                      rewardPoints: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
      },
      select: { id: true },
    });

    return course ? { status: "forbidden" } : { status: "not_found" };
  }

  const progressMap = new Map(
    enrollment.lessonProgresses.map((progress) => [
      progress.lessonId,
      {
        completed: progress.completed,
        score: progress.score,
      },
    ]),
  );

  return {
    status: "ok",
    data: mapCourseToLearningData({
      enrollment: {
        id: enrollment.id,
        progressPercent: enrollment.progressPercent,
        points: enrollment.points,
        level: enrollment.level,
        streakDays: enrollment.streakDays,
      },
      course: enrollment.course,
      progressMap,
      isAdminPreview: false,
    }),
  };
}

export async function getStudentAssistantData(
  courseId: string,
  actor: StudentActor,
): Promise<
  | { status: "ok"; data: StudentAssistantData }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  if (actor.role !== UserRole.STUDENT) {
    return { status: "forbidden" };
  }

  const prisma = getPrismaClient();
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: actor.userId,
        courseId,
      },
    },
    select: {
      progressPercent: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          level: true,
          coverUrl: true,
          author: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
          modules: {
            orderBy: {
              order: "asc",
            },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              lessons: {
                orderBy: {
                  order: "asc",
                },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  order: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
      },
      select: {
        id: true,
      },
    });

    return course ? { status: "forbidden" } : { status: "not_found" };
  }

  const messages = await prisma.aiMessage.findMany({
    where: {
      courseId,
      userId: actor.userId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  const lessonCount = enrollment.course.modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0,
  );

  return {
    status: "ok",
    data: {
      course: {
        id: enrollment.course.id,
        slug: enrollment.course.slug,
        title: enrollment.course.title,
        description: enrollment.course.description,
        category: enrollment.course.category,
        level: enrollment.course.level,
        coverUrl: enrollment.course.coverUrl,
        author: enrollment.course.author,
        metrics: {
          moduleCount: enrollment.course.modules.length,
          lessonCount,
          progressPercent: enrollment.progressPercent,
          messageCount: messages.length,
        },
      },
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAtIso: message.createdAt.toISOString(),
        createdAtLabel: formatAssistantTimestamp(message.createdAt),
      })),
    },
  };
}
