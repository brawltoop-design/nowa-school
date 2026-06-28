import type { MessageChannel, MessageProvider } from "@prisma/client";
import { mockMessagingProvider } from "@/lib/messaging/providers/mock";
import { smtpMessagingProvider } from "@/lib/messaging/providers/smtp";
import { telegramMessagingProvider } from "@/lib/messaging/providers/telegram";
import type { MessagingProvider as MessagingProviderContract } from "@/lib/messaging/types";

function normalizeConfiguredProvider(
  value: string | undefined,
): MessageProvider | null {
  switch (value?.trim().toLowerCase()) {
    case "telegram":
      return "TELEGRAM";
    case "smtp":
    case "email":
      return "SMTP";
    case "mock":
      return "MOCK";
    default:
      return null;
  }
}

export function getActiveMessagingProviderName(
  channel: MessageChannel,
): MessageProvider {
  const explicit =
    channel === "EMAIL"
      ? normalizeConfiguredProvider(
          process.env.EMAIL_MESSAGING_PROVIDER ?? process.env.MESSAGING_PROVIDER,
        )
      : normalizeConfiguredProvider(
          process.env.TELEGRAM_MESSAGING_PROVIDER ??
            process.env.MESSAGING_PROVIDER,
        );

  if (explicit) {
    return explicit;
  }

  if (channel === "TELEGRAM" && process.env.TELEGRAM_BOT_TOKEN) {
    return "TELEGRAM";
  }

  if (channel === "EMAIL" && process.env.SMTP_HOST && process.env.SMTP_FROM) {
    return "SMTP";
  }

  return "MOCK";
}

export function getMessagingProvider(
  channel: MessageChannel,
): MessagingProviderContract {
  switch (getActiveMessagingProviderName(channel)) {
    case "TELEGRAM":
      return telegramMessagingProvider;
    case "SMTP":
      return smtpMessagingProvider;
    default:
      return mockMessagingProvider;
  }
}

export * from "@/lib/messaging/types";
