import { NextResponse } from "next/server";
import { processPaymentWebhook } from "@/server/billing/service";

type PaymentWebhookRouteProps = {
  params: Promise<{ provider: string }>;
};

function getSignatureHeader(request: Request) {
  return (
    request.headers.get("stripe-signature") ??
    request.headers.get("x-mock-signature") ??
    request.headers.get("x-provider-signature") ??
    request.headers.get("x-signature")
  );
}

export async function POST(request: Request, { params }: PaymentWebhookRouteProps) {
  const { provider } = await params;
  const rawBody = await request.text();

  try {
    const result = await processPaymentWebhook({
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
