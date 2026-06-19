"use server";

import { CourseStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerAuthSession } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";

async function requireAdminActor() {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return null;
  }

  return {
    userId: session.user.id,
  };
}

function revalidateAdminSurfaces(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/users");
  revalidatePath("/admin/orders");
  revalidatePath("/courses");

  if (slug) {
    revalidatePath(`/courses/${slug}`);
  }
}

export async function updateAdminCourseStatus(
  courseId: string,
  status: CourseStatus,
): Promise<void> {
  const actor = await requireAdminActor();

  if (!actor) {
    return;
  }

  if (!Object.values(CourseStatus).includes(status)) {
    return;
  }

  const prisma = getPrismaClient();
  const course = await prisma.course.update({
    where: {
      id: courseId,
    },
    data: {
      status,
    },
    select: {
      slug: true,
    },
  });

  revalidateAdminSurfaces(course.slug);
}

export async function updateAdminUserRole(
  userId: string,
  formData: FormData,
): Promise<void> {
  const actor = await requireAdminActor();

  if (!actor) {
    return;
  }

  if (actor.userId === userId) {
    return;
  }

  const nextRole = formData.get("role");

  if (nextRole !== UserRole.STUDENT && nextRole !== UserRole.AUTHOR) {
    return;
  }

  const prisma = getPrismaClient();
  const target = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      role: true,
    },
  });

  if (!target) {
    return;
  }

  if (target.role === UserRole.ADMIN) {
    return;
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role: nextRole,
    },
  });

  revalidateAdminSurfaces();
}
