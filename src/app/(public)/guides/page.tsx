import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { AnimatedSection } from "@/components/premium/animated-section";
import { GuideCard } from "@/components/premium/guide-card";
import { LeadCaptureForm } from "@/components/premium/lead-capture-form";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import { guides } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Каталог гайдов nowa school",
  description:
    "Мини-гайды по вайбкодингу, AI-агентам, лендингам, MVP SaaS и AI-автоматизациям с готовыми промтами и репозиториями.",
};

type GuidesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GuidesPage({ searchParams }: GuidesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = getParam(resolvedSearchParams.q)?.trim().toLowerCase() ?? "";
  const category = getParam(resolvedSearchParams.category) ?? "all";
  const level = getParam(resolvedSearchParams.level) ?? "all";
  const categories = Array.from(new Set(guides.map((guide) => guide.category)));
  const levels = Array.from(new Set(guides.map((guide) => guide.level)));
  const filteredGuides = guides.filter((guide) => {
    const matchesQuery = query
      ? `${guide.title} ${guide.description} ${guide.result} ${guide.badges.join(" ")}`
          .toLowerCase()
          .includes(query)
      : true;
    const matchesCategory = category === "all" || guide.category === category;
    const matchesLevel = level === "all" || guide.level === level;

    return matchesQuery && matchesCategory && matchesLevel;
  });

  return (
    <div className="page-section">
      <div className="app-shell space-y-8">
        <AnimatedSection className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Badge variant="primary">Каталог гайдов</Badge>
            <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl">
              Мини-гайды, которые ведут к готовому AI-продукту
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-black/62">
              Выбирай по задаче: агент, лендинг, MVP, AI-чат или контент-система.
              Каждый гайд сфокусирован на результате.
            </p>
          </div>
          <div>
            <Link
              href="/free"
              className="inline-flex h-12 items-center rounded-full bg-black px-5 text-sm font-medium text-white transition duration-200 hover:bg-[#3d3bff]"
            >
              Забрать стартовый набор
              <ArrowUpRight className="ml-2 size-4" />
            </Link>
          </div>
        </AnimatedSection>

        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
          <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/36" />
              <input
                name="q"
                defaultValue={query}
                placeholder="AI-агент, лендинг, MVP..."
                className="h-[52px] w-full rounded-full border border-black/10 bg-[#f8f8f8] pl-11 pr-5 text-sm outline-none transition duration-200 placeholder:text-black/34 focus:border-[#3d3bff]/40 focus:bg-white"
              />
            </label>

            <select
              name="category"
              defaultValue={category}
              className="h-[52px] rounded-full border border-black/10 bg-[#f8f8f8] px-5 text-sm text-black outline-none transition duration-200 focus:border-[#3d3bff]/40 focus:bg-white"
            >
              <option value="all">Все темы</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              name="level"
              defaultValue={level}
              className="h-[52px] rounded-full border border-black/10 bg-[#f8f8f8] px-5 text-sm text-black outline-none transition duration-200 focus:border-[#3d3bff]/40 focus:bg-white"
            >
              <option value="all">Любой уровень</option>
              {levels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#3d3bff] px-6 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8]">
              <SlidersHorizontal className="mr-2 size-4" />
              Применить
            </button>
          </form>
        </PremiumCard>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">{filteredGuides.length} гайдов</Badge>
            <Badge variant="subtle">без обещаний гарантированного дохода</Badge>
            <Badge variant="subtle">с практическими файлами</Badge>
          </div>
        </div>

        {filteredGuides.length ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {filteredGuides.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        ) : (
          <PremiumCard padding="lg" className="rounded-[2rem]">
            <h2 className="text-2xl font-semibold tracking-tight text-black">
              По этим фильтрам гайдов пока нет
            </h2>
            <p className="mt-3 text-sm leading-7 text-black/56">
              Сбрось поиск или начни со стартового набора — там есть универсальные промты
              для первого AI-продукта.
            </p>
          </PremiumCard>
        )}

        <PremiumCard padding="lg" className="rounded-[2.5rem] bg-black text-white">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="subtle" className="bg-white/10 text-white/72">
                Первый бесплатный шаг
              </Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                Не знаешь, с чего начать? Забери стартовый набор
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/62">
                30 промтов, 5 идей AI-агентов и шаблон первого лендинга помогут
                выбрать первый понятный проект.
              </p>
            </div>
            <LeadCaptureForm
              source="guides_catalog"
              buttonLabel="Получить бесплатно"
            />
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
