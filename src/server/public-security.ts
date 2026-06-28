import { createHash } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db";

type DbClient = PrismaClient | Prisma.TransactionClient;
type HeaderBag = Pick<Headers, "get">;

function getPublicFormLimitMax() {
  const raw = Number(process.env.PUBLIC_FORM_RATE_LIMIT_MAX ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : 6;
}

function getPublicFormWindowMs() {
  const raw = Number(process.env.PUBLIC_FORM_RATE_LIMIT_WINDOW_MS ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : 10 * 60_000;
}

function getPublicAnalyticsLimitMax() {
  const raw = Number(process.env.PUBLIC_ANALYTICS_RATE_LIMIT_MAX ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : 120;
}

function getPublicAnalyticsWindowMs() {
  const raw = Number(process.env.PUBLIC_ANALYTICS_RATE_LIMIT_WINDOW_MS ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
}

function getMinimumSubmitDelayMs() {
  const raw = Number(process.env.PUBLIC_FORM_MIN_SUBMIT_DELAY_MS ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : 1200;
}

function getHeaderValue(headers: HeaderBag, name: string) {
  return headers.get(name)?.trim() || "";
}

function getClientIp(headers: HeaderBag) {
  const forwarded = getHeaderValue(headers, "x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "";
  }

  return (
    getHeaderValue(headers, "x-real-ip") ||
    getHeaderValue(headers, "cf-connecting-ip") ||
    ""
  );
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildRateLimitIdentity(input: {
  headers: HeaderBag;
  scope: string;
  extraKey?: string | null;
}) {
  const ip = getClientIp(input.headers);
  const userAgent = getHeaderValue(input.headers, "user-agent");

  return hashValue(
    [
      input.scope,
      ip || "no-ip",
      userAgent || "no-user-agent",
      input.extraKey?.trim() || "no-extra-key",
    ].join("|"),
  );
}

export async function enforceRequestRateLimit(
  input: {
    headers: HeaderBag;
    scope: string;
    extraKey?: string | null;
    max: number;
    windowMs: number;
  },
  db: DbClient = getPrismaClient(),
) {
  const now = Date.now();
  const windowStart = Math.floor(now / input.windowMs) * input.windowMs;
  const windowStartDate = new Date(windowStart);
  const expiresAt = new Date(windowStart + input.windowMs);
  const bucketKey = buildRateLimitIdentity(input);
  const bucketId = hashValue(
    `${input.scope}:${bucketKey}:${windowStart}:${input.windowMs}`,
  );

  const bucket = await db.rateLimitBucket.upsert({
    where: {
      scope_key_windowStart: {
        scope: input.scope,
        key: bucketKey,
        windowStart: windowStartDate,
      },
    },
    update: {
      hits: {
        increment: 1,
      },
      expiresAt,
    },
    create: {
      id: bucketId,
      scope: input.scope,
      key: bucketKey,
      windowStart: windowStartDate,
      hits: 1,
      expiresAt,
    },
  });

  if (bucket.hits > input.max) {
    throw new Error("RATE_LIMITED");
  }

  if (Math.random() < 0.02) {
    void db.rateLimitBucket.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}

export function assertHumanFormSubmission(input: {
  honeypotValue?: string | null;
  startedAt?: string | number | null;
  minDelayMs?: number;
}) {
  if (input.honeypotValue?.trim()) {
    throw new Error("BOT_DETECTED");
  }

  const minDelayMs = input.minDelayMs ?? getMinimumSubmitDelayMs();
  const rawStartedAt =
    typeof input.startedAt === "number"
      ? input.startedAt
      : typeof input.startedAt === "string"
        ? Number(input.startedAt)
        : Number.NaN;

  if (!Number.isFinite(rawStartedAt)) {
    throw new Error("FORM_STARTED_AT_MISSING");
  }

  if (Date.now() - rawStartedAt < minDelayMs) {
    throw new Error("FORM_SUBMITTED_TOO_FAST");
  }
}

export async function guardPublicFormSubmission(
  input: {
    headers: HeaderBag;
    scope: string;
    extraKey?: string | null;
    honeypotValue?: string | null;
    startedAt?: string | number | null;
  },
  db: DbClient = getPrismaClient(),
) {
  assertHumanFormSubmission({
    honeypotValue: input.honeypotValue,
    startedAt: input.startedAt,
  });

  await enforceRequestRateLimit(
    {
      headers: input.headers,
      scope: input.scope,
      extraKey: input.extraKey,
      max: getPublicFormLimitMax(),
      windowMs: getPublicFormWindowMs(),
    },
    db,
  );
}

export async function guardPublicAnalyticsRequest(
  input: {
    headers: HeaderBag;
    scope: string;
    extraKey?: string | null;
  },
  db: DbClient = getPrismaClient(),
) {
  await enforceRequestRateLimit(
    {
      headers: input.headers,
      scope: input.scope,
      extraKey: input.extraKey,
      max: getPublicAnalyticsLimitMax(),
      windowMs: getPublicAnalyticsWindowMs(),
    },
    db,
  );
}
