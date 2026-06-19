"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { PremiumButton } from "@/components/premium/premium-button";

type LessonCompleteButtonProps = {
  className?: string;
};

export function LessonCompleteButton({
  className,
}: LessonCompleteButtonProps) {
  const { pending } = useFormStatus();

  return (
    <PremiumButton
      type="submit"
      disabled={pending}
      className={className}
    >
      {pending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-2 size-4" />
      )}
      {pending ? "Сохраняем прогресс..." : "Завершить урок"}
    </PremiumButton>
  );
}
