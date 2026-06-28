import type { MessageChannel, MessageProvider } from "@prisma/client";

export type MessagingRecipient = {
  contactId: string;
  fullName?: string | null;
  email?: string | null;
  telegramUsername?: string | null;
  metadata?: Record<string, unknown> | null;
  unsubscribeToken?: string | null;
};

export type MessagingPayload = {
  channel: MessageChannel;
  dedupeKey: string;
  subject?: string | null;
  text: string;
  html?: string | null;
  trackingPixelUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type MessagingSendInput = {
  authorId: string;
  messageId: string;
  recipient: MessagingRecipient;
  payload: MessagingPayload;
};

export type MessagingSendResult = {
  provider: MessageProvider;
  status: "sent" | "skipped";
  externalMessageId: string | null;
  skipReason?: string;
  metadata?: Record<string, unknown>;
};

export interface MessagingProvider {
  readonly name: MessageProvider;
  sendMessage(input: MessagingSendInput): Promise<MessagingSendResult>;
}
