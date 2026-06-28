import { Prisma, type SalesPageAnalyticsEventType } from "@prisma/client";
import { getPrismaClient } from "@/server/db";
import { recordPlatformEvent } from "@/server/events";

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function recordSalesPageAnalyticsEvent(input: {
  salesPageId: string;
  courseId: string;
  type: SalesPageAnalyticsEventType;
  visitorId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const prisma = getPrismaClient();
  const created = await prisma.salesPageAnalyticsEvent.create({
    data: {
      salesPageId: input.salesPageId,
      courseId: input.courseId,
      type: input.type,
      visitorId: input.visitorId ?? null,
      userId: input.userId ?? null,
      metadata: toInputJson(input.metadata ?? {}),
    },
  });
  const course = await prisma.course.findUnique({
    where: {
      id: input.courseId,
    },
    select: {
      authorId: true,
    },
  });

  if (!course) {
    return created;
  }

  await recordPlatformEvent({
    ownerId: course.authorId,
    courseId: input.courseId,
    source: "sales_page",
    name: input.type,
    visitorId: input.visitorId ?? null,
    metadata: {
      salesPageId: input.salesPageId,
      userId: input.userId ?? null,
      ...(input.metadata ?? {}),
    },
    timestamp: created.createdAt,
  });

  return created;
}
