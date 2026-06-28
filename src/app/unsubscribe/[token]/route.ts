import { NextResponse } from "next/server";
import { getPrismaClient } from "@/server/db";

function renderHtml(title: string, body: string) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Inter, system-ui, sans-serif; background: #f5f7ff; color: #111827; margin: 0; }
      main { max-width: 520px; margin: 10vh auto; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 16px 60px rgba(17, 24, 39, 0.08); }
      h1 { font-size: 28px; margin: 0 0 12px; }
      p { line-height: 1.6; color: rgba(17, 24, 39, 0.72); margin: 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
    </main>
  </body>
</html>`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const channel = new URL(request.url).searchParams.get("channel")?.toLowerCase() ?? "";
  const prisma = getPrismaClient();
  const contact = await prisma.contact.findUnique({
    where: {
      unsubscribeToken: token,
    },
    select: {
      id: true,
      globalUnsubscribedAt: true,
    },
  });

  if (!contact) {
    return new NextResponse(
      renderHtml(
        "Ссылка недействительна",
        "Похоже, ссылка отписки устарела или уже недоступна.",
      ),
      {
        status: 404,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      },
    );
  }

  if (!contact.globalUnsubscribedAt) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        globalUnsubscribedAt: new Date(),
        ...(channel === "email" ? { emailUnsubscribedAt: new Date() } : {}),
        ...(channel === "telegram" ? { telegramUnsubscribedAt: new Date() } : {}),
      },
    });
  }

  return new NextResponse(
    renderHtml(
      "Готово",
      "Мы больше не будем отправлять тебе автоматические сообщения из Nowa School.",
    ),
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
}
