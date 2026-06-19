import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth/session";
import { recordSalesPageAnalyticsEvent } from "@/server/sales-page/analytics";
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
