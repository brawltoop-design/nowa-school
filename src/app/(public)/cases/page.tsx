import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Bot, FileText, Layers3, PlayCircle } from "lucide-react";
import { AnimatedSection } from "@/components/premium/animated-section";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { Badge } from "@/components/ui/badge";
import { cases } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Кейсы nowa school - демо-проекты и AI-first сборки",
  description:
    "Примеры проектов nowa school: AI-агенты, лендинги, чаты по материалам и MVP-сборки без обещаний гарантированного результата.",
};

const caseDetails = [
  {
    icon: Bot,
    title: "AI-агент",
    text: "Роль, ограничения, диалоговая логика, квалификация заявки и тестовые вопросы.",
  },
  {
    icon: FileText,
    title: "Лендинг",
    text: "Hero, оффер, блоки доверия, FAQ, форма заявки и понятная структура покупки.",
  },
  {
    icon: Layers3,
    title: "MVP SaaS",
    text: "Роли, страницы, база данных, первый AI-сценарий и roadmap для следующих итераций.",
  },
];

export default function CasesPage() {
  return (
    <div>
      <section className="app-shell pb-12 pt-10 sm:pt-16 lg:pb-18 lg:pt-20">
        <AnimatedSection className="mx-auto max-w-5xl text-center">
          <div className="flex justify-center">
            <Badge variant="primary">Cases</Badge>
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl lg:text-7xl">
            Показываем не обещания, а то, что можно собрать руками
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-black/62 sm:text-xl">
            Кейсы nowa school - это демо-проекты, prompt flows, прототипы и
            понятные артефакты, которые помогают увидеть реальный процесс сборки.
          </p>
        </AnimatedSection>
      </section>

      <section className="page-section bg-[#f6f7fb]">
        <div className="app-shell">
          <SectionHeader
            eyebrow="Демо-проекты"
            title="Три сценария, с которых проще всего начать"
            description="Каждый сценарий можно развернуть в отдельный mini-guide, bootcamp-задание или большой курс."
          />
          <StaggerGrid className="mt-8 grid gap-5 md:grid-cols-3">
            {cases.map((item) => (
              <PremiumCard key={item.title} className="h-full rounded-[2rem]">
                <Badge variant="subtle">{item.metric}</Badge>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-black">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-black/56">{item.text}</p>
                <div className="mt-8 aspect-video rounded-[1.5rem] bg-[radial-gradient(circle_at_25%_20%,rgba(61,59,255,0.30),transparent_32%),linear-gradient(135deg,#0a0a0a,#222)] p-4 text-white">
                  <PlayCircle className="size-6 text-white/72" />
                  <p className="mt-12 max-w-[14rem] text-xl font-semibold tracking-tight">
                    Demo preview
                  </p>
                </div>
              </PremiumCard>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <section className="page-section">
        <div className="app-shell">
          <SectionHeader
            eyebrow="Что внутри кейса"
            title="Не только красивый результат, но и логика сборки"
            description="Показываем, какие решения приняты, какие prompts использованы и как проверять качество результата."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {caseDetails.map((item) => (
              <PremiumCard key={item.title} className="rounded-[2rem]">
                <item.icon className="size-5 text-[#3d3bff]" />
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-black">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-black/56">{item.text}</p>
              </PremiumCard>
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
                  Next step
                </Badge>
                <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Выбери гайд и повтори сборку на своем проекте
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/62">
                  Самый быстрый путь - взять один сценарий, собрать демо и улучшить его под свою нишу.
                </p>
              </div>
              <PremiumButton asChild className="h-[52px] bg-white px-7 text-base text-black hover:bg-white/90">
                <Link href="/guides">
                  Смотреть гайды
                  <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </PremiumButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
