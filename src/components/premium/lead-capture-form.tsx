"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { PremiumButton } from "@/components/premium/premium-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LeadCaptureFormProps = {
  buttonLabel?: string;
  compact?: boolean;
  title?: string;
  description?: string;
  className?: string;
};

export function LeadCaptureForm({
  buttonLabel = "Получить доступ",
  compact = false,
  title,
  description,
  className,
}: LeadCaptureFormProps) {
  const [submitted, setSubmitted] = useState(false);

  const content = submitted ? (
    <div className="rounded-[1.6rem] border border-[#3d3bff]/15 bg-[#eef0ff] px-5 py-4 text-sm font-medium text-[#3432dc]">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4" />
        Заявка сохранена в MVP-режиме. Следующий шаг - подключить CRM или Telegram bot.
      </div>
    </div>
  ) : (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
      className={
        compact
          ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
          : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      }
    >
      <Input
        required
        type="email"
        placeholder="Email"
        className="h-[52px] rounded-full bg-white"
      />
      {!compact ? (
        <Input
          placeholder="Telegram username"
          className="h-[52px] rounded-full bg-white"
        />
      ) : null}
      <PremiumButton type="submit" className="h-[52px] px-6">
        <Send className="mr-2 size-4" />
        {buttonLabel}
      </PremiumButton>
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
