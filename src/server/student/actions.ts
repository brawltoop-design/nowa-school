"use server";

import { AiMessageRole, UserRole } from "@prisma/client";
import { format, isSameDay, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { answerStudentQuestion } from "@/lib/ai";
import { getServerAuthSession } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";
import {
  buildStudentCourseAssistantContext,
  type StudentAssistantMessage,
} from "@/server/student/queries";

export type StudentActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

function buildLessonHref(courseId: string, lessonId?: string | null) {
  return lessonId ? `/learn/${courseId}?lesson=${encodeURIComponent(lessonId)}` : `/learn/${courseId}`;
}

function revalidateLearningState(courseId: string) {
  revalidatePath("/learn");
  revalidatePath(`/learn/${courseId}`);
  revalidatePath(`/learn/${courseId}/assistant`);
}

function formatAssistantMessageTimestamp(value: Date) {
  return format(value, "d MMM, HH:mm", { locale: ru });
}

function mapAssistantMessage(message: {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: Date;
}): StudentAssistantMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAtIso: message.createdAt.toISOString(),
    createdAtLabel: formatAssistantMessageTimestamp(message.createdAt),
  };
}

async function requireStudentForMutation(
  courseId: string,
  callbackPath = `/learn/${courseId}`,
) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  if (session.user.role !== UserRole.STUDENT) {
    redirect("/forbidden");
  }

  return session.user;
}

export async function completeStudentLesson(
  courseId: string,
  lessonId: string,
  nextLessonId?: string | null,
) {
  const actor = await requireStudentForMutation(courseId);
  const prisma = getPrismaClient();

  await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: actor.id,
          courseId,
        },
      },
      select: {
        id: true,
        points: true,
        level: true,
        streakDays: true,
      },
    });

    if (!enrollment) {
      throw new Error("FORBIDDEN");
    }

    const lesson = await tx.lesson.findFirst({
      where: {
        id: lessonId,
        module: {
          courseId,
        },
      },
      select: {
        id: true,
        quest: {
          select: {
            rewardPoints: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new Error("NOT_FOUND");
    }

    const existingProgress = await tx.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      select: {
        completed: true,
        completedAt: true,
        score: true,
      },
    });

    const now = new Date();

    await tx.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        completed: true,
        score: existingProgress?.score ?? null,
        completedAt: now,
      },
      update: {
        completed: true,
        completedAt: existingProgress?.completedAt ?? now,
      },
    });

    if (existingProgress?.completed) {
      return null;
    }

    const [completedLessonsCount, totalLessons, previousCompletedProgress] =
      await Promise.all([
        tx.lessonProgress.count({
          where: {
            enrollmentId: enrollment.id,
            completed: true,
          },
        }),
        tx.lesson.count({
          where: {
            module: {
              courseId,
            },
          },
        }),
        tx.lessonProgress.findFirst({
          where: {
            enrollmentId: enrollment.id,
            completed: true,
            lessonId: {
              not: lessonId,
            },
            completedAt: {
              not: null,
            },
          },
          orderBy: {
            completedAt: "desc",
          },
          select: {
            completedAt: true,
          },
        }),
      ]);

    let streakDays = enrollment.streakDays;

    if (previousCompletedProgress?.completedAt) {
      if (isSameDay(previousCompletedProgress.completedAt, now)) {
        streakDays = Math.max(1, enrollment.streakDays);
      } else if (isSameDay(previousCompletedProgress.completedAt, subDays(now, 1))) {
        streakDays = Math.max(1, enrollment.streakDays) + 1;
      } else {
        streakDays = 1;
      }
    } else {
      streakDays = 1;
    }

    const pointsDelta = 10 + (lesson.quest?.rewardPoints ?? 0);
    const points = enrollment.points + pointsDelta;
    const progressPercent = totalLessons
      ? Math.round((completedLessonsCount / totalLessons) * 100)
      : 0;
    const level = Math.floor(points / 100) + 1;

    await tx.enrollment.update({
      where: {
        id: enrollment.id,
      },
      data: {
        points,
        progressPercent,
        level,
        streakDays,
      },
    });

  });

  revalidateLearningState(courseId);

  redirect(buildLessonHref(courseId, nextLessonId ?? lessonId));
}

const quizScoreSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  score: z.number().int().min(0).max(100),
});

export async function submitStudentQuizScore(input: {
  courseId: string;
  lessonId: string;
  score: number;
}): Promise<StudentActionResult<{ score: number; bonusAwarded: number }>> {
  const actor = await requireStudentForMutation(input.courseId);
  const parsed = quizScoreSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Некорректный score.",
    };
  }

  const prisma = getPrismaClient();

  const result = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: actor.id,
          courseId: parsed.data.courseId,
        },
      },
      select: {
        id: true,
        points: true,
      },
    });

    if (!enrollment) {
      throw new Error("FORBIDDEN");
    }

    const lessonExists = await tx.lesson.findFirst({
      where: {
        id: parsed.data.lessonId,
        module: {
          courseId: parsed.data.courseId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!lessonExists) {
      throw new Error("NOT_FOUND");
    }

    const existingProgress = await tx.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: parsed.data.lessonId,
        },
      },
      select: {
        score: true,
        completed: true,
        completedAt: true,
      },
    });

    const bonusAwarded =
      parsed.data.score >= 80 && (existingProgress?.score ?? -1) < 80 ? 20 : 0;

    await tx.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: parsed.data.lessonId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId: parsed.data.lessonId,
        completed: false,
        score: parsed.data.score,
      },
      update: {
        score: parsed.data.score,
      },
    });

    if (bonusAwarded) {
      const points = enrollment.points + bonusAwarded;
      const level = Math.floor(points / 100) + 1;

      await tx.enrollment.update({
        where: {
          id: enrollment.id,
        },
        data: {
          points,
          level,
        },
      });
    }

    return bonusAwarded;
  });

  revalidateLearningState(parsed.data.courseId);

  return {
    success: true,
    message:
      result > 0
        ? `Сохранили score ${parsed.data.score}%. Бонус +${result} points уже начислен.`
        : `Сохранили score ${parsed.data.score}%.`,
    data: {
      score: parsed.data.score,
      bonusAwarded: result,
    },
  };
}

const assistantQuestionSchema = z.object({
  courseId: z.string().min(1),
  question: z.string().trim().min(3).max(2000),
});

export async function askStudentAssistantQuestion(input: {
  courseId: string;
  question: string;
}): Promise<
  StudentActionResult<{
    userMessage: StudentAssistantMessage;
    assistantMessage: StudentAssistantMessage;
  }>
> {
  const actor = await requireStudentForMutation(
    input.courseId,
    `/learn/${input.courseId}/assistant`,
  );
  const parsed = assistantQuestionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Вопрос должен быть чуть подробнее.",
    };
  }

  const prisma = getPrismaClient();
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: actor.id,
        courseId: parsed.data.courseId,
      },
    },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          modules: {
            orderBy: {
              order: "asc",
            },
            select: {
              title: true,
              description: true,
              order: true,
              lessons: {
                orderBy: {
                  order: "asc",
                },
                select: {
                  title: true,
                  description: true,
                  contentText: true,
                  transcript: true,
                  aiSummary: true,
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
    return {
      success: false,
      message: "Этот assistant доступен только после покупки курса.",
    };
  }

  const question = parsed.data.question.trim();
  const userMessage = await prisma.aiMessage.create({
    data: {
      courseId: parsed.data.courseId,
      userId: actor.id,
      role: AiMessageRole.USER,
      content: question,
    },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  let assistantContent = "Сейчас не получилось подготовить ответ. Попробуй еще раз.";
  let success = false;
  let resultMessage = "Не удалось получить ответ AI. Попробуй еще раз чуть позже.";

  try {
    const response = await answerStudentQuestion({
      courseContext: buildStudentCourseAssistantContext(enrollment.course),
      question,
    });
    assistantContent = response.answer;
    success = true;
    resultMessage = "Ответ готов.";
  } catch {
    success = false;
  }

  const assistantMessage = await prisma.aiMessage.create({
    data: {
      courseId: parsed.data.courseId,
      userId: actor.id,
      role: AiMessageRole.ASSISTANT,
      content: assistantContent,
    },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  revalidatePath(`/learn/${parsed.data.courseId}/assistant`);

  return {
    success,
    message: resultMessage,
    data: {
      userMessage: mapAssistantMessage(userMessage),
      assistantMessage: mapAssistantMessage(assistantMessage),
    },
  };
}
