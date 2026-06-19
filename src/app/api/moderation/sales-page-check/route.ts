import { NextResponse } from "next/server";
import { runSalesPageModerationCheck } from "@/server/sales-page/moderation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = runSalesPageModerationCheck({
      title: typeof body?.title === "string" ? body.title : "",
      metaTitle: typeof body?.metaTitle === "string" ? body.metaTitle : null,
      metaDescription:
        typeof body?.metaDescription === "string" ? body.metaDescription : null,
      blocks: Array.isArray(body?.blocks) ? body.blocks : [],
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        passed: false,
        issues: [
          {
            type: "OTHER",
            severity: "MEDIUM",
            message: "Не удалось выполнить moderation check.",
          },
        ],
        suggestions: [],
      },
      { status: 400 },
    );
  }
}
