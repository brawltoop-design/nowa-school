import { NextResponse } from "next/server";
import { processInstallmentWebhook } from "@/server/billing/service";

type InstallmentWebhookRouteProps = {
  params: Promise<{ provider: string }>;
};

function getSignatureHeader(request: Request) {
  return (
    request.headers.get("x-mock-signature") ??
    request.headers.get("x-provider-signature") ??
    request.headers.get("x-signature")
  );
}

export async function POST(
  request: Request,
  { params }: InstallmentWebhookRouteProps,
) {
  const { provider } = await params;
  const rawBody = await request.text();

  try {
    const result = await processInstallmentWebhook({
      provider,
      rawBody,
      signatureHeader: getSignatureHeader(request),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
      { status: 400 },
    );
  }
}
