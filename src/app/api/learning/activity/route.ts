import { NextResponse } from "next/server";
import { recordContactLifecycleEvent } from "@/server/automations/engine";
import { getServerAuthSession } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { courseId?: string }
    | null;
  const courseId = body?.courseId?.trim();

  if (!courseId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      authorId: true,
      slug: true,
    },
  });

  if (!course) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await prisma.enrollment.updateMany({
    where: {
      userId: session.user.id,
      courseId,
    },
    data: {
      lastActivityAt: new Date(),
    },
  });

  const dayKey = new Date().toISOString().slice(0, 10);

  await recordContactLifecycleEvent({
    authorId: course.authorId,
    courseId: course.id,
    type: "COURSE_VIEWED",
    eventKey: `course_view:${session.user.id}:${course.id}:${dayKey}`,
    metadata: {
      source: "learning_activity",
    },
    contact: {
      userId: session.user.id,
      fullName: session.user.name,
      email: session.user.email,
      source: `learn:${course.slug}`,
      isStudent: true,
    },
  });

  return NextResponse.json({ ok: true });
}
