"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useFormStatus } from "react-dom";
import { PremiumButton } from "@/components/premium/premium-button";

type MockCheckoutSubmitButtonProps = {
  className?: string;
};

export function MockCheckoutSubmitButton({
  className,
}: MockCheckoutSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => {
    const storageKey = "nsai-visitor-id";
    const existing = window.localStorage.getItem(storageKey);

    if (existing) {
      setVisitorId(existing);
      document.cookie = `nsai_visitor_id=${existing}; path=/; max-age=31536000; samesite=lax`;
      return;
    }

    const nextId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `visitor_${Date.now()}`;

    window.localStorage.setItem(storageKey, nextId);
    document.cookie = `nsai_visitor_id=${nextId}; path=/; max-age=31536000; samesite=lax`;
    setVisitorId(nextId);
  }, []);

  return (
    <>
      <input type="hidden" name="visitorId" value={visitorId} />
      <PremiumButton
        type="submit"
        disabled={pending}
        className={className}
      >
        {pending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <ShieldCheck className="mr-2 size-4" />
        )}
        {pending ? "Подтверждаем доступ..." : "Подтвердить демо-оплату"}
      </PremiumButton>
    </>
  );
}
