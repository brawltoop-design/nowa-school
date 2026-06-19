import { Prisma, type SalesPageAnalyticsEventType } from "@prisma/client";
import { getPrismaClient } from "@/server/db";

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

  await prisma.salesPageAnalyticsEvent.create({
    data: {
      salesPageId: input.salesPageId,
      courseId: input.courseId,
      type: input.type,
      visitorId: input.visitorId ?? null,
      userId: input.userId ?? null,
      metadata: toInputJson(input.metadata ?? {}),
    },
  });
}
