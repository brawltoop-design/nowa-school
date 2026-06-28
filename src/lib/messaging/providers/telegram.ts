import type { MessagingProvider } from "@/lib/messaging/types";
import { getAppUrl } from "@/server/app-url";

function getTelegramChatId(metadata: Record<string, unknown> | null | undefined) {
  const rawValue = metadata?.telegramChatId;
  return typeof rawValue === "string" && rawValue.trim()
    ? rawValue.trim()
    : null;
}

export const telegramMessagingProvider: MessagingProvider = {
  name: "TELEGRAM",
  async sendMessage(input) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

    if (!botToken) {
      return {
        provider: "TELEGRAM",
        status: "skipped",
        externalMessageId: null,
        skipReason: "telegram_not_configured",
      };
    }

    const chatId =
      getTelegramChatId(input.recipient.metadata) ??
      process.env.TELEGRAM_DEFAULT_CHAT_ID?.trim() ??
      null;

    if (!chatId) {
      return {
        provider: "TELEGRAM",
        status: "skipped",
        externalMessageId: null,
        skipReason: "telegram_chat_id_missing",
      };
    }

    const unsubscribeUrl = input.recipient.unsubscribeToken
      ? `${getAppUrl()}/unsubscribe/${encodeURIComponent(input.recipient.unsubscribeToken)}?channel=telegram`
      : null;

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: unsubscribeUrl
            ? `${input.payload.text}\n\nОтписаться: ${unsubscribeUrl}`
            : input.payload.text,
          disable_web_page_preview: true,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Telegram send failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      result?: {
        message_id?: number;
      };
    };

    if (!payload.ok) {
      throw new Error("Telegram API returned a non-ok response.");
    }

    return {
      provider: "TELEGRAM",
      status: "sent",
      externalMessageId: payload.result?.message_id
        ? String(payload.result.message_id)
        : null,
    };
  },
};
