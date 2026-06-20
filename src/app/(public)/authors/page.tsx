import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  CreditCard,
  FileQuestion,
  GraduationCap,
  Layers3,
  Sparkles,
} from "lucide-react";
import { AnimatedSection } from "@/components/premium/animated-section";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "nowa school для авторов - AI-LMS и витрина курсов",
  description:
    "Платформа для авторов онлайн-курсов: AI-методист, задания, тесты, бейджи, лендинг, платежи и аналитика с комиссией 15% с продаж.",
};

const authorFeatures = [
  {
    icon: Bot,
    title: "AI-методист",
    text: "Помогает превращать материалы в выжимки, тесты, задания, чеклисты и квесты.",
  },
  {
    icon: Layers3,
    title: "Конструктор курса",
    text: "Модули, уроки, видео, тексты, статусы и структура курса без ощущения старой CMS.",
  },
  {
    icon: CreditCard,
    title: "Продажи и доступы",
    text: "Mock checkout уже работает локально: заказ, комиссия, доход автора и enrollment.",
  },
  {
    icon: BarChart3,
    title: "Аналитика",
    text: "GMV, продажи, комиссия платформы, доход автора и последние заказы в кабинете.",
  },
  {
    icon: BadgeCheck,
    title: "Геймификация",
    text: "Бейджи, очки, серия, прогресс и задания помогают ученику видеть движение.",
  },
  {
    icon: FileQuestion,
    title: "AI-помощник ученика",
    text: "Чат отвечает по материалам курса и не должен выдумывать факты за пределами контекста.",
  },
];

const steps = [
  "Загружаешь идею, видео и материалы",
  "AI помогает собрать учебный продукт",
  "Публикуешь курс на витрине",
  "Ведешь трафик из соцсетей, блога или Telegram",
  "Платформа берет 15% только с успешных продаж",
];

export default function AuthorsPage() {
  return (
    <div>
      <section className="app-shell pb-12 pt-10 sm:pt-16 lg:pb-18 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
          <AnimatedSection className="space-y-7">
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">Для авторов</Badge>
              <Badge variant="subtle">0 ₽ за старт</Badge>
              <Badge variant="subtle">15% с продаж</Badge>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl lg:text-7xl">
                Запускай курсы как премиальные digital-продукты, а не как папку с видео
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-black/62 sm:text-xl">
                nowa school помогает автору упаковать курс: программа, задания,
                тесты, бейджи, AI-помощник, витрина, оплата и аналитика в одном месте.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <PremiumButton asChild className="h-[52px] px-7 text-base">
                <Link href="/register">
                  Стать автором
                  <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </PremiumButton>
              <PremiumButton asChild tone="secondary" className="h-[52px] px-7 text-base">
                <Link href="/author">Открыть кабинет</Link>
              </PremiumButton>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="rounded-[2.5rem] border border-black/10 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:p-7">
              <div className="rounded-[2rem] bg-black p-6 text-white">
                <GraduationCap className="size-7 text-[#9ea7ff]" />
                <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                  Пространство автора
                </h2>
                <div className="mt-6 grid gap-3">
                  {["AI-выжимка", "Тест", "Домашка", "Бейдж", "Помощник"].map(
                    (item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4"
                      >
                        <span className="text-sm font-medium text-white/84">{item}</span>
                        <CheckCircle2 className="size-4 text-[#9ea7ff]" />
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="page-section bg-[#f6f7fb]">
        <div className="app-shell">
          <SectionHeader
            eyebrow="Возможности"
            title="Авторский кабинет выглядит и работает как SaaS, а не старая админка"
            description="Базовая логика уже собрана: автор может создать курс, модули, уроки и видеть продажи."
          />
          <StaggerGrid className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {authorFeatures.map((feature) => (
              <PremiumCard key={feature.title} className="h-full rounded-[2rem]">
                <feature.icon className="size-5 text-[#3d3bff]" />
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-black">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-black/56">{feature.text}</p>
              </PremiumCard>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <section className="page-section">
        <div className="app-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeader
            eyebrow="Модель"
            title="0 ₽ за старт. 15% только с успешных продаж"
            description="Автору не нужно платить за размещение на старте. Комиссия появляется только когда курс реально купили."
          />
          <div className="grid gap-4">
            {steps.map((step, index) => (
              <PremiumCard key={step} padding="md" className="rounded-[1.6rem]">
                <div className="flex gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-sm font-semibold text-[#3d3bff]">
                    {index + 1}
                  </div>
                  <p className="self-center text-base font-medium text-black">{step}</p>
                </div>
              </PremiumCard>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section bg-black text-white">
        <div className="app-shell">
          <div className="grid gap-8 rounded-[2.5rem] border border-white/10 bg-white/6 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <Badge variant="subtle" className="bg-white/10 text-white/72">
                Founding authors
              </Badge>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Подходит авторам, которые хотят собрать не просто курс, а образовательный продукт
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/62">
                Сейчас платформа в MVP-режиме: можно тестировать структуру, продажи и learner experience локально.
              </p>
            </div>
            <PremiumButton asChild className="h-[52px] bg-white px-7 text-base text-black hover:bg-white/90">
              <Link href="/register">
                Начать как автор
                <Sparkles className="ml-2 size-4" />
              </Link>
            </PremiumButton>
          </div>
        </div>
      </section>
    </div>
  );
}
