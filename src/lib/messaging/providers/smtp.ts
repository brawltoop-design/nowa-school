import nodemailer from "nodemailer";
import type { MessagingProvider } from "@/lib/messaging/types";
import { getAppUrl } from "@/server/app-url";

let transporter:
  | ReturnType<typeof nodemailer.createTransport>
  | null = null;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? "587");

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.isFinite(port) ? port : 587,
      secure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  return transporter;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHtmlBody(input: {
  html?: string | null;
  text: string;
  trackingPixelUrl?: string | null;
  unsubscribeUrl?: string | null;
}) {
  const baseHtml =
    input.html?.trim() ||
    input.text
      .split("\n")
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("");

  const unsubscribeBlock = input.unsubscribeUrl
    ? `<p><a href="${escapeHtml(input.unsubscribeUrl)}">Отписаться от сообщений</a></p>`
    : "";
  const trackingPixel = input.trackingPixelUrl
    ? `<img src="${escapeHtml(
        input.trackingPixelUrl,
      )}" width="1" height="1" alt="" style="display:block;border:0;outline:none;text-decoration:none" />`
    : "";

  return `${baseHtml}${unsubscribeBlock}${trackingPixel}`;
}

export const smtpMessagingProvider: MessagingProvider = {
  name: "SMTP",
  async sendMessage(input) {
    const from = process.env.SMTP_FROM?.trim();

    if (!process.env.SMTP_HOST || !from) {
      return {
        provider: "SMTP",
        status: "skipped",
        externalMessageId: null,
        skipReason: "smtp_not_configured",
      };
    }

    if (!input.recipient.email) {
      return {
        provider: "SMTP",
        status: "skipped",
        externalMessageId: null,
        skipReason: "email_missing",
      };
    }

    const unsubscribeUrl = input.recipient.unsubscribeToken
      ? `${getAppUrl()}/unsubscribe/${encodeURIComponent(input.recipient.unsubscribeToken)}?channel=email`
      : null;
    const text = unsubscribeUrl
      ? `${input.payload.text}\n\nОтписаться: ${unsubscribeUrl}`
      : input.payload.text;

    const info = await getTransporter().sendMail({
      from,
      to: input.recipient.email,
      subject: input.payload.subject?.trim() || "Nowa School",
      text,
      html: buildHtmlBody({
        html: input.payload.html,
        text: input.payload.text,
        trackingPixelUrl: input.payload.trackingPixelUrl,
        unsubscribeUrl,
      }),
    });

    return {
      provider: "SMTP",
      status: "sent",
      externalMessageId: info.messageId ?? null,
    };
  },
};
