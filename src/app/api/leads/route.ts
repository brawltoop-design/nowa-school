import { NextResponse } from "next/server";
import { normalizeEmail, normalizeTelegramUsername } from "@/lib/automations";
import { recordContactLifecycleEvent } from "@/server/automations/engine";
import { getPrismaClient } from "@/server/db";
import { guardPublicFormSubmission } from "@/server/public-security";

type LeadPayload = {
  authorId?: string;
  courseId?: string;
  fullName?: string;
  email?: string;
  telegramUsername?: string;
  source?: string;
  visitorId?: string;
  personalDataConsentGranted?: boolean;
  emailConsentGranted?: boolean;
  telegramConsentGranted?: boolean;
  pagePath?: string;
  utm?: Record<string, unknown>;
  honeypotValue?: string;
  formStartedAt?: string | number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LeadPayload | null;

  if (!body) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.personalDataConsentGranted) {
    return NextResponse.json(
      { ok: false, error: "PERSONAL_DATA_CONSENT_REQUIRED" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  let authorId = body.authorId?.trim() || null;
  const courseId = body.courseId?.trim() || null;

  if (!authorId && courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        authorId: true,
      },
    });

    authorId = course?.authorId ?? null;
  }

  if (!authorId) {
    return NextResponse.json({
      ok: true,
      stored: false,
    });
  }

  const identityKey =
    body.visitorId?.trim() ||
    normalizeEmail(body.email) ||
    normalizeTelegramUsername(body.telegramUsername) ||
    "anonymous";

  try {
    await guardPublicFormSubmission({
      headers: request.headers,
      scope: "public_lead_capture",
      extraKey: `${authorId}:${courseId ?? "any"}:${identityKey}`,
      honeypotValue: body.honeypotValue ?? null,
      startedAt: body.formStartedAt ?? null,
    });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "RATE_LIMITED" ? 429 : 400;

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "LEAD_CAPTURE_BLOCKED",
      },
      { status },
    );
  }

  await recordContactLifecycleEvent({
    authorId,
    courseId,
    type: "LEAD_CAPTURED",
    eventKey: `lead:${authorId}:${courseId ?? "any"}:${identityKey}`,
    metadata: {
      source: body.source?.trim() || "public_form",
      pagePath: body.pagePath?.trim() || null,
      ...(body.utm ?? {}),
      consents: {
        personalDataConsentGranted: Boolean(body.personalDataConsentGranted),
        emailConsentGranted: Boolean(body.emailConsentGranted),
        telegramConsentGranted: Boolean(body.telegramConsentGranted),
        capturedAt: new Date().toISOString(),
      },
    },
    contact: {
      fullName: body.fullName?.trim() || null,
      email: body.email?.trim() || null,
      telegramUsername: body.telegramUsername?.trim() || null,
      source: body.source?.trim() || "public_form",
      visitorId: body.visitorId?.trim() || null,
      personalDataConsentGranted: true,
      emailConsentGranted: Boolean(body.emailConsentGranted),
      telegramConsentGranted: Boolean(body.telegramConsentGranted),
    },
  });

  return NextResponse.json({
    ok: true,
    stored: true,
  });
}
