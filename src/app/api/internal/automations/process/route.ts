import { NextRequest, NextResponse } from "next/server";
import { processAutomationQueue } from "@/server/automations/engine";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const secret = process.env.AUTOMATION_CRON_SECRET?.trim();

  if (!secret) {
    return true;
  }

  return request.headers.get("x-automation-secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const result = await processAutomationQueue({
    limit: Number.isFinite(limit) ? limit : 20,
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
