import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  PackageCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { GuideCard } from "@/components/premium/guide-card";
import { LeadCaptureForm } from "@/components/premium/lead-capture-form";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getGuideBySlug, guides } from "@/lib/marketing";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Гайд не найден",
    };
  }

  return {
    title: `${guide.title} - nowa school`,
    description: guide.description,
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const relatedGuides = guides
    .filter((item) => item.slug !== guide.slug)
    .slice(0, 3);

  return (
    <div className="page-section">
      <div className="app-shell space-y-10">
        <Link
          href="/guides"
          className="inline-flex items-center gap-2 text-sm font-medium text-black/52 transition duration-200 hover:text-black"
        >
          <ArrowLeft className="size-4" />
          Все гайды
        </Link>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">{guide.level}</Badge>
              {guide.badges.map((badge) => (
                <Badge key={badge} variant="subtle">
                  {badge}
                </Badge>
              ))}
            </div>

            <div className="space-y-5">
              <p className="text-sm font-medium text-black/46">{guide.eyebrow}</p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl">
                {guide.title}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-black/62">
                {guide.description}
              </p>
            </div>

            <PremiumCard padding="lg" className="rounded-[2.3rem] bg-black text-white">
              <div className="flex gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#3d3bff]">
                  <Target className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-white/52">Результат после прохождения</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    {guide.result}
                  </h2>
                </div>
              </div>
            </PremiumCard>
          </div>

          <PremiumCard
            padding="lg"
            className="sticky top-28 rounded-[2.3rem] bg-white/94"
          >
            <p className="text-sm text-black/46">Цена гайда</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-black">
              {formatCurrency(guide.price, "RUB")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-4 py-2.5 text-sm text-black/58">
                <Clock3 className="size-4" />
                {guide.duration}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eef0ff] px-4 py-2.5 text-sm text-[#3d3bff]">
                <PackageCheck className="size-4" />
                файлы внутри
              </span>
            </div>
            <PremiumButton asChild className="mt-6 h-12 w-full">
              <Link href="/telegram">
                Купить гайд
                <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </PremiumButton>
            <PremiumButton asChild tone="secondary" className="mt-3 h-12 w-full">
              <Link href="/free">Сначала бесплатно</Link>
            </PremiumButton>
            <p className="mt-4 text-xs leading-6 text-black/42">
              MVP checkout для гайдов будет подключен отдельно. Сейчас страница
              готовит sales flow и CTA.
            </p>
          </PremiumCard>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <PremiumCard padding="lg" className="rounded-[2rem]">
            <SectionHeader
              eyebrow="Для кого"
              title="Кому подойдет"
              description="Если узнаешь себя в одном из пунктов, гайд даст быстрый старт."
            />
            <div className="mt-6 space-y-3">
              {guide.audience.map((item) => (
                <p key={item} className="text-sm leading-7 text-black/60">
                  {item}
                </p>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2rem]">
            <SectionHeader
              eyebrow="Боль"
              title="Что решает"
              description="Снимаем страх входа и доводим до понятного артефакта."
            />
            <div className="mt-6 space-y-3">
              {guide.pain.map((item) => (
                <p key={item} className="text-sm leading-7 text-black/60">
                  {item}
                </p>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2rem]">
            <SectionHeader
              eyebrow="Выход"
              title="После покупки"
              description="Практический результат без обещаний гарантированного заработка."
            />
            <div className="mt-6 space-y-3">
              {guide.outcomes.map((item) => (
                <p key={item} className="text-sm leading-7 text-black/60">
                  {item}
                </p>
              ))}
            </div>
          </PremiumCard>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
            <SectionHeader
              eyebrow="Что внутри"
              title="Структура гайда"
              description="Короткий маршрут от задачи к рабочему прототипу."
            />
            <div className="mt-6 grid gap-3">
              {guide.inside.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[1.4rem] bg-[#f7f8fb] px-4 py-4 text-sm font-medium text-black/68"
                >
                  <CheckCircle2 className="size-4 text-[#3d3bff]" />
                  {item}
                </div>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
            <SectionHeader
              eyebrow="Материалы"
              title="Файлы, которые можно использовать сразу"
              description="Практический комплект повышает ценность без лишнего маркетингового шума."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {guide.assets.map((asset) => (
                <div
                  key={asset}
                  className="rounded-[1.4rem] border border-black/8 bg-[#fafafa] px-4 py-4 text-sm font-medium text-black/64"
                >
                  <FileText className="mb-3 size-4 text-[#3d3bff]" />
                  {asset}
                </div>
              ))}
            </div>
          </PremiumCard>
        </section>

        <section>
          <SectionHeader
            eyebrow="FAQ"
            title="Вопросы по гайду"
            description="Честно отвечаем на то, что обычно мешает начать."
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {guide.faq.map((item) => (
              <details
                key={item.question}
                className="rounded-[1.7rem] border border-black/8 bg-white px-5 py-5"
              >
                <summary className="cursor-pointer list-none text-base font-semibold tracking-tight text-black">
                  {item.question}
                </summary>
                <p className="mt-4 text-sm leading-7 text-black/58">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <PremiumCard padding="lg" className="rounded-[2.5rem] bg-[#f6f7fb]">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="primary">Free step</Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-black">
                Хочешь сначала попробовать бесплатно?
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/56">
                Забери starter kit и выбери, какой AI-продукт собирать первым.
              </p>
            </div>
            <LeadCaptureForm compact buttonLabel="Получить starter kit" />
          </div>
        </PremiumCard>

        <section>
          <SectionHeader
            eyebrow="Next"
            title="Похожие гайды"
            description="Можно собрать продуктовую связку: лендинг, агент, контент и AI-чат."
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {relatedGuides.map((item) => (
              <GuideCard key={item.slug} guide={item} />
            ))}
          </div>
        </section>

        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-black text-white">
          <Sparkles className="size-5 text-white/72" />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight">
            Гайд продает навык, а не иллюзию гарантии
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
            nowa school показывает, как применять AI-first подход в реальных
            задачах. Доход зависит от ниши, качества решения, спроса и твоего
            способа продажи услуги.
          </p>
        </PremiumCard>
      </div>
    </div>
  );
}
