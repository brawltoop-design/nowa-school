import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock3 } from "lucide-react";
import { AnimatedSection } from "@/components/premium/animated-section";
import { LeadCaptureForm } from "@/components/premium/lead-capture-form";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { Badge } from "@/components/ui/badge";
import { blogPosts, guides } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Блог nowa school - вайбкодинг, AI-агенты и MVP",
  description:
    "Статьи nowa school про AI-first навыки, вайбкодинг, промты, практические материалы и запуск первых digital-продуктов.",
};

export default function BlogPage() {
  return (
    <div>
      <section className="app-shell pb-12 pt-10 sm:pt-16 lg:pb-18 lg:pt-20">
        <AnimatedSection className="mx-auto max-w-5xl text-center">
          <div className="flex justify-center">
            <Badge variant="primary">Блог</Badge>
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl lg:text-7xl">
            Короткие разборы про AI-first создание продуктов
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-black/62 sm:text-xl">
            Пишем про промты, вайбкодинг, продуктовую упаковку, AI-агентов и
            практические сценарии без инфошума.
          </p>
        </AnimatedSection>
      </section>

      <section className="page-section bg-[#f6f7fb]">
        <div className="app-shell">
          <SectionHeader
            eyebrow="Статьи"
            title="Материалы для спокойного старта"
            description="Пока это MVP-блог: карточки статей готовы, отдельные страницы можно подключить следующим шагом."
          />
          <StaggerGrid className="mt-8 grid gap-5 md:grid-cols-3">
            {blogPosts.map((post, index) => (
              <PremiumCard key={post.slug} className="h-full rounded-[2rem]">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="subtle">0{index + 1}</Badge>
                  <div className="flex items-center gap-2 text-xs text-black/42">
                    <Clock3 className="size-3.5" />
                    6 мин
                  </div>
                </div>
                <BookOpen className="mt-8 size-6 text-[#3d3bff]" />
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-black">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-black/56">{post.excerpt}</p>
                <div className="mt-8 inline-flex items-center text-sm font-medium text-[#3d3bff]">
                  Скоро откроем
                  <ArrowUpRight className="ml-2 size-4" />
                </div>
              </PremiumCard>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <section className="page-section">
        <div className="app-shell">
          <SectionHeader
            eyebrow="Что читать дальше"
            title="Лучший блог-пост - тот, который превращается в практику"
            description="Поэтому рядом со статьями ведем в гайды: там уже есть промты, файлы и конкретный результат."
            action={
              <PremiumButton asChild tone="secondary">
                <Link href="/guides">Все гайды</Link>
              </PremiumButton>
            }
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {guides.slice(0, 3).map((guide) => (
              <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group block">
                <PremiumCard className="h-full rounded-[2rem] transition duration-300 group-hover:-translate-y-1">
                  <Badge variant="subtle">{guide.category}</Badge>
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight text-black">
                    {guide.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-black/56">
                    {guide.description}
                  </p>
                  <div className="mt-8 inline-flex items-center text-sm font-medium text-[#3d3bff]">
                    Открыть гайд
                    <ArrowUpRight className="ml-2 size-4" />
                  </div>
                </PremiumCard>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section bg-black text-white">
        <div className="app-shell grid gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <Badge variant="subtle" className="bg-white/10 text-white/72">
              Обновления
            </Badge>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Получай новые разборы и стартовые материалы без лишнего шума
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/62">
              Оставь email или Телеграм - покажем, как развивать nowa school дальше.
            </p>
          </div>
          <LeadCaptureForm
            title="Подписаться на обновления"
            description="Стартовый набор придет как первый материал."
            source="blog_digest"
            buttonLabel="Подписаться"
            className="border-white/10 bg-white text-black"
          />
        </div>
      </section>
    </div>
  );
}
