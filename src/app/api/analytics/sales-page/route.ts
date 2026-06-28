import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth/session";
import { recordSalesPageAnalyticsEvent } from "@/server/sales-page/analytics";
import { guardPublicAnalyticsRequest } from "@/server/public-security";
import { salesPageAnalyticsEventSchema } from "@/lib/validators/sales-page";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    const body = await request.json();
    const parsed = salesPageAnalyticsEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid analytics payload.",
        },
        { status: 400 },
      );
    }

    try {
      await guardPublicAnalyticsRequest({
        headers: request.headers,
        scope: "sales_page_analytics",
        extraKey: [
          parsed.data.salesPageId,
          parsed.data.courseId,
          parsed.data.visitorId ?? "anonymous",
          parsed.data.type,
        ].join(":"),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMITED") {
        return NextResponse.json({
          success: true,
          limited: true,
        });
      }

      throw error;
    }

    await recordSalesPageAnalyticsEvent({
      salesPageId: parsed.data.salesPageId,
      courseId: parsed.data.courseId,
      type: parsed.data.type,
      visitorId: parsed.data.visitorId ?? null,
      userId: session?.user?.id ?? null,
      metadata: parsed.data.metadata,
    });

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 },
    );
  }
}
