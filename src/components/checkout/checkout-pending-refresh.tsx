"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type CheckoutPendingRefreshProps = {
  enabled?: boolean;
  intervalMs?: number;
};

export function CheckoutPendingRefresh({
  enabled = true,
  intervalMs = 3500,
}: CheckoutPendingRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, router]);

  return null;
}
