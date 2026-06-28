import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Code2,
  Layers3,
  Rocket,
  Sparkles,
} from "lucide-react";
import { AnimatedSection } from "@/components/premium/animated-section";
import { LeadCaptureForm } from "@/components/premium/lead-capture-form";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Буткемп nowa school - 5 дней до первого AI-продукта",
  description:
    "Практический AI-буткемп: лендинг, AI-агент, MVP-логика, публикация и понятный план развития без громких обещаний.",
};

const bootcampDays = [
  {
    day: "День 1",
    title: "Идея, аудитория и оффер",
    text: "Выбираем задачу, формулируем понятный результат и собираем карту продукта.",
  },
  {
    day: "День 2",
    title: "Лендинг и первая продажная логика",
    text: "Собираем hero, CTA, FAQ и форму заявки через AI-first workflow.",
  },
  {
    day: "День 3",
    title: "AI-агент или автоматизация",
    text: "Делаем сценарий помощника: роль, ограничения, ответы и тестовые диалоги.",
  },
  {
    day: "День 4",
    title: "Прототип и качество",
    text: "Проверяем UX, тексты, крайние сценарии и доводим демо до аккуратного вида.",
  },
  {
    day: "День 5",
    title: "Публикация и план развития",
    text: "Фиксируем результат, собираем материалы и планируем следующий спринт.",
  },
];

const results = [
  "готовая страница проекта",
  "AI-агент или автоматизация",
  "набор промтов под твой сценарий",
  "понятный план улучшений",
  "демо, которое можно показать аудитории или команде",
  "чеклист качества перед публикацией",
];

export default function BootcampPage() {
  return (
    <div>
      <section className="app-shell pb-12 pt-10 sm:pt-16 lg:pb-18 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <AnimatedSection className="space-y-7">
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">3-5 дней</Badge>
              <Badge variant="subtle">AI-first спринт</Badge>
              <Badge variant="subtle">практический результат</Badge>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl lg:text-7xl">
                Собери первый AI-продукт в формате короткого буткемпа
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-black/62 sm:text-xl">
                Каждый день дает видимый артефакт: оффер, лендинг, AI-агент,
                прототип, чеклист качества и план следующей итерации.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <PremiumButton asChild className="h-[52px] px-7 text-base">
                <Link href="/free">
                  Начать со стартового набора
                  <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </PremiumButton>
              <PremiumButton asChild tone="secondary" className="h-[52px] px-7 text-base">
                <Link href="/telegram">Следить в Телеграме</Link>
              </PremiumButton>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <PremiumCard className="rounded-[2.5rem] bg-black p-5 text-white sm:p-7">
              <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6">
                <CalendarDays className="size-6 text-[#9ea7ff]" />
                <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                  План спринта
                </h2>
                <div className="mt-6 space-y-3">
                  {bootcampDays.slice(0, 3).map((item) => (
                    <div
                      key={item.day}
                      className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4"
                    >
                      <p className="text-xs text-white/48">{item.day}</p>
                      <p className="mt-1 font-medium text-white">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </PremiumCard>
          </AnimatedSection>
        </div>
      </section>

      <section className="page-section bg-[#f6f7fb]">
        <div className="app-shell">
          <SectionHeader
            eyebrow="Программа"
            title="Пять коротких шагов вместо бесконечного курса"
            description="Буткемп подходит, если хочется быстро перейти от идеи к демо и понять, что улучшать дальше."
          />
          <StaggerGrid className="mt-8 grid gap-5 lg:grid-cols-5">
            {bootcampDays.map((item) => (
              <PremiumCard key={item.day} className="h-full rounded-[2rem]">
                <Badge variant="subtle">{item.day}</Badge>
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-black">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-black/56">{item.text}</p>
              </PremiumCard>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <section className="page-section">
        <div className="app-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeader
            eyebrow="Что получишь"
            title="На выходе не сертификат ради сертификата, а рабочий набор"
            description="Мы не обещаем гарантированный доход. Мы помогаем собрать понятный продуктовый результат и научиться повторять процесс."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((result) => (
              <div
                key={result}
                className="flex items-center gap-3 rounded-[1.5rem] border border-black/8 bg-white px-5 py-4 text-sm font-medium text-black/70"
              >
                <CheckCircle2 className="size-5 shrink-0 text-[#3d3bff]" />
                {result}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section bg-black text-white">
        <div className="app-shell grid gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <Badge variant="subtle" className="bg-white/10 text-white/72">
              Формат
            </Badge>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Короткие задания, живые разборы и файлы, которые остаются у тебя
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { icon: Bot, title: "AI-агенты" },
                { icon: Code2, title: "Вайбкодинг" },
                { icon: Layers3, title: "MVP-логика" },
                { icon: Sparkles, title: "Публикация" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5"
                >
                  <item.icon className="size-5 text-[#9ea7ff]" />
                  <p className="mt-4 font-medium text-white">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
          <LeadCaptureForm
            title="Лист ожидания буткемпа"
            description="Оставь контакт, чтобы получить стартовый набор и уведомление о следующем потоке."
            source="bootcamp_waitlist"
            buttonLabel="Получить приглашение"
            className="border-white/10 bg-white text-black"
          />
        </div>
      </section>

      <section className="page-section">
        <div className="app-shell">
          <div className="rounded-[2.5rem] bg-[#eef0ff] px-6 py-10 sm:px-10 lg:px-14">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-4xl font-semibold tracking-tight text-black">
                  Хочешь начать мягче?
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-8 text-black/58">
                  Забери бесплатный стартовый набор и попробуй первые промты до участия в буткемпе.
                </p>
              </div>
              <PremiumButton asChild className="h-[52px] px-7 text-base">
                <Link href="/free">
                  Забрать стартовый набор
                  <Rocket className="ml-2 size-4" />
                </Link>
              </PremiumButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
