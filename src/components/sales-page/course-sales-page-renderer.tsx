"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronsUpDown,
  CircleHelp,
  EyeOff,
  FileText,
  Folder,
  GraduationCap,
  GripVertical,
  Layers3,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserCircle2,
  WandSparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/premium/premium-card";
import { cn, formatCurrency, formatDurationMinutes } from "@/lib/utils";
import {
  createSalesPageTemplateBlocks,
  type SalesPageBlockContent,
  type SalesPageBlockDraft,
  type SalesPageCourseContext,
  type SalesPageDeviceMode,
  type SalesPageDraft,
} from "@/lib/sales-page";

type EditorToolbarHandlers = {
  onSelect?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  onDuplicate?: (blockId: string) => void;
  onToggleVisibility?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
  onAiImprove?: (blockId: string) => void;
  onInlineChange?: (
    blockId: string,
    field: string,
    value: string,
  ) => void;
};

type CourseSalesPageRendererProps = {
  course: SalesPageCourseContext;
  salesPage: SalesPageDraft | null;
  deviceMode?: SalesPageDeviceMode;
  mode?: "public" | "editor" | "preview" | "admin";
  selectedBlockId?: string | null;
  toolbarHandlers?: EditorToolbarHandlers;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tracking?: {
    salesPageId: string;
    courseId: string;
    enabled: boolean;
  };
};

const iconMap = {
  bot: Bot,
  briefcase: GraduationCap,
  check: Check,
  community: MessageSquare,
  folder: Folder,
  layers: Layers3,
  shield: ShieldCheck,
  sparkles: Sparkles,
  trophy: Trophy,
  user: UserCircle2,
} as const;

function getVisitorId() {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = "nsai-visitor-id";
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const nextId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `visitor_${Date.now()}`;

  window.localStorage.setItem(storageKey, nextId);
  document.cookie = `nsai_visitor_id=${nextId}; path=/; max-age=31536000; samesite=lax`;

  return nextId;
}

function collectUtmParams(searchParams: URLSearchParams | null) {
  if (!searchParams) {
    return {};
  }

  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "ref",
  ] as const;

  return keys.reduce<Record<string, string>>((acc, key) => {
    const value = searchParams.get(key);

    if (value) {
      acc[key] = value;
    }

    return acc;
  }, {});
}

async function postAnalyticsEvent(input: {
  salesPageId: string;
  courseId: string;
  visitorId?: string | null;
  type: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/analytics/sales-page", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // ignore analytics failures in MVP mode
  }
}

function EditableText({
  blockId,
  field,
  value,
  className,
  enabled,
  onInlineChange,
}: {
  blockId: string;
  field: string;
  value: string;
  className?: string;
  enabled: boolean;
  onInlineChange?: EditorToolbarHandlers["onInlineChange"];
}) {
  if (!enabled) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span
      suppressContentEditableWarning
      contentEditable
      className={cn(
        className,
        "rounded-md outline-none transition duration-200 focus:bg-white/12 focus:px-1 focus:py-0.5",
      )}
      onBlur={(event) =>
        onInlineChange?.(blockId, field, event.currentTarget.textContent ?? "")
      }
    >
      {value}
    </span>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function coerceItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : [];
}

function coerceStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function BlockToolbar({
  block,
  handlers,
}: {
  block: SalesPageBlockDraft;
  handlers?: EditorToolbarHandlers;
}) {
  if (!handlers) {
    return null;
  }

  return (
    <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-full border border-black/8 bg-white/92 p-1.5 shadow-sm backdrop-blur-xl opacity-0 transition duration-200 group-hover:opacity-100">
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-black/56 transition duration-200 hover:bg-black/5 hover:text-black"
        onClick={() => handlers.onSelect?.(block.id)}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-black/56 transition duration-200 hover:bg-black/5 hover:text-black"
        onClick={() => handlers.onMoveUp?.(block.id)}
      >
        <Plus className="size-4 rotate-[-90deg]" />
      </button>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-black/56 transition duration-200 hover:bg-black/5 hover:text-black"
        onClick={() => handlers.onMoveDown?.(block.id)}
      >
        <Plus className="size-4 rotate-90" />
      </button>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-black/56 transition duration-200 hover:bg-black/5 hover:text-black"
        onClick={() => handlers.onDuplicate?.(block.id)}
      >
        <ChevronsUpDown className="size-4" />
      </button>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-black/56 transition duration-200 hover:bg-black/5 hover:text-black"
        onClick={() => handlers.onToggleVisibility?.(block.id)}
      >
        <EyeOff className="size-4" />
      </button>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-[#3d3bff] transition duration-200 hover:bg-[#3d3bff]/8"
        onClick={() => handlers.onAiImprove?.(block.id)}
      >
        <WandSparkles className="size-4" />
      </button>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-red-500 transition duration-200 hover:bg-red-50"
        onClick={() => handlers.onDelete?.(block.id)}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function SectionShell({
  block,
  children,
  selected,
  mode,
  toolbarHandlers,
}: {
  block: SalesPageBlockDraft;
  children: ReactNode;
  selected: boolean;
  mode: CourseSalesPageRendererProps["mode"];
  toolbarHandlers?: EditorToolbarHandlers;
}) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={cn(
        "group relative rounded-[2rem] border border-black/6 bg-white/94 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-8",
        mode === "editor" && "cursor-pointer",
        selected && "ring-2 ring-[#3d3bff]/55",
      )}
      onClick={() => toolbarHandlers?.onSelect?.(block.id)}
    >
      {mode === "editor" ? (
        <BlockToolbar block={block} handlers={toolbarHandlers} />
      ) : null}
      {children}
    </motion.section>
  );
}

function renderIcon(name?: string) {
  const Icon = name ? iconMap[name as keyof typeof iconMap] : undefined;
  return Icon ? <Icon className="size-5" /> : <Sparkles className="size-5" />;
}

function TrackedActionButton({
  href,
  label,
  variant = "primary",
  tracking,
  eventType,
  metadata,
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  tracking?: CourseSalesPageRendererProps["tracking"];
  eventType?: "CTA_CLICK" | "CHECKOUT_CLICK";
  metadata?: Record<string, unknown>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition duration-200",
        variant === "primary"
          ? "bg-[#3d3bff] text-white hover:bg-[#2f2de8]"
          : "border border-black/8 bg-white text-black hover:border-black/14 hover:bg-[#f7f7f7]",
      )}
      onClick={async () => {
        const utm = collectUtmParams(searchParams);
        const visitorId = getVisitorId();
        const url = new URL(href, window.location.origin);

        Object.entries(utm).forEach(([key, value]) => {
          if (!url.searchParams.has(key)) {
            url.searchParams.set(key, value);
          }
        });

        if (tracking?.enabled && eventType) {
          await postAnalyticsEvent({
            salesPageId: tracking.salesPageId,
            courseId: tracking.courseId,
            visitorId,
            type: eventType,
            metadata: {
              label,
              path: window.location.pathname,
              ...utm,
              ...metadata,
            },
          });
        }

        router.push(`${url.pathname}${url.search}`);
      }}
    >
      {label}
      {variant === "primary" ? <ArrowRight className="ml-2 size-4" /> : null}
    </button>
  );
}

export function CourseSalesPageRenderer({
  course,
  salesPage,
  deviceMode = "desktop",
  mode = "public",
  selectedBlockId,
  toolbarHandlers,
  primaryHref,
  primaryLabel = "Купить курс",
  secondaryHref,
  secondaryLabel = "Смотреть программу",
  tracking,
}: CourseSalesPageRendererProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedRef = useRef<Record<string, boolean>>({});
  const blocks = useMemo(
    () =>
      (salesPage?.blocks.length
        ? salesPage.blocks
        : createSalesPageTemplateBlocks("practical-skill", course)
      ).filter((block) => block.isVisible),
    [course, salesPage],
  );

  useEffect(() => {
    if (!tracking?.enabled || trackedRef.current.pageView) {
      return;
    }

    trackedRef.current.pageView = true;
    void postAnalyticsEvent({
      salesPageId: tracking.salesPageId,
      courseId: tracking.courseId,
      visitorId: getVisitorId(),
      type: "PAGE_VIEW",
      metadata: {
        path: pathname,
        referrer: document.referrer || "",
        ...collectUtmParams(searchParams),
      },
    });
  }, [pathname, searchParams, tracking]);

  useEffect(() => {
    if (!tracking?.enabled) {
      return;
    }

    const thresholds = [
      { key: "scroll25", ratio: 0.25, event: "SCROLL_25" },
      { key: "scroll50", ratio: 0.5, event: "SCROLL_50" },
      { key: "scroll75", ratio: 0.75, event: "SCROLL_75" },
      { key: "scroll100", ratio: 1, event: "SCROLL_100" },
    ] as const;

    const onScroll = () => {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 1;

      thresholds.forEach((threshold) => {
        if (!trackedRef.current[threshold.key] && progress >= threshold.ratio) {
          trackedRef.current[threshold.key] = true;
          void postAnalyticsEvent({
            salesPageId: tracking.salesPageId,
            courseId: tracking.courseId,
            visitorId: getVisitorId(),
            type: threshold.event,
            metadata: {
              path: pathname,
              ...collectUtmParams(searchParams),
            },
          });
        }
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, searchParams, tracking]);

  const previewClassName =
    deviceMode === "mobile"
      ? "mx-auto max-w-[430px] rounded-[2.4rem] border border-black/8 bg-[#f7f8fb] p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
      : "";

  return (
    <div className={previewClassName}>
      <div className="space-y-5">
        {blocks.map((block) => {
          const content = block.content as SalesPageBlockContent;
          const items = coerceItems(content.items);
          const faqs = coerceItems(content.faqs);
          const badges = coerceStrings(content.badges);
          const included = coerceStrings(content.included);
          const deliverables = coerceStrings(content.deliverables);
          const screenshots = coerceStrings(content.screenshots);
          const links = coerceItems(content.links);
          const selected = selectedBlockId === block.id;
          const inlineEnabled = mode === "editor" && selected;

          if (block.type === "HERO") {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {badges.map((badge) => (
                        <Badge key={badge} variant="subtle">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                    <h1 className="mt-5 text-[clamp(2.3rem,5vw,4.8rem)] font-semibold leading-[0.95] tracking-tight text-black">
                      <EditableText
                        blockId={block.id}
                        field="headline"
                        value={String(content.headline ?? course.title)}
                        enabled={inlineEnabled}
                        onInlineChange={toolbarHandlers?.onInlineChange}
                      />
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-black/62 sm:text-lg">
                      <EditableText
                        blockId={block.id}
                        field="subheadline"
                        value={String(content.subheadline ?? course.description)}
                        enabled={inlineEnabled}
                        onInlineChange={toolbarHandlers?.onInlineChange}
                      />
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {primaryHref ? (
                        <TrackedActionButton
                          href={primaryHref}
                          label={String(content.primaryCtaText ?? primaryLabel)}
                          tracking={tracking}
                          eventType="CHECKOUT_CLICK"
                          metadata={{ blockId: block.id }}
                        />
                      ) : null}
                      {secondaryHref ? (
                        <TrackedActionButton
                          href={secondaryHref}
                          label={String(content.secondaryCtaText ?? secondaryLabel)}
                          variant="secondary"
                          tracking={tracking}
                          eventType="CTA_CLICK"
                          metadata={{ blockId: block.id, secondary: true }}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.14),transparent_28%),linear-gradient(160deg,#0b1020_0%,#101936_100%)] p-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
                    <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/6">
                      {content.coverImage ? (
                        <Image
                          src={String(content.coverImage)}
                          alt={course.title}
                          width={1200}
                          height={840}
                          unoptimized
                          className="h-52 w-full object-cover"
                        />
                      ) : (
                        <div className="h-52 w-full bg-[radial-gradient(circle_at_top_right,rgba(122,120,255,0.35),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(119,219,231,0.22),transparent_30%),linear-gradient(135deg,#0f172a_0%,#3d3bff_100%)]" />
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-white/56">Стоимость</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight">
                          {formatCurrency(course.price, course.currency)}
                        </p>
                      </div>
                      <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/78">
                        {course.level}
                      </div>
                    </div>
                    <div className="mt-4 rounded-[1.4rem] bg-white/8 p-4 text-sm text-white/74">
                      <p className="font-medium text-white">{course.author.name}</p>
                      <p className="mt-1 text-white/62">{course.category}</p>
                    </div>
                  </div>
                </div>
              </SectionShell>
            );
          }

          if (
            [
              "OUTCOMES",
              "WHO_IS_THIS_FOR",
              "FEATURES",
              "FILES_INCLUDED",
              "BONUSES",
              "TESTIMONIALS",
              "PROCESS",
              "COMMUNITY",
              "ICON_GRID",
            ].includes(block.type)
          ) {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <div className="max-w-3xl">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                    {block.title ?? block.type}
                  </p>
                  {block.subtitle ? (
                    <p className="mt-4 text-lg leading-8 text-black/60">
                      {block.subtitle}
                    </p>
                  ) : null}
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.length ? (
                    items.map((item, index) => (
                      <PremiumCard
                        key={`${block.id}-${index}`}
                        padding="md"
                        className="rounded-[1.7rem] border-black/6 bg-[#fafbff]"
                      >
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                          {renderIcon(typeof item.icon === "string" ? item.icon : undefined)}
                        </div>
                        <p className="mt-4 text-lg font-semibold tracking-tight text-black">
                          {String(item.title ?? "Новый тезис")}
                        </p>
                        {item.description ? (
                          <p className="mt-3 text-sm leading-7 text-black/58">
                            {String(item.description)}
                          </p>
                        ) : null}
                      </PremiumCard>
                    ))
                  ) : (
                    <p className="text-sm text-black/54">Добавь элементы этого блока в панели слева.</p>
                  )}
                </div>
              </SectionShell>
            );
          }

          if (block.type === "WHAT_YOU_WILL_BUILD" || block.type === "IMAGE_TEXT") {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {block.title ?? "Build outcome"}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl">
                      <EditableText
                        blockId={block.id}
                        field="headline"
                        value={String(content.headline ?? "Что ты соберешь руками")}
                        enabled={inlineEnabled}
                        onInlineChange={toolbarHandlers?.onInlineChange}
                      />
                    </h2>
                    <p className="mt-4 max-w-3xl text-base leading-8 text-black/60">
                      <EditableText
                        blockId={block.id}
                        field="body"
                        value={String(content.body ?? course.description)}
                        enabled={inlineEnabled}
                        onInlineChange={toolbarHandlers?.onInlineChange}
                      />
                    </p>

                    {deliverables.length ? (
                      <div className="mt-6 flex flex-wrap gap-3">
                        {deliverables.map((item) => (
                          <div
                            key={item}
                            className="rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-medium text-black/64"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="overflow-hidden rounded-[2rem] border border-black/6 bg-[#f5f7fb]">
                    {screenshots[0] || content.coverImage ? (
                      <Image
                        src={String(screenshots[0] ?? content.coverImage)}
                        alt={String(content.headline ?? course.title)}
                        width={1200}
                        height={900}
                        unoptimized
                        className="h-full min-h-[280px] w-full object-cover"
                      />
                    ) : (
                      <div className="min-h-[280px] bg-[radial-gradient(circle_at_top_right,rgba(61,59,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(71,183,255,0.12),transparent_32%),linear-gradient(135deg,#111827_0%,#3d3bff_100%)]" />
                    )}
                  </div>
                </div>
              </SectionShell>
            );
          }

          if (block.type === "CURRICULUM") {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {block.title ?? "Curriculum"}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
                      Программа курса
                    </h2>
                    <p className="mt-4 max-w-3xl text-base leading-8 text-black/60">
                      {String(
                        content.body ??
                          `Курс состоит из ${course.modules.length} модулей и помогает двигаться от базовой логики к практическому результату.`,
                      )}
                    </p>
                  </div>
                  <div className="rounded-full bg-[#f5f6fb] px-4 py-3 text-sm text-black/58">
                    {course.modules.length} модулей
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {course.modules.map((module, index) => (
                    <PremiumCard
                      key={module.id}
                      padding="md"
                      className="rounded-[1.8rem] border-black/6 bg-[#fbfbfd]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-black/42">Модуль {index + 1}</p>
                          <h3 className="mt-2 text-xl font-semibold tracking-tight text-black">
                            {module.title}
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-black/56">
                            {module.description}
                          </p>
                        </div>
                        <div className="rounded-full bg-white px-4 py-2 text-sm text-black/56">
                          {module.lessons.length} уроков
                        </div>
                      </div>
                      <div className="mt-5 space-y-3">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-black/6 bg-white px-4 py-4 text-sm text-black/62"
                          >
                            <div>
                              <p className="font-medium text-black">
                                {lessonIndex + 1}. {lesson.title}
                              </p>
                              <p className="mt-1 text-black/48">{lesson.description}</p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#f6f7fb] px-3 py-2">
                              <FileText className="size-4 text-[#3d3bff]" />
                              {formatDurationMinutes(lesson.durationMinutes ?? 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </PremiumCard>
                  ))}
                </div>
              </SectionShell>
            );
          }

          if (block.type === "AUTHOR") {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
                  <div className="rounded-[2rem] border border-black/6 bg-[#f8f9ff] p-6">
                    <Avatar className="size-20 rounded-[1.6rem]">
                      {course.author.avatarUrl ? (
                        <AvatarImage src={course.author.avatarUrl} alt={course.author.name} />
                      ) : null}
                      <AvatarFallback className="rounded-[1.6rem] text-xl font-semibold">
                        {getInitials(course.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="mt-4 text-xl font-semibold tracking-tight text-black">
                      {course.author.name}
                    </p>
                    <p className="mt-2 text-sm text-black/48">{course.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {block.title ?? "Author"}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
                      Учиться у практиков с внятной системой
                    </h2>
                    <p className="mt-4 text-base leading-8 text-black/60">
                      {String(
                        content.body ??
                          "Этот курс создан так, чтобы студент понимал не только тему, но и сценарий применения навыка.",
                      )}
                    </p>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {items.map((item, index) => (
                        <PremiumCard
                          key={`${block.id}-${index}`}
                          padding="md"
                          className="rounded-[1.6rem] border-black/6 bg-[#fafbff]"
                        >
                          <p className="text-base font-semibold tracking-tight text-black">
                            {String(item.title ?? "Proof point")}
                          </p>
                          {item.description ? (
                            <p className="mt-3 text-sm leading-7 text-black/56">
                              {String(item.description)}
                            </p>
                          ) : null}
                        </PremiumCard>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionShell>
            );
          }

          if (block.type === "FAQ") {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                  {block.title ?? "FAQ"}
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
                  Вопросы до покупки
                </h2>
                <div className="mt-6 space-y-3">
                  {faqs.length ? (
                    faqs.map((item, index) => (
                      <details
                        key={`${block.id}-${index}`}
                        className="rounded-[1.6rem] border border-black/6 bg-[#fbfbfd] px-5 py-4"
                        onToggle={(event) => {
                          if (
                            tracking?.enabled &&
                            event.currentTarget.open
                          ) {
                            void postAnalyticsEvent({
                              salesPageId: tracking.salesPageId,
                              courseId: tracking.courseId,
                              visitorId: getVisitorId(),
                              type: "FAQ_OPEN",
                              metadata: {
                                question: String(item.question ?? ""),
                                path: pathname,
                                ...collectUtmParams(searchParams),
                              },
                            });
                          }
                        }}
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-black">
                          {String(item.question ?? "Вопрос")}
                          <CircleHelp className="size-4 text-black/36" />
                        </summary>
                        <p className="mt-4 text-sm leading-7 text-black/58">
                          {String(item.answer ?? "")}
                        </p>
                      </details>
                    ))
                  ) : (
                    <p className="text-sm text-black/56">Добавь вопросы и ответы в редакторе блока.</p>
                  )}
                </div>
              </SectionShell>
            );
          }

          if (block.type === "PRICING") {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {block.title ?? "Pricing"}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
                      {String(content.headline ?? "Что входит в стоимость")}
                    </h2>
                    <div className="mt-6 grid gap-3">
                      {included.length ? (
                        included.map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-3 rounded-[1.4rem] border border-black/6 bg-[#fbfbfd] px-4 py-4 text-sm text-black/62"
                          >
                            <div className="flex size-8 items-center justify-center rounded-full bg-[#eef0ff] text-[#3d3bff]">
                              <Check className="size-4" />
                            </div>
                            {item}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-black/56">Добавь список того, что входит в курс.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[2rem] border border-black/6 bg-black p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
                    <p className="text-sm text-white/56">Стоимость</p>
                    {content.oldPrice ? (
                      <p className="mt-3 text-lg text-white/42 line-through">
                        {String(content.oldPrice)}
                      </p>
                    ) : null}
                    <p className="mt-2 text-5xl font-semibold tracking-tight">
                      {formatCurrency(course.price, course.currency)}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-white/64">
                      Честная цена за структурированную программу, материалы и premium learner experience.
                    </p>
                    <div className="mt-6">
                      {primaryHref ? (
                        <TrackedActionButton
                          href={primaryHref}
                          label={String(content.primaryCtaText ?? primaryLabel)}
                          tracking={tracking}
                          eventType="CHECKOUT_CLICK"
                          metadata={{ blockId: block.id, section: "pricing" }}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </SectionShell>
            );
          }

          if (block.type === "CTA") {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <div className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(71,183,255,0.1),transparent_28%),linear-gradient(145deg,#0b1020_0%,#101936_100%)] p-8 text-white">
                  <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                    <EditableText
                      blockId={block.id}
                      field="headline"
                      value={String(content.headline ?? "Открыть курс и начать путь к результату")}
                      enabled={inlineEnabled}
                      onInlineChange={toolbarHandlers?.onInlineChange}
                    />
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-white/66">
                    <EditableText
                      blockId={block.id}
                      field="subheadline"
                      value={String(content.subheadline ?? course.description)}
                      enabled={inlineEnabled}
                      onInlineChange={toolbarHandlers?.onInlineChange}
                    />
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {primaryHref ? (
                      <TrackedActionButton
                        href={primaryHref}
                        label={String(content.primaryCtaText ?? primaryLabel)}
                        tracking={tracking}
                        eventType="CHECKOUT_CLICK"
                        metadata={{ blockId: block.id, section: "final-cta" }}
                      />
                    ) : null}
                  </div>
                </div>
              </SectionShell>
            );
          }

          if (block.type === "COMPARISON") {
            const comparisonItems = coerceItems(content.comparisonItems);
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                  {block.title ?? "Comparison"}
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
                  Обычный курс vs nowa school course
                </h2>
                <div className="mt-6 overflow-hidden rounded-[1.8rem] border border-black/6">
                  <table className="w-full text-left">
                    <thead className="bg-[#f6f7fb] text-sm text-black/46">
                      <tr>
                        <th className="px-5 py-4 font-medium">Критерий</th>
                        <th className="px-5 py-4 font-medium">Обычный курс</th>
                        <th className="px-5 py-4 font-medium">nowa school</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonItems.map((item, index) => (
                        <tr key={`${block.id}-${index}`} className="border-t border-black/6 bg-white text-sm text-black/64">
                          <td className="px-5 py-4 font-medium text-black">{String(item.label ?? "")}</td>
                          <td className="px-5 py-4">{String(item.ordinaryCourse ?? "")}</td>
                          <td className="px-5 py-4">{String(item.nowaSchoolCourse ?? "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionShell>
            );
          }

          if (block.type === "CERTIFICATE") {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {block.title ?? "Certificate"}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
                      {String(content.headline ?? "Verified skills certificate")}
                    </h2>
                    <p className="mt-4 text-base leading-8 text-black/60">
                      {String(
                        content.body ??
                          "Сертификат nowa school подтверждает практический результат и ведет на публичную verification page.",
                      )}
                    </p>
                  </div>
                  <div className="rounded-[2rem] border border-black/6 bg-[#fbfbfd] p-6">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                      <ShieldCheck className="size-5" />
                    </div>
                    <p className="mt-4 text-lg font-semibold tracking-tight text-black">
                      Public verification
                    </p>
                    <p className="mt-3 text-sm leading-7 text-black/56">
                      Без слов про государственный диплом. Только skill-based verification и прозрачная страница сертификата.
                    </p>
                  </div>
                </div>
              </SectionShell>
            );
          }

          return (
            <SectionShell
              key={block.id}
              block={block}
              selected={selected}
              mode={mode}
              toolbarHandlers={toolbarHandlers}
            >
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                {block.title ?? block.type}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
                <EditableText
                  blockId={block.id}
                  field="headline"
                  value={String(content.headline ?? block.title ?? "Новый блок")}
                  enabled={inlineEnabled}
                  onInlineChange={toolbarHandlers?.onInlineChange}
                />
              </h2>
              <p className="mt-4 text-base leading-8 text-black/60">
                <EditableText
                  blockId={block.id}
                  field="body"
                  value={String(content.body ?? "Добавь содержимое этого блока в панели настроек.")}
                  enabled={inlineEnabled}
                  onInlineChange={toolbarHandlers?.onInlineChange}
                />
              </p>

              {links.length ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {links.map((link, index) => (
                    <Link
                      key={`${block.id}-link-${index}`}
                      href={String(link.url ?? "#")}
                      className="inline-flex items-center rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-medium text-black/66 transition duration-200 hover:border-black/14 hover:bg-[#f7f7f7]"
                    >
                      {String(link.label ?? "Link")}
                    </Link>
                  ))}
                </div>
              ) : null}
            </SectionShell>
          );
        })}
      </div>
    </div>
  );
}
