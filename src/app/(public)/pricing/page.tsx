import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatedSection } from "@/components/premium/animated-section";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { Badge } from "@/components/ui/badge";
import { pricingPlans } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Цены nowa school - гайды, Телеграм, буткемп и платформа",
  description:
    "Прозрачная продуктовая лестница nowa school: бесплатный стартовый набор, мини-гайды, Телеграм-клуб и платформа для авторов.",
};

const notes = [
  "Можно начать бесплатно и понять формат до покупки",
  "Мини-гайды продают конкретный практический результат",
  "Телеграм подходит тем, кто хочет регулярные обновления и файлы",
  "Платформа для авторов берет 15% только с успешных продаж",
];

export default function PricingPage() {
  return (
    <div>
      <section className="app-shell pb-12 pt-10 sm:pt-16 lg:pb-18 lg:pt-20">
        <AnimatedSection className="mx-auto max-w-5xl text-center">
          <div className="flex justify-center">
            <Badge variant="primary">Цены</Badge>
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl lg:text-7xl">
            Простая лестница: от бесплатного входа до полноценной AI-LMS
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-black/62 sm:text-xl">
            Выбирай глубину под текущую задачу: попробовать промты, собрать один
            продукт, зайти в клуб или запускать курсы на платформе.
          </p>
        </AnimatedSection>
      </section>

      <section className="page-section bg-[#f6f7fb]">
        <div className="app-shell">
          <StaggerGrid className="grid gap-5 lg:grid-cols-4">
            {pricingPlans.map((plan, index) => (
              <PremiumCard
                key={plan.title}
                className={
                  index === 1
                    ? "h-full rounded-[2rem] border-[#3d3bff]/30 shadow-[0_24px_70px_rgba(61,59,255,0.12)]"
                    : "h-full rounded-[2rem]"
                }
              >
                <Badge variant={index === 1 ? "primary" : "subtle"}>
                  {index === 1 ? "Популярно" : plan.title}
                </Badge>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-black">
                  {plan.price}
                </h2>
                <p className="mt-3 text-sm leading-7 text-black/56">
                  {plan.description}
                </p>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex gap-3 text-sm font-medium text-black/70"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#3d3bff]" />
                      {feature}
                    </div>
                  ))}
                </div>
                <PremiumButton asChild className="mt-8 w-full">
                  <Link href={plan.href}>
                    {plan.cta}
                    <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </PremiumButton>
              </PremiumCard>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <section className="page-section">
        <div className="app-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeader
            eyebrow="Прозрачность"
            title="Без ценового шока и громких обещаний"
            description="nowa school продает понятные продукты и практический навык. Мы не обещаем гарантированный доход, работу или быстрый успех."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {notes.map((note) => (
              <div
                key={note}
                className="rounded-[1.6rem] border border-black/8 bg-white p-5 text-sm font-medium leading-7 text-black/68"
              >
                <ShieldCheck className="mb-4 size-5 text-[#3d3bff]" />
                {note}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section bg-black text-white">
        <div className="app-shell">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/6 p-6 sm:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Badge variant="subtle" className="bg-white/10 text-white/72">
                  Лучший старт
                </Badge>
                <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Начни с бесплатного стартового набора
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/62">
                  Забери промты и шаблон, чтобы почувствовать nowa school до покупки гайда или участия в буткемпе.
                </p>
              </div>
              <PremiumButton asChild className="h-[52px] bg-white px-7 text-base text-black hover:bg-white/90">
                <Link href="/free">
                  Забрать бесплатно
                  <Sparkles className="ml-2 size-4" />
                </Link>
              </PremiumButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
