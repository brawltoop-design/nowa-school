"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCcw, TriangleAlert } from "lucide-react";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="app-shell page-section">
      <div className="mx-auto max-w-3xl">
        <PremiumCard
          padding="lg"
          className="overflow-hidden rounded-[2.8rem] bg-white/94 px-6 py-8 sm:px-8 sm:py-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,77,60,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(61,59,255,0.08),transparent_30%)]" />
          <div className="relative space-y-8">
            <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-[#fff3f2] text-[#d84d3c]">
              <TriangleAlert className="size-7" />
            </div>

            <div className="space-y-4">
              <Badge variant="subtle">500</Badge>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-black sm:text-5xl">
                Что-то пошло не так
              </h1>
              <p className="max-w-2xl text-base leading-8 text-black/58">
                Мы уже поймали ошибку. Попробуй перезагрузить экран или вернись в
                стабильный раздел платформы.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <PremiumButton
                type="button"
                className="h-12 px-6"
                onClick={() => reset()}
              >
                <RefreshCcw className="mr-2 size-4" />
                Попробовать снова
              </PremiumButton>
              <PremiumButton asChild tone="secondary" className="h-12 px-6">
                <Link href="/courses">Вернуться в каталог</Link>
              </PremiumButton>
            </div>
          </div>
        </PremiumCard>
      </div>
    </main>
  );
}
