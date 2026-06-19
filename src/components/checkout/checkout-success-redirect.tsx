"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type CheckoutSuccessRedirectProps = {
  href: string;
  delayMs?: number;
};

export function CheckoutSuccessRedirect({
  href,
  delayMs = 2200,
}: CheckoutSuccessRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace(href);
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, href, router]);

  return null;
}
