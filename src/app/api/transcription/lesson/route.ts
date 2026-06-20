import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { transcribeAudioOrVideo } from "@/lib/transcription";
import { getServerAuthSession } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";

const transcriptionRequestSchema = z.object({
  lessonId: z.string().min(1),
  fileUrl: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();

    if (
      !session?.user ||
      (session.user.role !== UserRole.AUTHOR &&
        session.user.role !== UserRole.ADMIN)
    ) {
      return NextResponse.json(
        { message: "Доступ запрещен." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = transcriptionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Проверь lessonId и fileUrl.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const lesson = await prisma.lesson.findUnique({
      where: { id: parsed.data.lessonId },
      include: {
        module: {
          include: {
            course: {
              select: {
                id: true,
                authorId: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { message: "Урок не найден." },
        { status: 404 },
      );
    }

    if (
      session.user.role !== UserRole.ADMIN &&
      lesson.module.course.authorId !== session.user.id
    ) {
      return NextResponse.json(
        { message: "Недостаточно прав." },
        { status: 403 },
      );
    }

    const result = await transcribeAudioOrVideo({
      lessonId: lesson.id,
      fileUrl: parsed.data.fileUrl,
    });

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        transcript: result.transcript,
        ...(typeof result.durationMinutes === "number"
          ? { durationMinutes: result.durationMinutes }
          : {}),
      },
    });

    return NextResponse.json({
      ...result,
      demo: result.provider === "mock",
      warning:
        result.provider === "mock" ? "Сгенерирован демо-транскрипт." : null,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Не удалось сгенерировать транскрипт.",
      },
      { status: 500 },
    );
  }
}
