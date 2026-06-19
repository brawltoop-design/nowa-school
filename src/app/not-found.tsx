import Link from "next/link";
import { Compass, SearchX } from "lucide-react";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";

export default function NotFound() {
  return (
    <main className="app-shell page-section">
      <div className="mx-auto max-w-3xl">
        <PremiumCard
          padding="lg"
          className="overflow-hidden rounded-[2.8rem] bg-white/94 px-6 py-8 sm:px-8 sm:py-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.1),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(71,183,255,0.08),transparent_30%)]" />
          <div className="relative space-y-8">
            <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-[#eef0ff] text-[#3d3bff]">
              <SearchX className="size-7" />
            </div>

            <div className="space-y-4">
              <Badge variant="subtle">404</Badge>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-black sm:text-5xl">
                Такой страницы здесь нет
              </h1>
              <p className="max-w-2xl text-base leading-8 text-black/58">
                Возможно, ссылка устарела или маршрут был перемещен. Вернись в каталог
                курсов или в рабочий кабинет.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <PremiumButton asChild className="h-12 px-6">
                <Link href="/courses">Открыть каталог</Link>
              </PremiumButton>
              <PremiumButton asChild tone="secondary" className="h-12 px-6">
                <Link href="/learn">
                  <Compass className="mr-2 size-4" />
                  Перейти в обучение
                </Link>
              </PremiumButton>
            </div>
          </div>
        </PremiumCard>
      </div>
    </main>
  );
}
