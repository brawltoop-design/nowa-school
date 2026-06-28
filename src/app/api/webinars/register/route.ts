import { NextResponse } from "next/server";
import { normalizeEmail, normalizeTelegramUsername } from "@/lib/automations";
import { recordContactLifecycleEvent } from "@/server/automations/engine";
import { getPrismaClient } from "@/server/db";
import { guardPublicFormSubmission } from "@/server/public-security";

type WebinarRegistrationPayload = {
  authorId?: string;
  courseId?: string;
  webinarId?: string;
  webinarSlug?: string;
  webinarTitle?: string;
  fullName?: string;
  email?: string;
  telegramUsername?: string;
  source?: string;
  visitorId?: string;
  pagePath?: string;
  utm?: Record<string, unknown>;
  personalDataConsentGranted?: boolean;
  emailConsentGranted?: boolean;
  telegramConsentGranted?: boolean;
  honeypotValue?: string;
  formStartedAt?: string | number;
};

function buildWebinarKey(body: WebinarRegistrationPayload) {
  return (
    body.webinarId?.trim() ||
    body.webinarSlug?.trim() ||
    body.pagePath?.trim() ||
    "webinar"
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | WebinarRegistrationPayload
    | null;

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
  const webinarKey = buildWebinarKey(body);

  try {
    await guardPublicFormSubmission({
      headers: request.headers,
      scope: "public_webinar_registration",
      extraKey: `${authorId}:${courseId ?? "any"}:${webinarKey}:${identityKey}`,
      honeypotValue: body.honeypotValue ?? null,
      startedAt: body.formStartedAt ?? null,
    });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "RATE_LIMITED" ? 429 : 400;

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "WEBINAR_REGISTRATION_BLOCKED",
      },
      { status },
    );
  }

  const result = await recordContactLifecycleEvent({
    authorId,
    courseId,
    type: "WEBINAR_REGISTERED",
    eventKey: `webinar:${authorId}:${courseId ?? "any"}:${webinarKey}:${identityKey}`,
    metadata: {
      webinarId: body.webinarId?.trim() || null,
      webinarSlug: body.webinarSlug?.trim() || null,
      webinarTitle: body.webinarTitle?.trim() || null,
      pagePath: body.pagePath?.trim() || null,
      source: body.source?.trim() || "webinar",
      ...(body.utm ?? {}),
      consents: {
        personalDataConsentGranted: true,
        emailConsentGranted: Boolean(body.emailConsentGranted),
        telegramConsentGranted: Boolean(body.telegramConsentGranted),
        capturedAt: new Date().toISOString(),
      },
    },
    contact: {
      fullName: body.fullName?.trim() || null,
      email: body.email?.trim() || null,
      telegramUsername: body.telegramUsername?.trim() || null,
      source: body.source?.trim() || "webinar",
      visitorId: body.visitorId?.trim() || null,
      personalDataConsentGranted: true,
      emailConsentGranted: Boolean(body.emailConsentGranted),
      telegramConsentGranted: Boolean(body.telegramConsentGranted),
    },
  });

  return NextResponse.json({
    ok: true,
    stored: true,
    contactId: result.contactId,
    scheduledRuns: result.scheduledRuns,
  });
}
