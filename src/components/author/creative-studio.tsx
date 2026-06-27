"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Brain,
  CheckCircle2,
  CircleDashed,
  Eye,
  Globe,
  ImagePlus,
  Laptop2,
  Layers3,
  LayoutPanelTop,
  LoaderCircle,
  MonitorSmartphone,
  Plus,
  ShieldCheck,
  TabletSmartphone,
  WandSparkles,
} from "lucide-react";
import { ModuleBuilderCard } from "@/components/author/module-builder-card";
import { MockUploadDropzone } from "@/components/author/mock-upload-dropzone";
import { NewModuleForm } from "@/components/author/new-module-form";
import { SalesPageStudio } from "@/components/author/sales-page-studio";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import {
  coerceSalesPageTheme,
  extractSalesPageHero,
  type FooterSocialLinks,
} from "@/lib/sales-page";
import type {
  CreativeStudioCourseCardInput,
  CreativeStudioFooterSocialsInput,
} from "@/lib/validators/creative-studio";
import {
  generateAuthorLessonAiContent,
  saveCreativeStudioCourseCard,
  saveCreativeStudioFooterSocials,
} from "@/server/author/actions";
import type { AuthorBuilderCourse } from "@/server/author/queries";
import { publishSalesPage, submitSalesPageForModeration } from "@/server/sales-page/actions";
import type { CourseStudioData } from "@/server/sales-page/queries";

type CreativeStudioProps = {
  studio: CourseStudioData;
  builderCourse: AuthorBuilderCourse;
  initialTab?: CreativeStudioTab;
};

type CreativeStudioTab =
  | "course-card"
  | "sales-page"
  | "course-studio"
  | "ai-assistant"
  | "analytics";

type PreviewDevice = "desktop" | "tablet" | "mobile";

type CourseCardDraft = {
  title: string;
  shortDescription: string;
  category: CreativeStudioCourseCardInput["category"];
  level: CreativeStudioCourseCardInput["level"];
  price: number;
  currency: string;
  oldPrice: number | undefined;
  coverUrl: string;
  authorName: string;
  badgesText: string;
  duration: string;
  lessonsCount: number;
  accentColor: string;
  cardStyle: "editorial" | "spotlight" | "compact";
};

type AiStudioSuggestion = {
  id: string;
  title: string;
  reason: string;
  suggestedContent: string;
  lessonId?: string;
  moduleTitle: string;
  lessonTitle?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedTime: string;
  kind: "practice-pack" | "add-transcript" | "expand-content" | "review-lesson";
};

const studioTabs: Array<{
  key: CreativeStudioTab;
  label: string;
  icon: typeof LayoutPanelTop;
  description: string;
}> = [
  {
    key: "course-card",
    label: "Course Card",
    icon: LayoutPanelTop,
    description: "Карточка курса для каталога и click-through упаковка.",
  },
  {
    key: "sales-page",
    label: "Sales Page",
    icon: Globe,
    description: "Mini-Tilda режим для публичной страницы курса.",
  },
  {
    key: "course-studio",
    label: "Course Studio",
    icon: Layers3,
    description: "Модули, уроки, видео, материалы и практика.",
  },
  {
    key: "ai-assistant",
    label: "AI Assistant",
    icon: Bot,
    description: "Подсказки, пробелы и AI-пакеты для уроков.",
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: BadgeCheck,
    description: "Конверсия, модерация и состояние витрины.",
  },
];

const cardStyleOptions: Array<{
  value: CourseCardDraft["cardStyle"];
  label: string;
  description: string;
}> = [
  {
    value: "editorial",
    label: "Editorial",
    description: "Чистая продуктовая карточка с мягким светом.",
  },
  {
    value: "spotlight",
    label: "Spotlight",
    description: "Более контрастная витрина с premium-акцентом.",
  },
  {
    value: "compact",
    label: "Compact",
    description: "Плотная карточка для мобайла и каталожных рядов.",
  },
];

const accentPresets = [
  { label: "Default Light", value: "#3d3bff" },
  { label: "Soft Blue", value: "#3b82f6" },
  { label: "Soft Purple", value: "#7c3aed" },
  { label: "Graphite", value: "#111827" },
  { label: "Warm Sand", value: "#b45309" },
  { label: "Mint", value: "#0f766e" },
  { label: "Dark Premium", value: "#05070b" },
  { label: "Glass White", value: "#d4d4d8" },
];

const salesPageStatusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  UNPUBLISHED: "Unpublished",
};

const courseStatusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  BLOCKED: "Blocked",
};

function buildCourseCardDraft(
  studio: CourseStudioData,
  builderCourse: AuthorBuilderCourse,
): CourseCardDraft {
  const theme = coerceSalesPageTheme(studio.salesPage?.theme);
  const card = theme.courseCard ?? {};
  const hero = studio.salesPage ? extractSalesPageHero(studio.salesPage.blocks) : null;
  const firstBadges = card.badges?.length ? card.badges : (hero?.badges ?? []);

  return {
    title: builderCourse.title,
    shortDescription:
      card.shortDescription ??
      builderCourse.description.slice(0, 160).trim(),
    category: builderCourse.category as CreativeStudioCourseCardInput["category"],
    level: builderCourse.level as CreativeStudioCourseCardInput["level"],
    price: builderCourse.price,
    currency: builderCourse.currency,
    oldPrice: typeof card.oldPrice === "number" ? card.oldPrice : undefined,
    coverUrl: builderCourse.coverUrl ?? "",
    authorName: card.authorName ?? builderCourse.author.name,
    badgesText: firstBadges.join(", "),
    duration:
      card.duration ??
      `${builderCourse.modules.reduce(
        (sum, module) =>
          sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.durationMinutes, 0),
        0,
      )} min`,
    lessonsCount:
      card.lessonsCount ?? builderCourse.metrics.lessonCount,
    accentColor: card.accentColor ?? theme.accent,
    cardStyle: card.cardStyle ?? "editorial",
  };
}

function buildFooterDraft(
  studio: CourseStudioData,
): CreativeStudioFooterSocialsInput {
  const theme = coerceSalesPageTheme(studio.salesPage?.theme);
  const socials = theme.footerSocials ?? {};

  return {
    telegram: socials.telegram,
    instagram: socials.instagram,
    youtube: socials.youtube,
    tiktok: socials.tiktok,
    vk: socials.vk,
    website: socials.website,
    email: socials.email,
    community: socials.community,
  };
}

function parseBadges(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function getCardSuggestions(draft: CourseCardDraft) {
  const suggestions: string[] = [];

  if (draft.title.trim().split(" ").length < 3) {
    suggestions.push("Сделай название конкретнее и добавь конечный результат ученика.");
  }

  if (!/\d|результ|проект|система|framework|workflow/i.test(draft.title)) {
    suggestions.push("Добавь outcome в заголовок: что ученик соберет или запустит.");
  }

  if (draft.shortDescription.length > 120) {
    suggestions.push("Сократи описание: карточка в каталоге должна считываться за 2-3 строки.");
  }

  if (!draft.coverUrl) {
    suggestions.push("Обложка пока пустая. Добавь cover, чтобы карточка продавала клик, а не только текст.");
  }

  if (!draft.oldPrice && draft.price > 0) {
    suggestions.push("Попробуй добавить old price или оффер-бейдж, если хочешь усилить предложение.");
  }

  if (parseBadges(draft.badgesText).length < 2) {
    suggestions.push("Добавь 2-3 бейджа: формат, результат, community или certificate.");
  }

  return suggestions.slice(0, 5);
}

function getContrastWarning(hex: string) {
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
    return null;
  }

  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luma > 0.82 || luma < 0.08
    ? "Текст может быть плохо читаемым. Выберите более контрастный цвет."
    : null;
}

function buildAiSuggestions(studio: CourseStudioData): AiStudioSuggestion[] {
  return studio.course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) => {
      const suggestions: AiStudioSuggestion[] = [];
      const contentLength = lesson.contentText.trim().length;
      const hasPractice =
        lesson.hasQuiz || lesson.hasAssignment || lesson.hasChecklist || lesson.hasQuest;

      if (lesson.transcript || contentLength > 180) {
        if (!hasPractice) {
          suggestions.push({
            id: `${lesson.id}-practice-pack`,
            title: "Сгенерировать practice pack",
            reason:
              "Урок уже содержит достаточно контекста для AI: transcript или содержательный contentText есть, а практики после урока пока нет.",
            suggestedContent:
              "Добавить quiz, assignment, checklist и quest, чтобы ученик применил материал сразу после урока.",
            lessonId: lesson.id,
            moduleTitle: module.title,
            lessonTitle: lesson.title,
            difficulty: "Easy",
            estimatedTime: "2-3 min",
            kind: "practice-pack",
          });
        }
      } else {
        suggestions.push({
          id: `${lesson.id}-transcript`,
          title: "Добавить transcript или расширить lesson content",
          reason:
            "AI сейчас нечего анализировать. Для хороших подсказок нужен transcript, contentText или оба слоя вместе.",
          suggestedContent:
            "Вставь transcript, добавь ключевые шаги и outcome урока, после этого AI предложит задания точнее.",
          lessonId: lesson.id,
          moduleTitle: module.title,
          lessonTitle: lesson.title,
          difficulty: "Medium",
          estimatedTime: "5-10 min",
          kind: "add-transcript",
        });
      }

      if (contentLength < 120) {
        suggestions.push({
          id: `${lesson.id}-expand`,
          title: "Усилить content layer урока",
          reason:
            "Текущий contentText слишком короткий. Студия будет сильнее, если у урока есть текстовые steps, не только видео.",
          suggestedContent:
            "Добавить шаги, исходные данные, ошибки и ожидаемый результат ученика.",
          lessonId: lesson.id,
          moduleTitle: module.title,
          lessonTitle: lesson.title,
          difficulty: "Medium",
          estimatedTime: "8 min",
          kind: "expand-content",
        });
      }

      if (!lesson.videoUrl) {
        suggestions.push({
          id: `${lesson.id}-review`,
          title: "Добавить видео или hosted asset",
          reason:
            "Урок пока не выглядит как полноценный premium lesson: видео-слой или media asset отсутствует.",
          suggestedContent:
            "Добавить видео, poster и краткий lesson goal, чтобы student preview ощущался законченным.",
          lessonId: lesson.id,
          moduleTitle: module.title,
          lessonTitle: lesson.title,
          difficulty: "Easy",
          estimatedTime: "4 min",
          kind: "review-lesson",
        });
      }

      return suggestions;
    }),
  );
}

function scrollToAnchor(anchor: string) {
  if (typeof window === "undefined") {
    return;
  }

  document.getElementById(anchor)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function buildFooterHref(value: string | undefined, kind: keyof FooterSocialLinks) {
  if (!value) {
    return null;
  }

  if (kind === "email") {
    return value.startsWith("mailto:") ? value : `mailto:${value}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (kind === "telegram") {
    return value.startsWith("@")
      ? `https://t.me/${value.slice(1)}`
      : `https://t.me/${value.replace(/^t\.me\//i, "")}`;
  }

  return `https://${value.replace(/^\/+/, "")}`;
}

function CreativeCourseCardPreview({
  draft,
  mode,
}: {
  draft: CourseCardDraft;
  mode: "desktop" | "mobile" | "compact";
}) {
  const badges = parseBadges(draft.badgesText);
  const accent = draft.accentColor || "#3d3bff";
  const compact = mode === "compact";
  const spotlight = draft.cardStyle === "spotlight";
  const previewWidth =
    mode === "desktop" ? "max-w-[360px]" : mode === "mobile" ? "max-w-[280px]" : "max-w-[520px]";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[2rem] border shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
        spotlight
          ? "border-transparent bg-[#05070b] text-white"
          : "border-black/8 bg-white text-black",
        previewWidth,
      )}
      style={{
        boxShadow: `0 24px 90px ${accent}25`,
      }}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          compact ? "grid min-h-[220px] grid-cols-[180px_minmax(0,1fr)]" : "min-h-[220px]",
        )}
      >
        <div
          className={cn(
            "relative",
            compact ? "h-full" : "h-[220px]",
            !compact && "w-full",
          )}
        >
          {draft.coverUrl ? (
            <Image
              src={draft.coverUrl}
              alt={draft.title}
              fill
              unoptimized
              sizes={compact ? "180px" : "360px"}
              className="object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `radial-gradient(circle at top right, ${accent}55, transparent 28%), radial-gradient(circle at bottom left, rgba(255,255,255,0.14), transparent 24%), linear-gradient(135deg, #0f172a 0%, ${accent} 100%)`,
              }}
            />
          )}
        </div>

        <div className={cn("p-5", !compact && "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 via-black/14 to-transparent text-white")}>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                spotlight || compact ? "bg-white/10 text-white" : "bg-white/90 text-black",
              )}
            >
              {draft.category}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                spotlight || compact ? "bg-white/10 text-white/78" : "bg-white/80 text-black/62",
              )}
            >
              {draft.level}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight">
            {draft.title}
          </h3>
          {!compact ? (
            <p className="mt-3 text-sm leading-6 text-white/82">
              {draft.shortDescription}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "space-y-4 p-5",
          spotlight ? "bg-[#05070b] text-white" : "bg-white text-black",
        )}
      >
        {compact ? (
          <p className={cn("text-sm leading-6", spotlight ? "text-white/78" : "text-black/58")}>
            {draft.shortDescription}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {badges.slice(0, compact ? 2 : 3).map((badge) => (
              <span
                key={badge}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  spotlight ? "bg-white/10 text-white/84" : "bg-[#f4f6fb] text-black/62",
                )}
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="text-right">
            {draft.oldPrice ? (
              <p className={cn("text-xs line-through", spotlight ? "text-white/42" : "text-black/36")}>
                {formatCurrency(draft.oldPrice, draft.currency)}
              </p>
            ) : null}
            <p className="text-xl font-semibold" style={{ color: spotlight ? "#ffffff" : accent }}>
              {formatCurrency(draft.price, draft.currency)}
            </p>
          </div>
        </div>

        <div className={cn("grid gap-3 text-sm", compact ? "grid-cols-2" : "grid-cols-3")}>
          <div className={cn("rounded-[1.2rem] px-3 py-3", spotlight ? "bg-white/6" : "bg-[#f7f8fc]")}>
            <p className={cn("text-[11px] uppercase tracking-[0.18em]", spotlight ? "text-white/42" : "text-black/32")}>
              Author
            </p>
            <p className="mt-2 font-medium">{draft.authorName}</p>
          </div>
          <div className={cn("rounded-[1.2rem] px-3 py-3", spotlight ? "bg-white/6" : "bg-[#f7f8fc]")}>
            <p className={cn("text-[11px] uppercase tracking-[0.18em]", spotlight ? "text-white/42" : "text-black/32")}>
              Lessons
            </p>
            <p className="mt-2 font-medium">{draft.lessonsCount}</p>
          </div>
          {!compact ? (
            <div className={cn("rounded-[1.2rem] px-3 py-3", spotlight ? "bg-white/6" : "bg-[#f7f8fc]")}>
              <p className={cn("text-[11px] uppercase tracking-[0.18em]", spotlight ? "text-white/42" : "text-black/32")}>
                Duration
              </p>
              <p className="mt-2 font-medium">{draft.duration || "Self-paced"}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LockedFooterPreview({
  socials,
}: {
  socials: FooterSocialLinks;
}) {
  const entries = (Object.entries(socials) as Array<[keyof FooterSocialLinks, string | undefined]>)
    .filter(([, value]) => Boolean(value?.trim()));

  return (
    <PremiumCard padding="lg" className="rounded-[2.1rem] border-black/8 bg-[#0a0d14] text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">
            Locked System Footer
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight">Nowa School</p>
        </div>
        <Badge variant="subtle" className="bg-white/10 text-white/84">
          Logo locked
        </Badge>
      </div>

      <p className="mt-4 text-sm leading-7 text-white/64">
        Автор не может менять логотип или системную навигацию футера. Можно редактировать только свои social links.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {entries.length ? (
          entries.map(([key, value]) => {
            const href = buildFooterHref(value, key);

            return href ? (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/84 transition hover:bg-white/10"
              >
                {key}
              </a>
            ) : null;
          })
        ) : (
          <div className="rounded-[1.4rem] border border-dashed border-white/12 px-4 py-4 text-sm text-white/46">
            Social links пока не заполнены.
          </div>
        )}
      </div>
    </PremiumCard>
  );
}

function StudentLessonPreview({
  lesson,
  moduleTitle,
}: {
  lesson:
    | AuthorBuilderCourse["modules"][number]["lessons"][number]
    | CourseStudioData["course"]["modules"][number]["lessons"][number];
  moduleTitle: string;
}) {
  const transcriptSnippet =
    lesson.transcript?.slice(0, 180).trim() || lesson.contentText.slice(0, 180).trim();
  const practiceCount = Number(Boolean("hasQuiz" in lesson && lesson.hasQuiz))
    + Number(Boolean("hasAssignment" in lesson && lesson.hasAssignment))
    + Number(Boolean("hasChecklist" in lesson && lesson.hasChecklist))
    + Number(Boolean("hasQuest" in lesson && lesson.hasQuest));

  return (
    <div className="space-y-4">
      <PremiumCard padding="lg" className="rounded-[2rem] border-black/8 bg-white/92">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-black/32">Student Preview</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-black">
              {lesson.title}
            </h3>
          </div>
          <Badge variant="subtle">{moduleTitle}</Badge>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.8rem] border border-black/8 bg-[#0b1120]">
          {lesson.videoUrl ? (
            <div className="relative h-[220px] bg-[radial-gradient(circle_at_top_right,rgba(61,59,255,0.35),transparent_28%),linear-gradient(135deg,#0b1120_0%,#111827_100%)]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-white/12 px-5 py-3 text-sm font-medium text-white backdrop-blur">
                  Video ready
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(61,59,255,0.22),transparent_24%),linear-gradient(135deg,#dbeafe_0%,#f8fafc_100%)] text-sm font-medium text-black/54">
              Добавь video URL или mock upload, чтобы урок ощущался законченным.
            </div>
          )}
        </div>

        <p className="mt-5 text-sm leading-7 text-black/56">{lesson.description}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.3rem] bg-[#f7f8fc] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/32">Duration</p>
            <p className="mt-2 font-medium text-black">{lesson.durationMinutes} min</p>
          </div>
          <div className="rounded-[1.3rem] bg-[#f7f8fc] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/32">Practice</p>
            <p className="mt-2 font-medium text-black">{practiceCount} blocks</p>
          </div>
          <div className="rounded-[1.3rem] bg-[#f7f8fc] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/32">Transcript</p>
            <p className="mt-2 font-medium text-black">
              {lesson.transcript ? "Ready" : "Missing"}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-black/8 bg-[#fbfbfd] px-4 py-4">
          <p className="text-sm font-medium text-black">Lesson content</p>
          <p className="mt-2 text-sm leading-7 text-black/56">
            {transcriptSnippet || "Добавь contentText или transcript, чтобы student preview выглядел богаче."}
          </p>
        </div>
      </PremiumCard>
    </div>
  );
}

function AnalyticsTab({ studio }: { studio: CourseStudioData }) {
  const { analytics, moderation, salesPage, course } = studio;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Views", String(analytics.pageViews), "Просмотры витрины курса"],
            ["CTA Clicks", String(analytics.ctaClicks), "Нажатия по CTA"],
            ["Purchases", String(analytics.purchases), "Успешные покупки"],
            [
              "GMV",
              formatCurrency(analytics.gmv, course.currency),
              "Доход до комиссии",
            ],
          ].map(([label, value, description]) => (
            <PremiumCard key={label} padding="lg" className="rounded-[1.9rem] bg-white/92">
              <p className="text-xs uppercase tracking-[0.22em] text-black/32">{label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-black">{value}</p>
              <p className="mt-2 text-sm leading-6 text-black/48">{description}</p>
            </PremiumCard>
          ))}
        </div>

        <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-black/32">Sales Page Health</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                {salesPage?.status ? salesPageStatusLabel[salesPage.status] : "Draft"}
              </h3>
            </div>
            <Badge variant="subtle">
              {moderation.openIssuesCount} open issues
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-[#f7f8fc] px-4 py-4">
              <p className="text-sm font-medium text-black">View to Checkout</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                {analytics.viewToCheckoutConversion.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#f7f8fc] px-4 py-4">
              <p className="text-sm font-medium text-black">Checkout to Purchase</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                {analytics.checkoutToPurchaseConversion.toFixed(1)}%
              </p>
            </div>
          </div>
        </PremiumCard>
      </div>

      <div className="space-y-5">
        <PremiumCard padding="lg" className="rounded-[2.1rem] border-black/8 bg-black text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">Moderation</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {moderation.latestSubmission?.status ?? "No submissions yet"}
          </p>
          <p className="mt-3 text-sm leading-7 text-white/66">
            Отсюда видно, насколько страница готова к публикации и что еще нужно дочистить перед review.
          </p>
        </PremiumCard>

        <PremiumCard padding="lg" className="rounded-[2.1rem] bg-white/92">
          <p className="text-sm font-medium text-black">Последние issues</p>
          <div className="mt-4 space-y-3">
            {moderation.latestIssues.length ? (
              moderation.latestIssues.map((issue) => (
                <div key={issue.id} className="rounded-[1.4rem] border border-black/8 bg-[#fafbff] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-black">{issue.type}</p>
                    <Badge variant="subtle">{issue.severity}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-black/54">{issue.message}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-black/10 px-4 py-4 text-sm text-black/46">
                Модерационных замечаний пока нет.
              </div>
            )}
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}

export function CreativeStudio({
  studio,
  builderCourse,
  initialTab = "course-card",
}: CreativeStudioProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CreativeStudioTab>(initialTab);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [pendingHeaderAction, setPendingHeaderAction] = useState<string | null>(null);
  const [salesPageDirty, setSalesPageDirty] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(null);

  const initialCardDraft = useMemo(
    () => buildCourseCardDraft(studio, builderCourse),
    [studio, builderCourse],
  );
  const initialFooterDraft = useMemo(() => buildFooterDraft(studio), [studio]);
  const [cardDraft, setCardDraft] = useState(initialCardDraft);
  const [cardSavedSnapshot, setCardSavedSnapshot] = useState(
    JSON.stringify(initialCardDraft),
  );
  const [footerDraft, setFooterDraft] = useState(initialFooterDraft);
  const [footerSavedSnapshot, setFooterSavedSnapshot] = useState(
    JSON.stringify(initialFooterDraft),
  );
  const [cardMessage, setCardMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [footerMessage, setFooterMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isSavingFooter, setIsSavingFooter] = useState(false);

  useEffect(() => {
    setCardDraft(initialCardDraft);
    setCardSavedSnapshot(JSON.stringify(initialCardDraft));
  }, [initialCardDraft]);

  useEffect(() => {
    setFooterDraft(initialFooterDraft);
    setFooterSavedSnapshot(JSON.stringify(initialFooterDraft));
  }, [initialFooterDraft]);

  const courseCardDirty = JSON.stringify(cardDraft) !== cardSavedSnapshot;
  const footerDirty = JSON.stringify(footerDraft) !== footerSavedSnapshot;
  const headerDirty =
    activeTab === "course-card"
      ? courseCardDirty || footerDirty
      : activeTab === "sales-page"
        ? salesPageDirty
        : false;
  const contrastWarning = getContrastWarning(cardDraft.accentColor);
  const cardSuggestions = getCardSuggestions(cardDraft);
  const aiSuggestions = useMemo(
    () =>
      buildAiSuggestions(studio).filter(
        (item) => !dismissedSuggestions.includes(item.id),
      ),
    [studio, dismissedSuggestions],
  );
  const previewLessons = studio.course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      ...lesson,
      moduleTitle: module.title,
    })),
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    previewLessons[0]?.id ?? null,
  );

  useEffect(() => {
    setSelectedLessonId((current) =>
      previewLessons.some((lesson) => lesson.id === current)
        ? current
        : (previewLessons[0]?.id ?? null),
    );
  }, [previewLessons]);

  const selectedPreviewLesson =
    previewLessons.find((lesson) => lesson.id === selectedLessonId) ??
    previewLessons[0] ??
    null;

  const pageStatus = studio.salesPage?.status
    ? salesPageStatusLabel[studio.salesPage.status]
    : courseStatusLabel[studio.course.status] ?? studio.course.status;

  const handleCardSave = () => {
    setCardMessage(null);
    setIsSavingCard(true);

    startTransition(async () => {
      const result = await saveCreativeStudioCourseCard(studio.course.id, {
        title: cardDraft.title,
        shortDescription: cardDraft.shortDescription,
        category: cardDraft.category,
        level: cardDraft.level,
        price: cardDraft.price,
        oldPrice: cardDraft.oldPrice,
        coverUrl: cardDraft.coverUrl,
        authorName: cardDraft.authorName,
        badges: parseBadges(cardDraft.badgesText),
        duration: cardDraft.duration,
        lessonsCount: cardDraft.lessonsCount,
        accentColor: cardDraft.accentColor,
        cardStyle: cardDraft.cardStyle,
      });

      if (!result.success) {
        setCardMessage({ tone: "error", text: result.message });
        setIsSavingCard(false);
        return;
      }

      setCardSavedSnapshot(JSON.stringify(cardDraft));
      setCardMessage({ tone: "success", text: result.message });
      setIsSavingCard(false);
      router.refresh();
    });
  };

  const handleFooterSave = () => {
    setFooterMessage(null);
    setIsSavingFooter(true);

    startTransition(async () => {
      const result = await saveCreativeStudioFooterSocials(
        studio.course.id,
        footerDraft,
      );

      if (!result.success) {
        setFooterMessage({ tone: "error", text: result.message });
        setIsSavingFooter(false);
        return;
      }

      setFooterSavedSnapshot(JSON.stringify(footerDraft));
      setFooterMessage({ tone: "success", text: result.message });
      setIsSavingFooter(false);
      router.refresh();
    });
  };

  const handleSuggestionApply = (suggestion: AiStudioSuggestion) => {
    if (!suggestion.lessonId) {
      return;
    }

    if (suggestion.kind !== "practice-pack") {
      setActiveTab("course-studio");
      setSelectedLessonId(suggestion.lessonId);
      setTimeout(() => scrollToAnchor(`lesson-${suggestion.lessonId}`), 80);
      return;
    }

    setPendingSuggestionId(suggestion.id);

    startTransition(async () => {
      const result = await generateAuthorLessonAiContent(suggestion.lessonId!);
      setPendingSuggestionId(null);

      if (!result.success) {
        return;
      }

      setDismissedSuggestions((current) => [...current, suggestion.id]);
      router.refresh();
    });
  };

  const handleHeaderAction = (action: "submit" | "publish") => {
    setPendingHeaderAction(action);

    startTransition(async () => {
      const result =
        action === "submit"
          ? await submitSalesPageForModeration(studio.course.id, { message: "" })
          : await publishSalesPage(studio.course.id);

      setPendingHeaderAction(null);

      if (!result.success) {
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.14),transparent_22%),radial-gradient(circle_at_top_right,rgba(15,118,110,0.12),transparent_24%),linear-gradient(180deg,#f4f7fb_0%,#fbfbfd_42%,#f4f6fb_100%)]">
      <div className="sticky top-0 z-40 border-b border-black/8 bg-white/86 backdrop-blur-2xl">
        <div className="flex w-full flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <PremiumButton asChild tone="secondary" className="h-11 px-4">
              <Link href="/author">
                <ArrowLeft className="mr-2 size-4" />
                Back to Author Dashboard
              </Link>
            </PremiumButton>

            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-[1.3rem] bg-[#05070b] text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.18)]">
                N
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="primary">Creative Studio AI</Badge>
                  <Badge variant="subtle">{pageStatus}</Badge>
                  <Badge variant={headerDirty ? "default" : "subtle"}>
                    {headerDirty ? "Unsaved" : "Saved"}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
                    {studio.course.title}
                  </h1>
                  <span className="text-sm text-black/42">
                    Nowa School
                  </span>
                </div>
                <p className="mt-1 text-sm text-black/46">
                  {studioTabs.find((tab) => tab.key === activeTab)?.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-full border border-black/8 bg-[#f6f7fb] p-1">
            {studioTabs
              .filter((tab) => tab.key !== "ai-assistant")
              .map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition",
                      active
                        ? "bg-white text-black shadow-sm"
                        : "text-black/48 hover:text-black",
                    )}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                );
              })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PremiumButton
              type="button"
              tone="secondary"
              className="h-11 px-4"
              onClick={() => scrollToAnchor("creative-preview")}
            >
              <Eye className="mr-2 size-4" />
              Preview
            </PremiumButton>

            <PremiumButton
              type="button"
              tone={activeTab === "ai-assistant" ? "primary" : "secondary"}
              className="h-11 px-4"
              onClick={() => setActiveTab("ai-assistant")}
            >
              <WandSparkles className="mr-2 size-4" />
              AI Improve
            </PremiumButton>

            <div className="inline-flex items-center rounded-full border border-black/8 bg-[#f5f6fb] p-1">
              {[
                { key: "desktop", label: "Desktop", icon: Laptop2 },
                { key: "tablet", label: "Tablet", icon: TabletSmartphone },
                { key: "mobile", label: "Mobile", icon: MonitorSmartphone },
              ].map((item) => {
                const active = previewDevice === item.key;
                const Icon = item.icon;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPreviewDevice(item.key as PreviewDevice)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition",
                      active ? "bg-white text-black shadow-sm" : "text-black/48",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <PremiumButton
              type="button"
              className="h-11 px-4"
              disabled={pendingHeaderAction !== null}
              onClick={() => handleHeaderAction("submit")}
            >
              {pendingHeaderAction === "submit" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              Submit for Review
            </PremiumButton>

            <PremiumButton
              type="button"
              tone="secondary"
              className="h-11 px-4"
              disabled={studio.salesPage?.status !== "APPROVED" || pendingHeaderAction !== null}
              onClick={() => handleHeaderAction("publish")}
            >
              {pendingHeaderAction === "publish" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <BadgeCheck className="mr-2 size-4" />
              )}
              Publish
            </PremiumButton>

            <details className="relative">
              <summary className="list-none">
                <PremiumButton type="button" tone="secondary" className="h-11 px-4">
                  More
                </PremiumButton>
              </summary>
              <div className="absolute right-0 z-20 mt-3 w-72 rounded-[1.6rem] border border-black/8 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
                <Link href={`/courses/${studio.course.slug}`} className="block rounded-[1.1rem] px-4 py-3 text-sm text-black/72 transition hover:bg-[#f7f8fc] hover:text-black">
                  Open public course page
                </Link>
                <Link href={`/author/courses/${studio.course.id}/preview/sales-page`} className="block rounded-[1.1rem] px-4 py-3 text-sm text-black/72 transition hover:bg-[#f7f8fc] hover:text-black">
                  Open sales page preview
                </Link>
                <Link href={`/author/courses/${studio.course.id}/studio/overview`} className="block rounded-[1.1rem] px-4 py-3 text-sm text-black/72 transition hover:bg-[#f7f8fc] hover:text-black">
                  Open legacy studio
                </Link>
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="w-full px-5 py-6 sm:px-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {activeTab === "course-card" ? (
            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-black/32">
                        Course Card Editor
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                        Упаковка карточки каталога
                      </h3>
                    </div>
                    <Badge variant="subtle">
                      {courseCardDirty ? "Unsaved" : "Saved"}
                    </Badge>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="card-title">Title</Label>
                      <Input
                        id="card-title"
                        value={cardDraft.title}
                        onChange={(event) =>
                          setCardDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card-short-description">Short description</Label>
                      <Textarea
                        id="card-short-description"
                        rows={4}
                        value={cardDraft.shortDescription}
                        onChange={(event) =>
                          setCardDraft((current) => ({
                            ...current,
                            shortDescription: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="card-category">Category</Label>
                        <Input
                          id="card-category"
                          value={cardDraft.category}
                          onChange={(event) =>
                            setCardDraft((current) => ({
                              ...current,
                              category: event.target.value as CourseCardDraft["category"],
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="card-level">Level</Label>
                        <Input
                          id="card-level"
                          value={cardDraft.level}
                          onChange={(event) =>
                            setCardDraft((current) => ({
                              ...current,
                              level: event.target.value as CourseCardDraft["level"],
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="card-price">Price</Label>
                        <Input
                          id="card-price"
                          type="number"
                          min="0"
                          value={cardDraft.price}
                          onChange={(event) =>
                            setCardDraft((current) => ({
                              ...current,
                              price: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="card-old-price">Old price</Label>
                        <Input
                          id="card-old-price"
                          type="number"
                          min="0"
                          value={cardDraft.oldPrice ?? ""}
                          onChange={(event) =>
                            setCardDraft((current) => ({
                              ...current,
                              oldPrice: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card-author-name">Author name</Label>
                      <Input
                        id="card-author-name"
                        value={cardDraft.authorName}
                        onChange={(event) =>
                          setCardDraft((current) => ({
                            ...current,
                            authorName: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card-badges">Badges</Label>
                      <Input
                        id="card-badges"
                        value={cardDraft.badgesText}
                        onChange={(event) =>
                          setCardDraft((current) => ({
                            ...current,
                            badgesText: event.target.value,
                          }))
                        }
                        placeholder="AI-enhanced, Certificate, Community"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="card-duration">Duration</Label>
                        <Input
                          id="card-duration"
                          value={cardDraft.duration}
                          onChange={(event) =>
                            setCardDraft((current) => ({
                              ...current,
                              duration: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="card-lessons-count">Lessons count</Label>
                        <Input
                          id="card-lessons-count"
                          type="number"
                          min="0"
                          value={cardDraft.lessonsCount}
                          onChange={(event) =>
                            setCardDraft((current) => ({
                              ...current,
                              lessonsCount: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="card-accent-color">Accent color</Label>
                        <input
                          id="card-accent-color"
                          type="color"
                          value={cardDraft.accentColor}
                          onChange={(event) =>
                            setCardDraft((current) => ({
                              ...current,
                              accentColor: event.target.value,
                            }))
                          }
                          className="h-11 w-16 rounded-2xl border border-black/8 bg-white p-1"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {accentPresets.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() =>
                              setCardDraft((current) => ({
                                ...current,
                                accentColor: preset.value,
                              }))
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3 py-2 text-sm text-black/62 transition hover:border-black/14"
                          >
                            <span
                              className="size-3 rounded-full"
                              style={{ backgroundColor: preset.value }}
                            />
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      {contrastWarning ? (
                        <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          {contrastWarning}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <Label>Card style</Label>
                      <div className="grid gap-3">
                        {cardStyleOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setCardDraft((current) => ({
                                ...current,
                                cardStyle: option.value,
                              }))
                            }
                            className={cn(
                              "rounded-[1.5rem] border px-4 py-4 text-left transition",
                              cardDraft.cardStyle === option.value
                                ? "border-[#3d3bff]/24 bg-[#eef0ff]"
                                : "border-black/8 bg-white hover:border-black/12 hover:bg-[#fafbff]",
                            )}
                          >
                            <p className="text-sm font-medium text-black">{option.label}</p>
                            <p className="mt-2 text-sm leading-6 text-black/48">
                              {option.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <MockUploadDropzone
                      id="creative-card-cover"
                      title="Cover image"
                      description="Большая clean upload-зона вместо ugly file input. Для MVP сохраняем mock upload URL."
                      hint="PNG, JPG, WEBP. В production можно будет подключить storage provider."
                      icon={ImagePlus}
                      currentLabel={cardDraft.coverUrl ? cardDraft.coverUrl.split("/").at(-1) ?? cardDraft.coverUrl : null}
                      onUploaded={async (payload) => {
                        setCardDraft((current) => ({
                          ...current,
                          coverUrl: payload.url,
                        }));
                      }}
                    />
                  </div>

                  {cardMessage ? (
                    <div
                      className={cn(
                        "mt-6 rounded-[1.4rem] px-4 py-3 text-sm",
                        cardMessage.tone === "success"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-red-200 bg-red-50 text-red-600",
                      )}
                    >
                      {cardMessage.text}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <PremiumButton
                      type="button"
                      className="h-11 px-5"
                      disabled={isSavingCard}
                      onClick={handleCardSave}
                    >
                      {isSavingCard ? (
                        <>
                          <LoaderCircle className="mr-2 size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save course card"
                      )}
                    </PremiumButton>
                    <PremiumButton
                      type="button"
                      tone="secondary"
                      className="h-11 px-5"
                      onClick={() => {
                        setCardDraft(initialCardDraft);
                        setCardMessage(null);
                      }}
                    >
                      Reset
                    </PremiumButton>
                  </div>
                </PremiumCard>
              </div>

              <div id="creative-preview" className="space-y-5">
                <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-black/32">
                        Live preview
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                        Catalog card modes
                      </h3>
                    </div>
                    <Badge variant="subtle">
                      {previewDevice === "desktop"
                        ? "Desktop first"
                        : previewDevice === "tablet"
                          ? "Tablet frame"
                          : "Mobile frame"}
                    </Badge>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_right,rgba(61,59,255,0.12),transparent_28%),linear-gradient(180deg,#f7f9fc_0%,#eef2f7_100%)] p-5">
                    <div className="grid gap-4 xl:grid-cols-3">
                      <CreativeCourseCardPreview draft={cardDraft} mode="desktop" />
                      <CreativeCourseCardPreview draft={cardDraft} mode="mobile" />
                      <CreativeCourseCardPreview draft={cardDraft} mode="compact" />
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.8rem] border border-black/8 bg-[#fbfbfd] p-5">
                    <p className="text-sm font-medium text-black">
                      Как карточка будет смотреться рядом с другими курсами
                    </p>
                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-[1.8rem] border border-black/6 bg-white p-4 opacity-60">
                        <div className="h-40 rounded-[1.3rem] bg-[#eef2f7]" />
                        <div className="mt-4 h-4 w-2/3 rounded-full bg-[#eef2f7]" />
                        <div className="mt-3 h-3 w-full rounded-full bg-[#f4f6fa]" />
                      </div>
                      <CreativeCourseCardPreview draft={cardDraft} mode="desktop" />
                      <div className="rounded-[1.8rem] border border-black/6 bg-white p-4 opacity-60">
                        <div className="h-40 rounded-[1.3rem] bg-[#eef2f7]" />
                        <div className="mt-4 h-4 w-1/2 rounded-full bg-[#eef2f7]" />
                        <div className="mt-3 h-3 w-4/5 rounded-full bg-[#f4f6fa]" />
                      </div>
                    </div>
                  </div>
                </PremiumCard>
              </div>

              <div className="space-y-5">
                <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                      <Brain className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-black/32">
                        AI hints
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-black">
                        Make the card more clickable
                      </h3>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {cardSuggestions.map((item) => (
                      <div key={item} className="rounded-[1.4rem] border border-black/8 bg-[#fafbff] px-4 py-4 text-sm leading-7 text-black/56">
                        {item}
                      </div>
                    ))}
                  </div>
                </PremiumCard>

                <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
                  <p className="text-xs uppercase tracking-[0.22em] text-black/32">
                    Locked Footer Socials
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-black">
                    Footer links only
                  </p>

                  <div className="mt-5 space-y-4">
                    {(
                      [
                        "telegram",
                        "instagram",
                        "youtube",
                        "tiktok",
                        "vk",
                        "website",
                        "email",
                        "community",
                      ] as Array<keyof FooterSocialLinks>
                    ).map((key) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`footer-${key}`}>{key}</Label>
                        <Input
                          id={`footer-${key}`}
                          value={footerDraft[key] ?? ""}
                          onChange={(event) =>
                            setFooterDraft((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  {footerMessage ? (
                    <div
                      className={cn(
                        "mt-5 rounded-[1.4rem] px-4 py-3 text-sm",
                        footerMessage.tone === "success"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-red-200 bg-red-50 text-red-600",
                      )}
                    >
                      {footerMessage.text}
                    </div>
                  ) : null}

                  <div className="mt-5 flex gap-3">
                    <PremiumButton
                      type="button"
                      className="h-11 px-5"
                      disabled={isSavingFooter}
                      onClick={handleFooterSave}
                    >
                      {isSavingFooter ? (
                        <>
                          <LoaderCircle className="mr-2 size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save socials"
                      )}
                    </PremiumButton>
                    <PremiumButton
                      type="button"
                      tone="secondary"
                      className="h-11 px-5"
                      onClick={() => setFooterDraft(initialFooterDraft)}
                    >
                      Reset
                    </PremiumButton>
                  </div>
                </PremiumCard>

                <LockedFooterPreview socials={footerDraft} />
              </div>
            </div>
          ) : null}

          {activeTab === "sales-page" ? (
            <div className="space-y-5">
              <SalesPageStudio
                course={studio.course}
                salesPage={studio.salesPage}
                analytics={studio.analytics}
                moderation={studio.moderation}
                embedded
                onDirtyChange={setSalesPageDirty}
                deviceModeOverride={previewDevice}
              />
            </div>
          ) : null}

          {activeTab === "course-studio" ? (
            <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-black/32">
                        Course outline
                      </p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight text-black">
                        Modules and lessons
                      </h3>
                    </div>
                    <Badge variant="subtle">{builderCourse.modules.length} modules</Badge>
                  </div>

                  <div className="mt-5 space-y-3">
                    {builderCourse.modules.length ? (
                      builderCourse.modules.map((module) => (
                        <div key={module.id} className="rounded-[1.5rem] border border-black/8 bg-[#fafbff] p-4">
                          <button
                            type="button"
                            onClick={() => scrollToAnchor(`module-${module.id}`)}
                            className="w-full text-left"
                          >
                            <p className="text-sm font-medium text-black">{module.title}</p>
                            <p className="mt-2 text-sm leading-6 text-black/48">
                              {module.description}
                            </p>
                          </button>

                          <div className="mt-4 space-y-2">
                            {module.lessons.map((lesson) => (
                              <button
                                key={lesson.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLessonId(lesson.id);
                                  scrollToAnchor(`lesson-${lesson.id}`);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-[1.1rem] px-3 py-3 text-left text-sm transition",
                                  selectedLessonId === lesson.id
                                    ? "bg-white text-black shadow-sm"
                                    : "text-black/58 hover:bg-white",
                                )}
                              >
                                <span>{lesson.title}</span>
                                <ChevronStatus
                                  ready={
                                    Boolean(lesson.videoUrl) &&
                                    lesson.contentText.trim().length > 40
                                  }
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.6rem] border border-dashed border-black/10 bg-white px-4 py-5">
                        <p className="text-base font-medium text-black">
                          Создайте первый модуль курса
                        </p>
                        <p className="mt-2 text-sm leading-6 text-black/48">
                          После этого структура курса появится слева, а AI сможет анализировать логику программы.
                        </p>
                      </div>
                    )}
                  </div>
                </PremiumCard>

                <NewModuleForm courseId={builderCourse.id} />
              </div>

              <div className="space-y-5">
                {builderCourse.modules.length ? (
                  builderCourse.modules.map((module, index) => (
                    <ModuleBuilderCard
                      key={module.id}
                      module={module}
                      isFirst={index === 0}
                      isLast={index === builderCourse.modules.length - 1}
                    />
                  ))
                ) : (
                  <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
                    <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-[#fbfbfd] px-5 py-6">
                      <p className="text-lg font-semibold tracking-tight text-black">
                        Empty state
                      </p>
                      <p className="mt-2 text-sm leading-7 text-black/48">
                        Создайте первый модуль курса и затем первый урок. После этого справа появится student preview.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <PremiumButton type="button" className="h-11 px-5" onClick={() => scrollToAnchor("new-module-title")}>
                          <Plus className="mr-2 size-4" />
                          Add module
                        </PremiumButton>
                        <PremiumButton type="button" tone="secondary" className="h-11 px-5">
                          <WandSparkles className="mr-2 size-4" />
                          Generate structure with AI
                        </PremiumButton>
                      </div>
                    </div>
                  </PremiumCard>
                )}
              </div>

              <div id="creative-preview" className="space-y-5">
                {selectedPreviewLesson ? (
                  <StudentLessonPreview
                    lesson={selectedPreviewLesson}
                    moduleTitle={selectedPreviewLesson.moduleTitle}
                  />
                ) : (
                  <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
                    <p className="text-lg font-semibold tracking-tight text-black">
                      Lesson preview is empty
                    </p>
                    <p className="mt-2 text-sm leading-7 text-black/48">
                      Добавьте первый урок в модуль, чтобы справа увидеть student view и понять, как контент ощущается для ученика.
                    </p>
                  </PremiumCard>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "ai-assistant" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                {aiSuggestions.length ? (
                  aiSuggestions.map((suggestion) => (
                    <PremiumCard key={suggestion.id} padding="lg" className="rounded-[2.1rem] bg-white/92">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="primary">AI Suggestion</Badge>
                            <Badge variant="subtle">{suggestion.difficulty}</Badge>
                            <Badge variant="subtle">{suggestion.estimatedTime}</Badge>
                          </div>
                          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                            {suggestion.title}
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-black/56">
                            {suggestion.reason}
                          </p>
                        </div>
                        <div className="rounded-[1.4rem] bg-[#f7f8fc] px-4 py-4 text-sm text-black/56">
                          <p className="font-medium text-black">{suggestion.moduleTitle}</p>
                          {suggestion.lessonTitle ? (
                            <p className="mt-1">{suggestion.lessonTitle}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-5 rounded-[1.5rem] border border-black/8 bg-[#fafbff] px-4 py-4">
                        <p className="text-sm font-medium text-black">Suggested content</p>
                        <p className="mt-2 text-sm leading-7 text-black/54">
                          {suggestion.suggestedContent}
                        </p>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <PremiumButton
                          type="button"
                          className="h-11 px-5"
                          disabled={pendingSuggestionId === suggestion.id}
                          onClick={() => handleSuggestionApply(suggestion)}
                        >
                          {pendingSuggestionId === suggestion.id ? (
                            <>
                              <LoaderCircle className="mr-2 size-4 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            "Apply"
                          )}
                        </PremiumButton>
                        <PremiumButton
                          type="button"
                          tone="secondary"
                          className="h-11 px-5"
                          onClick={() => {
                            if (suggestion.lessonId) {
                              setActiveTab("course-studio");
                              setSelectedLessonId(suggestion.lessonId);
                              setTimeout(() => scrollToAnchor(`lesson-${suggestion.lessonId}`), 80);
                            }
                          }}
                        >
                          Edit before apply
                        </PremiumButton>
                        <PremiumButton
                          type="button"
                          tone="secondary"
                          className="h-11 px-5"
                          onClick={() =>
                            setDismissedSuggestions((current) => [
                              ...current,
                              suggestion.id,
                            ])
                          }
                        >
                          Reject
                        </PremiumButton>
                      </div>
                    </PremiumCard>
                  ))
                ) : (
                  <PremiumCard padding="lg" className="rounded-[2.1rem] bg-white/92">
                    <p className="text-lg font-semibold tracking-tight text-black">
                      AI suggestions are clean
                    </p>
                    <p className="mt-2 text-sm leading-7 text-black/48">
                      Сейчас AI не видит критичных пробелов. Можно вернуться в студию уроков или sales page и добить последние детали вручную.
                    </p>
                  </PremiumCard>
                )}
              </div>

              <div className="space-y-5">
                <PremiumCard padding="lg" className="rounded-[2.1rem] border-transparent bg-black text-white">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/42">
                    AI logic
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    Context-aware recommendations
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/66">
                    AI анализирует название курса, lesson content, transcript и существующую практику, чтобы предлагать не абстрактные идеи, а конкретные next steps.
                  </p>
                </PremiumCard>

                <PremiumCard padding="lg" className="rounded-[2.1rem] bg-white/92">
                  <p className="text-sm font-medium text-black">Empty states to close</p>
                  <div className="mt-4 space-y-3">
                    {[
                      "Если нет transcript: AI хуже предлагает задания и квизы.",
                      "Если нет practice blocks: ученик читает теорию, но не применяет навык.",
                      "Если нет video layer: урок ощущается незавершенным для premium-продукта.",
                    ].map((item) => (
                      <div key={item} className="rounded-[1.4rem] border border-black/8 bg-[#fafbff] px-4 py-4 text-sm leading-7 text-black/56">
                        {item}
                      </div>
                    ))}
                  </div>
                </PremiumCard>
              </div>
            </div>
          ) : null}

          {activeTab === "analytics" ? <AnalyticsTab studio={studio} /> : null}
        </motion.div>
      </div>
    </div>
  );
}

function ChevronStatus({ ready }: { ready: boolean }) {
  return ready ? (
    <CheckCircle2 className="size-4 text-emerald-600" />
  ) : (
    <CircleDashed className="size-4 text-black/32" />
  );
}
