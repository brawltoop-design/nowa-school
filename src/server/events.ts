import { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db";

type DbClient = PrismaClient | Prisma.TransactionClient;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
] as const;

type PlatformEventInput = {
  ownerId: string;
  source: string;
  name: string;
  eventKey?: string | null;
  contactId?: string | null;
  courseId?: string | null;
  orderId?: string | null;
  visitorId?: string | null;
  utm?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  timestamp?: Date;
};

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function extractEventUtm(value: unknown) {
  const source = asRecord(value);

  return UTM_KEYS.reduce<Record<string, string>>((acc, key) => {
    const current = source[key];

    if (typeof current === "string" && current.trim()) {
      acc[key] = current.trim();
    }

    return acc;
  }, {});
}

export async function recordPlatformEvent(
  input: PlatformEventInput,
  db: DbClient = getPrismaClient(),
) {
  const utm = input.utm ? extractEventUtm(input.utm) : extractEventUtm(input.metadata);
  const payload = {
    ownerId: input.ownerId,
    contactId: input.contactId ?? null,
    courseId: input.courseId ?? null,
    orderId: input.orderId ?? null,
    source: input.source.trim().toLowerCase(),
    name: input.name.trim().toLowerCase(),
    visitorId: input.visitorId?.trim() || null,
    utm: toInputJson(utm),
    metadata: toInputJson(input.metadata ?? {}),
    timestamp: input.timestamp ?? new Date(),
  };

  if (input.eventKey?.trim()) {
    return db.event.upsert({
      where: {
        ownerId_name_eventKey: {
          ownerId: payload.ownerId,
          name: payload.name,
          eventKey: input.eventKey.trim(),
        },
      },
      update: {
        contactId: payload.contactId,
        courseId: payload.courseId,
        orderId: payload.orderId,
        source: payload.source,
        visitorId: payload.visitorId,
        utm: payload.utm,
        metadata: payload.metadata,
        timestamp: payload.timestamp,
      },
      create: {
        ...payload,
        eventKey: input.eventKey.trim(),
      },
    });
  }

  return db.event.create({
    data: payload,
  });
}
