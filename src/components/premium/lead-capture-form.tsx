"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { PremiumButton } from "@/components/premium/premium-button";
import { Input } from "@/components/ui/input";
import {
  PUBLIC_FORM_HONEYPOT_FIELD,
  PUBLIC_FORM_STARTED_AT_FIELD,
} from "@/lib/public-form-security";
import { cn } from "@/lib/utils";

type LeadCaptureFormProps = {
  authorId?: string;
  courseId?: string;
  source?: string;
  buttonLabel?: string;
  compact?: boolean;
  title?: string;
  description?: string;
  className?: string;
};

function getOrCreateVisitorId() {
  if (typeof window === "undefined") {
    return "";
  }

  const storageKey = "nsai-visitor-id";
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    document.cookie = `nsai_visitor_id=${existing}; path=/; max-age=31536000; samesite=lax`;
    return existing;
  }

  const nextId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `visitor_${Date.now()}`;

  window.localStorage.setItem(storageKey, nextId);
  document.cookie = `nsai_visitor_id=${nextId}; path=/; max-age=31536000; samesite=lax`;
  return nextId;
}

function collectUtmParams() {
  if (typeof window === "undefined") {
    return {};
  }

  const searchParams = new URLSearchParams(window.location.search);
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "ref",
  ] as const;

  return keys.reduce<Record<string, string>>((acc, key) => {
    const value = searchParams.get(key);

    if (value?.trim()) {
      acc[key] = value.trim();
    }

    return acc;
  }, {});
}

export function LeadCaptureForm({
  authorId,
  courseId,
  source = "marketing_site",
  buttonLabel = "Получить доступ",
  compact = false,
  title,
  description,
  className,
}: LeadCaptureFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState("");
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now());
  const resolvedAuthorId = useMemo(
    () => authorId ?? process.env.NEXT_PUBLIC_MARKETING_AUTHOR_ID ?? "",
    [authorId],
  );

  useEffect(() => {
    setVisitorId(getOrCreateVisitorId());
  }, []);

  const content = submitted ? (
    <div className="rounded-[1.6rem] border border-[#3d3bff]/15 bg-[#eef0ff] px-5 py-4 text-sm font-medium text-[#3432dc]">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4" />
        Заявка сохранена. Дальше можно спокойно дожимать через CRM, Telegram или email.
      </div>
    </div>
  ) : (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        const form = event.currentTarget;
        const formData = new FormData(form);
        const payload = {
          authorId: resolvedAuthorId || undefined,
          courseId: courseId || undefined,
          email: (formData.get("email") as string | null)?.trim() || undefined,
          telegramUsername:
            (formData.get("telegramUsername") as string | null)?.trim() || undefined,
          source,
          visitorId: visitorId || undefined,
          personalDataConsentGranted: formData.get("personalDataConsent") === "on",
          emailConsentGranted: formData.get("emailMarketingConsent") === "on",
          telegramConsentGranted:
            formData.get("telegramMarketingConsent") === "on",
          honeypotValue:
            (formData.get(PUBLIC_FORM_HONEYPOT_FIELD) as string | null)?.trim() ||
            undefined,
          formStartedAt,
          pagePath:
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : undefined,
          utm: collectUtmParams(),
        };

        try {
          const response = await fetch("/api/leads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          const result = (await response.json().catch(() => null)) as
            | { error?: string; stored?: boolean }
            | null;

          if (!response.ok) {
            throw new Error(result?.error ?? "LEAD_CAPTURE_FAILED");
          }

          if (result?.stored === false) {
            throw new Error("MARKETING_AUTHOR_NOT_CONFIGURED");
          }

          setSubmitted(true);
          form.reset();
        } catch (submissionError) {
          const message =
            submissionError instanceof Error ? submissionError.message : "";

          setError(
            message === "RATE_LIMITED"
              ? "Слишком много отправок подряд. Давай попробуем чуть позже."
              : message === "MARKETING_AUTHOR_NOT_CONFIGURED"
                ? "Форма не привязана к автору. Нужно указать marketing owner в env или передать authorId."
                : "Не получилось сохранить заявку. Проверь поля и попробуй ещё раз.",
          );
          setFormStartedAt(Date.now());
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-4"
    >
      <input
        type="text"
        name={PUBLIC_FORM_HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
      />
      <input
        type="hidden"
        name={PUBLIC_FORM_STARTED_AT_FIELD}
        value={String(formStartedAt)}
      />

      <div
        className={
          compact
            ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        }
      >
        <Input
          required
          name="email"
          type="email"
          placeholder="Email"
          className="h-[52px] rounded-full bg-white"
        />
        {!compact ? (
          <Input
            name="telegramUsername"
            placeholder="Telegram username"
            className="h-[52px] rounded-full bg-white"
          />
        ) : null}
        <PremiumButton
          type="submit"
          disabled={submitting}
          className="h-[52px] px-6"
        >
          {submitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Send className="mr-2 size-4" />
          )}
          {submitting ? "Сохраняем..." : buttonLabel}
        </PremiumButton>
      </div>

      {compact ? (
        <Input
          name="telegramUsername"
          placeholder="Telegram username"
          className="h-[52px] rounded-full bg-white"
        />
      ) : null}

      <div className="space-y-3 rounded-[1.6rem] border border-black/8 bg-[#f7f8ff] px-4 py-4 text-sm text-black/62">
        <label className="flex items-start gap-3">
          <input
            required
            type="checkbox"
            name="personalDataConsent"
            className="mt-1 size-4 rounded border-black/20"
          />
          <span>
            Согласен на обработку персональных данных для получения материалов и
            ответа по заявке.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="emailMarketingConsent"
            className="mt-1 size-4 rounded border-black/20"
          />
          <span>Можно присылать письма, обновления и follow-up на email.</span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="telegramMarketingConsent"
            className="mt-1 size-4 rounded border-black/20"
          />
          <span>Можно писать в Telegram по заявке, материалам и напоминаниям.</span>
        </label>
      </div>

      {error ? (
        <p className="text-sm font-medium text-[#d14343]">{error}</p>
      ) : null}
    </form>
  );

  if (title || description || className) {
    return (
      <div
        className={cn(
          "rounded-[2rem] border border-black/10 bg-white p-5 shadow-none sm:p-6",
          className,
        )}
      >
        {title || description ? (
          <div className="mb-5 space-y-2">
            {title ? (
              <h3 className="text-2xl font-semibold tracking-tight text-black">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="text-sm leading-7 text-black/56">{description}</p>
            ) : null}
          </div>
        ) : null}
        {content}
      </div>
    );
  }

  return content;
}
