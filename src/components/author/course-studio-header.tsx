"use client";

import Link from "next/link";
import { ArrowUpRight, Compass, Eye, Sparkles, WandSparkles } from "lucide-react";
import { useSelectedLayoutSegment } from "next/navigation";
import {
  courseStudioSections,
  getCourseStudioPath,
  normalizeCourseStudioSection,
} from "@/lib/course-studio";
import { salesPageStatusMeta } from "@/lib/sales-page";
import { cn } from "@/lib/utils";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";

type CourseStudioHeaderProps = {
  course: {
    id: string;
    title: string;
    slug: string;
    status: string;
    category: string;
    level: string;
    salesPageStatus: string | null;
    metrics: {
      moduleCount: number;
      lessonCount: number;
    };
  };
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-black/5 text-black/58",
  PUBLISHED: "bg-emerald-500/10 text-emerald-700",
  BLOCKED: "bg-red-500/10 text-red-600",
  APPROVED: "bg-[#3d3bff]/10 text-[#3d3bff]",
  PENDING_REVIEW: "bg-amber-500/10 text-amber-700",
  REJECTED: "bg-red-500/10 text-red-600",
  UNPUBLISHED: "bg-black/5 text-black/58",
};

const courseStatusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликован",
  BLOCKED: "Заблокирован",
};

export function CourseStudioHeader({ course }: CourseStudioHeaderProps) {
  const segment = useSelectedLayoutSegment();
  const activeSection = normalizeCourseStudioSection(segment) ?? "overview";

  return (
    <PremiumCard
      padding="lg"
      className="overflow-hidden rounded-[2.8rem] bg-white/92 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="primary">Студия создания курса</Badge>
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                statusStyles[course.status] ?? "bg-black/5 text-black/58",
              )}
            >
              {courseStatusLabels[course.status] ?? course.status}
            </span>
            {course.salesPageStatus ? (
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                  statusStyles[course.salesPageStatus] ??
                    "bg-black/5 text-black/58",
                )}
              >
                Продающая страница:{" "}
                {salesPageStatusMeta[course.salesPageStatus as keyof typeof salesPageStatusMeta]
                  ?.label ?? course.salesPageStatus}
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            {course.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-black/56">
            Единое премиальное пространство для продающей страницы, программы,
            уроков, практики, файлов, AI-методологии и аналитики без ощущения
            старой LMS или шумной CMS.
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-black/54">
            <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
              {course.category}
            </span>
            <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
              {course.level}
            </span>
            <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
              {course.metrics.moduleCount} модулей
            </span>
            <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
              {course.metrics.lessonCount} уроков
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <PremiumButton asChild tone="secondary" className="h-12 px-5">
            <Link href="/author">
              <Compass className="mr-2 size-4" />
              К кабинету
            </Link>
          </PremiumButton>
          <PremiumButton asChild className="h-12 px-5">
            <Link href={`/author/courses/${course.id}/creative-studio`}>
              <WandSparkles className="mr-2 size-4" />
              Creative Studio
            </Link>
          </PremiumButton>
          <PremiumButton asChild tone="secondary" className="h-12 px-5">
            <Link href={`/author/courses/${course.id}/preview/sales-page`}>
              <Eye className="mr-2 size-4" />
              Предпросмотр
            </Link>
          </PremiumButton>
          <PremiumButton asChild tone="secondary" className="h-12 px-5">
            <Link href={`/courses/${course.slug}`}>
              Публичная страница
              <ArrowUpRight className="ml-2 size-4" />
            </Link>
          </PremiumButton>
        </div>
      </div>

      <div className="mt-8 -mx-2 overflow-x-auto px-2">
        <div className="no-scrollbar flex w-max min-w-full gap-3">
          {courseStudioSections.map((section) => (
            <Link
              key={section.key}
              href={getCourseStudioPath(course.id, section.key)}
              className={cn(
                "flex min-w-[164px] flex-col rounded-[1.5rem] border px-4 py-3 text-left transition duration-200",
                activeSection === section.key
                  ? "border-[#3d3bff]/20 bg-[#3d3bff] text-white shadow-[0_20px_60px_rgba(61,59,255,0.22)]"
                  : "border-black/8 bg-[#f7f8fb] text-black/74 hover:border-black/14 hover:bg-white",
              )}
            >
              <span className="text-sm font-medium">{section.label}</span>
              <span
                className={cn(
                  "mt-1 text-xs leading-5",
                  activeSection === section.key ? "text-white/70" : "text-black/42",
                )}
              >
                {section.description}
              </span>
            </Link>
          ))}
          <div className="hidden min-w-[180px] rounded-[1.5rem] border border-dashed border-black/10 bg-[#fafbff] p-4 text-sm text-black/45 xl:flex xl:flex-col xl:justify-between">
            <div>
              <p className="font-medium text-black">Логика как в Tilda</p>
              <p className="mt-2 leading-6">
                Собирай продающую страницу как мини-Tilda, а уроки, задания и
                материалы держи в отдельных продуктовых слоях.
              </p>
            </div>
            <Sparkles className="mt-4 size-4 text-[#3d3bff]" />
          </div>
        </div>
      </div>
    </PremiumCard>
  );
}
