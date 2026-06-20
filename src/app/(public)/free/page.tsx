import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Bot, FileText, Lightbulb, Rocket } from "lucide-react";
import { LeadCaptureForm } from "@/components/premium/lead-capture-form";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Бесплатный стартовый набор nowa school",
  description:
    "Забери 30 промтов, 5 идей AI-агентов и шаблон первого лендинга для старта в вайбкодинге.",
};

const kitItems = [
  {
    icon: FileText,
    title: "30 промтов",
    text: "Для лендинга, AI-агента, контента, MVP и проверки идеи.",
  },
  {
    icon: Bot,
    title: "5 идей AI-агентов",
    text: "Сценарии для Telegram, заявок, базы знаний, контента и консультаций.",
  },
  {
    icon: Rocket,
    title: "Шаблон первого лендинга",
    text: "Hero, trust, problem, solution, FAQ и CTA без перегруза.",
  },
];

export default function FreePage() {
  return (
    <div className="page-section">
      <div className="app-shell space-y-10">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center">
          <div>
            <Badge variant="primary">Бесплатный стартовый набор</Badge>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl">
              Забери бесплатный набор для первого AI-продукта
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-black/62">
              30 промтов, 5 идей AI-агентов и шаблон первого лендинга. Никакого
              риска входа: сначала пробуешь, потом выбираешь гайд или буткемп.
            </p>
          </div>

          <PremiumCard padding="lg" className="rounded-[2.4rem] bg-white/94">
            <h2 className="text-2xl font-semibold tracking-tight text-black">
              Получить стартовый набор
            </h2>
            <p className="mt-3 text-sm leading-7 text-black/56">
              В MVP форма показывает успешную отправку. Следующий шаг — подключить
              Телеграм-бота или CRM.
            </p>
            <div className="mt-6">
              <LeadCaptureForm buttonLabel="Забрать бесплатно" />
            </div>
          </PremiumCard>
        </section>

        <section>
          <SectionHeader
            eyebrow="Что внутри"
            title="Материалы, которые помогают начать без хаоса"
            description="Стартовый набор закрывает страх входа и дает понятный первый шаг."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {kitItems.map((item) => (
              <PremiumCard key={item.title} className="rounded-[2rem]">
                <item.icon className="size-5 text-[#3d3bff]" />
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-black">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-black/56">{item.text}</p>
              </PremiumCard>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-[#f6f7fb]">
            <Lightbulb className="size-5 text-[#3d3bff]" />
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-black">
              Почему бесплатно
            </h2>
            <p className="mt-3 text-sm leading-7 text-black/58">
              Первый шаг должен быть легким. Стартовый набор показывает подход
              nowa school: не обещания, а промты, структура и первые артефакты.
            </p>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-black text-white">
            <h2 className="text-3xl font-semibold tracking-tight">
              Следующий шаг после набора
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/62">
              Выбери мини-гайд, зайди в Телеграм или пройди буткемп, чтобы
              собрать первый продукт руками.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PremiumButton asChild className="bg-white text-black hover:bg-white/90">
                <Link href="/guides">
                  Смотреть гайды
                  <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </PremiumButton>
              <PremiumButton asChild tone="secondary" className="bg-white/10 text-white hover:bg-white/15">
                <Link href="/telegram">Открыть Telegram</Link>
              </PremiumButton>
            </div>
          </PremiumCard>
        </section>
      </div>
    </div>
  );
}
