"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronsUpDown,
  CircleHelp,
  Copy,
  EyeOff,
  FileText,
  Folder,
  GraduationCap,
  GripVertical,
  Layers3,
  LayoutPanelTop,
  MessageSquare,
  MonitorPlay,
  Palette,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UserCircle2,
  Users,
  WandSparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PremiumCard } from "@/components/premium/premium-card";
import { cn, formatCurrency, formatDurationMinutes } from "@/lib/utils";
import {
  buildSalesPageBlockAppearance,
  buildSalesPageSectionAppearance,
  coerceSalesPageBlockSettings,
  coerceSalesPageSectionSettings,
  coerceSalesPageTheme,
  createSalesPageTemplateBlocks,
  getDefaultSalesPageTheme,
  getAutoSalesPageSectionSettings,
  getSalesPageBlockDisplayTitle,
  localizeSalesPageText,
  type FooterSocialLinks,
  type SalesPageBlockContent,
  type SalesPageBlockDraft,
  type SalesPageCourseContext,
  type SalesPageDeviceMode,
  type SalesPageDraft,
  type SalesPageSectionSettings,
} from "@/lib/sales-page";

type EditorToolbarHandlers = {
  onSelect?: (blockId: string) => void;
  onAddBefore?: (blockId: string) => void;
  onAddAfter?: (blockId: string) => void;
  onAddSectionAbove?: (blockId: string) => void;
  onAddSectionBelow?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  onMoveSectionUp?: (blockId: string) => void;
  onMoveSectionDown?: (blockId: string) => void;
  onDuplicate?: (blockId: string) => void;
  onDuplicateSection?: (blockId: string) => void;
  onToggleVisibility?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
  onDeleteSection?: (blockId: string) => void;
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
  book: BookOpen,
  briefcase: BriefcaseBusiness,
  certificate: GraduationCap,
  check: Check,
  community: MessageSquare,
  folder: Folder,
  layers: Layers3,
  message: MessageSquare,
  monitor: MonitorPlay,
  palette: Palette,
  rocket: Rocket,
  shield: ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  trophy: Trophy,
  user: UserCircle2,
  users: Users,
  wand: WandSparkles,
  layout: LayoutPanelTop,
} as const;

function buildFooterSocialHref(
  kind: keyof FooterSocialLinks,
  value: string | undefined,
) {
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

const footerSocialLabels: Record<keyof FooterSocialLinks, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  vk: "VK",
  website: "Website",
  email: "Email",
  community: "Community",
};

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

function getGridColumnsClass(
  columns?: 2 | 3 | 4,
  forceSingleColumn = false,
) {
  if (forceSingleColumn) {
    return "grid-cols-1";
  }

  switch (columns) {
    case 2:
      return "md:grid-cols-2";
    case 4:
      return "md:grid-cols-2 xl:grid-cols-4";
    case 3:
    default:
      return "md:grid-cols-2 xl:grid-cols-3";
  }
}

function canRenderImage(value?: string | null) {
  return Boolean(value && !value.startsWith("/uploads/"));
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
        className="inline-flex size-8 items-center justify-center rounded-full text-[#3d3bff] transition duration-200 hover:bg-[#3d3bff]/8"
        onClick={() => handlers.onAddBefore?.(block.id)}
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-[#3d3bff] transition duration-200 hover:bg-[#3d3bff]/8"
        onClick={() => handlers.onAddAfter?.(block.id)}
      >
        <Plus className="size-4" />
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

type SectionGroupPosition = "single" | "start" | "middle" | "end";

function formatSectionLabel(section: SalesPageSectionSettings) {
  if (section.label) {
    return localizeSalesPageText(section.label);
  }

  return localizeSalesPageText(
    section.id
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "),
  );
}

function SectionToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-black/58 px-3 py-2 text-xs font-medium text-white/86 backdrop-blur-xl transition duration-200 hover:bg-black/72"
    >
      {icon}
      {label}
    </button>
  );
}

function SectionShell({
  block,
  children,
  selected,
  mode,
  toolbarHandlers,
  appearance,
  section,
  sectionAppearance,
  sectionPosition = "single",
}: {
  block: SalesPageBlockDraft;
  children: ReactNode;
  selected: boolean;
  mode: CourseSalesPageRendererProps["mode"];
  toolbarHandlers?: EditorToolbarHandlers;
  appearance: ReturnType<typeof buildSalesPageBlockAppearance>;
  section?: SalesPageSectionSettings | null;
  sectionAppearance?: ReturnType<typeof buildSalesPageSectionAppearance>;
  sectionPosition?: SectionGroupPosition;
}) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={cn(
        "group relative border backdrop-blur-xl",
        section
          ? "overflow-hidden bg-transparent border-transparent shadow-none"
          : "rounded-[2rem] bg-[var(--ns-block-surface)] border-[color:var(--ns-block-border)] shadow-[0_18px_60px_rgba(15,23,42,0.05)]",
        sectionPosition === "single" && "rounded-[2rem]",
        sectionPosition === "start" && "rounded-t-[2.4rem] rounded-b-[1rem]",
        sectionPosition === "middle" && "-mt-3 rounded-[1rem]",
        sectionPosition === "end" && "-mt-3 rounded-t-[1rem] rounded-b-[2.4rem]",
        "text-[color:var(--ns-block-text)]",
        "[&_h1]:text-[color:var(--ns-block-text)] [&_h2]:text-[color:var(--ns-block-text)] [&_h3]:text-[color:var(--ns-block-text)] [&_summary]:text-[color:var(--ns-block-text)] [&_th]:text-[color:var(--ns-block-text)]",
        "[&_p]:text-[color:var(--ns-block-muted)] [&_.ns-block-subtle]:text-[color:var(--ns-block-subtle)]",
        "[&_a.ns-block-link]:border-[color:var(--ns-block-card-border)] [&_a.ns-block-link]:bg-[var(--ns-block-card)] [&_a.ns-block-link]:text-[color:var(--ns-block-secondary-text)]",
        "[&_.ns-block-item]:border-[color:var(--ns-block-card-border)] [&_.ns-block-item]:bg-[var(--ns-block-card)]",
        "[&_.ns-block-item-title]:text-[color:var(--ns-block-text)]",
        "[&_.ns-block-pill]:border-[color:var(--ns-block-card-border)] [&_.ns-block-pill]:bg-[var(--ns-block-pill)] [&_.ns-block-pill]:text-[color:var(--ns-block-muted)]",
        "[&_.ns-block-icon]:bg-[var(--ns-block-icon-bg)] [&_.ns-block-icon]:text-[color:var(--ns-block-icon-text)]",
        "[&_.ns-block-table-head]:bg-[var(--ns-block-table-head)] [&_.ns-block-table-head]:text-[color:var(--ns-block-text)]",
        appearance.paddingClass,
        section && sectionPosition !== "single" && sectionPosition !== "start" && "pt-4 sm:pt-5",
        appearance.alignClass,
        mode === "editor" && "cursor-pointer",
        selected && "ring-2 ring-[#3d3bff]/55",
      )}
      style={
        {
          ...(sectionAppearance?.vars ?? {}),
          ...(appearance.vars as Record<string, string>),
        } as CSSProperties
      }
      onClick={() => toolbarHandlers?.onSelect?.(block.id)}
    >
      {section ? (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 z-0 border bg-[var(--ns-section-surface)] shadow-[0_18px_60px_rgba(15,23,42,0.08)]",
            sectionPosition === "single" && "rounded-[2rem]",
            sectionPosition === "start" && "rounded-t-[2.4rem] rounded-b-[1rem]",
            sectionPosition === "middle" && "rounded-[1rem]",
            sectionPosition === "end" && "rounded-t-[1rem] rounded-b-[2.4rem]",
          )}
          style={
            {
              borderColor: "var(--ns-section-border)",
            } as CSSProperties
          }
        />
      ) : null}
      {mode === "editor" ? (
        <BlockToolbar block={block} handlers={toolbarHandlers} />
      ) : null}
      <div className="relative z-10">
        {section &&
        (sectionPosition === "single" || sectionPosition === "start") ? (
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full bg-[var(--ns-section-badge-bg)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ns-section-badge-text)]">
                Секция
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[color:var(--ns-section-text)]">
                  {formatSectionLabel(section)}
                </p>
                {mode === "editor" ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[color:var(--ns-section-muted)]">
                    {section.id}
                  </p>
                ) : null}
              </div>
            </div>
            {mode === "editor" && toolbarHandlers ? (
              <div className="flex flex-wrap gap-2 opacity-100 transition duration-200 lg:opacity-0 lg:group-hover:opacity-100">
                <SectionToolbarButton
                  icon={<Plus className="size-3.5" />}
                  label="Сверху"
                  onClick={() => toolbarHandlers.onAddSectionAbove?.(block.id)}
                />
                <SectionToolbarButton
                  icon={<Plus className="size-3.5" />}
                  label="Снизу"
                  onClick={() => toolbarHandlers.onAddSectionBelow?.(block.id)}
                />
                <SectionToolbarButton
                  icon={<ArrowUp className="size-3.5" />}
                  label="Вверх"
                  onClick={() => toolbarHandlers.onMoveSectionUp?.(block.id)}
                />
                <SectionToolbarButton
                  icon={<ArrowDown className="size-3.5" />}
                  label="Вниз"
                  onClick={() => toolbarHandlers.onMoveSectionDown?.(block.id)}
                />
                <SectionToolbarButton
                  icon={<Copy className="size-3.5" />}
                  label="Дублировать"
                  onClick={() => toolbarHandlers.onDuplicateSection?.(block.id)}
                />
                <SectionToolbarButton
                  icon={<Trash2 className="size-3.5" />}
                  label="Удалить"
                  onClick={() => toolbarHandlers.onDeleteSection?.(block.id)}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
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
          ? "bg-[var(--ns-block-cta-bg)] text-[color:var(--ns-block-cta-text)] hover:opacity-95"
          : "border border-[color:var(--ns-block-card-border)] bg-[var(--ns-block-secondary-bg)] text-[color:var(--ns-block-secondary-text)] hover:opacity-95",
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
  const pageTheme = salesPage?.theme ?? getDefaultSalesPageTheme();
  const footerSocials = coerceSalesPageTheme(salesPage?.theme).footerSocials ?? {};
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

  const isMobilePreview = deviceMode === "mobile";
  const isTabletPreview = deviceMode === "tablet";
  const previewClassName = isMobilePreview
    ? "mx-auto w-full max-w-[430px] overflow-hidden rounded-[2.4rem] border border-black/8 bg-[#f7f8fb] p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
    : isTabletPreview
      ? "mx-auto w-full max-w-[820px] overflow-hidden rounded-[2.8rem] border border-black/8 bg-[#f7f8fb] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.1)]"
      : "";
  const heroTitleClass = isMobilePreview
    ? "mt-5 text-[2.1rem] font-semibold leading-[0.98] tracking-tight text-black"
    : isTabletPreview
      ? "mt-5 text-[3.2rem] font-semibold leading-[0.96] tracking-tight text-black"
      : "mt-5 text-[clamp(2.3rem,5vw,4.8rem)] font-semibold leading-[0.95] tracking-tight text-black";
  const heroBodyClass = isMobilePreview
    ? "mt-5 max-w-3xl text-[15px] leading-7 text-black/62"
    : isTabletPreview
      ? "mt-5 max-w-3xl text-base leading-8 text-black/62"
      : "mt-5 max-w-3xl text-base leading-8 text-black/62 sm:text-lg";
  const sectionTitleClass = isMobilePreview
    ? "mt-4 text-[1.9rem] font-semibold tracking-tight text-black"
    : isTabletPreview
      ? "mt-4 text-[2.35rem] font-semibold tracking-tight text-black"
      : "mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl";
  const sectionBodyClass = isMobilePreview
    ? "mt-4 text-[15px] leading-7 text-black/60"
    : isTabletPreview
      ? "mt-4 text-base leading-8 text-black/60"
      : "mt-4 text-base leading-8 text-black/60";
  const ctaTitleClass = isMobilePreview
    ? "max-w-3xl text-[1.9rem] font-semibold leading-tight tracking-tight"
    : isTabletPreview
      ? "max-w-3xl text-[2.4rem] font-semibold leading-tight tracking-tight"
      : "max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl";
  const ctaBodyClass = isMobilePreview
    ? "mt-4 max-w-2xl text-[15px] leading-7 text-white/66"
    : isTabletPreview
      ? "mt-4 max-w-2xl text-base leading-8 text-white/66"
      : "mt-4 max-w-2xl text-base leading-8 text-white/66";
  const sectionLeadClass = isMobilePreview
    ? "mt-4 text-[15px] leading-7 text-black/60"
    : isTabletPreview
      ? "mt-4 text-base leading-8 text-black/60"
      : "mt-4 text-lg leading-8 text-black/60";
  const pricingValueClass = isMobilePreview
    ? "mt-2 text-4xl font-semibold tracking-tight"
    : isTabletPreview
      ? "mt-2 text-[2.8rem] font-semibold tracking-tight"
      : "mt-2 text-5xl font-semibold tracking-tight";

  return (
    <div className={previewClassName}>
      <div
        className="space-y-5 rounded-[2rem] p-1"
        style={{
          background: `radial-gradient(circle at top right, ${pageTheme.accentSoft} 0%, transparent 26%), ${pageTheme.background}`,
        }}
      >
        {mode !== "public" ? (
          <section className="px-3 pt-3">
            <div className="overflow-hidden rounded-[1.9rem] border border-black/8 bg-white/86 px-5 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-black/34">
                    Locked system header
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[#0a0d14] text-sm font-semibold text-white">
                      N
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">Nowa School</p>
                      <p className="text-sm text-black/52">
                        Верхняя оболочка каталога и навигация фиксированы.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["Catalog", "Programs", "Reviews"].map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-black/8 bg-[#f7f8fc] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-black/52"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {blocks.map((block, index) => {
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
          const appearance = buildSalesPageBlockAppearance(block.settings, pageTheme);
          const settings = coerceSalesPageBlockSettings(block.settings, pageTheme);
          const section =
            coerceSalesPageSectionSettings(block.settings, pageTheme) ??
            getAutoSalesPageSectionSettings(block.type, pageTheme);
          const previousSection = blocks[index - 1]
            ? coerceSalesPageSectionSettings(blocks[index - 1]?.settings, pageTheme) ??
              getAutoSalesPageSectionSettings(blocks[index - 1].type, pageTheme)
            : null;
          const nextSection = blocks[index + 1]
            ? coerceSalesPageSectionSettings(blocks[index + 1]?.settings, pageTheme) ??
              getAutoSalesPageSectionSettings(blocks[index + 1].type, pageTheme)
            : null;
          let sectionSourceIndex = index;

          if (section) {
            while (sectionSourceIndex > 0) {
              const maybePreviousSection = coerceSalesPageSectionSettings(
                blocks[sectionSourceIndex - 1]?.settings,
                pageTheme,
              ) ??
                getAutoSalesPageSectionSettings(
                  blocks[sectionSourceIndex - 1].type,
                  pageTheme,
                );

              if (maybePreviousSection?.id !== section.id) {
                break;
              }

              sectionSourceIndex -= 1;
            }
          }

          const sectionSourceBlock = section ? blocks[sectionSourceIndex] : null;
          const sectionMeta = sectionSourceBlock
            ? coerceSalesPageSectionSettings(sectionSourceBlock.settings, pageTheme) ??
              getAutoSalesPageSectionSettings(sectionSourceBlock.type, pageTheme)
            : null;
          const sectionPosition: SectionGroupPosition = !section
            ? "single"
            : previousSection?.id === section.id
              ? nextSection?.id === section.id
                ? "middle"
                : "end"
              : nextSection?.id === section.id
                ? "start"
                : "single";
          const sectionAppearance = sectionSourceBlock
            ? buildSalesPageSectionAppearance(
                sectionMeta
                  ? {
                      sectionId: sectionMeta.id,
                      sectionLabel: sectionMeta.label,
                      sectionStyle: sectionMeta.style,
                      sectionAccentColor: sectionMeta.accentColor,
                      sectionSurfaceColor: sectionMeta.surfaceColor,
                      sectionTextColor: sectionMeta.textColor,
                      sectionBorderColor: sectionMeta.borderColor,
                    }
                  : sectionSourceBlock.settings,
                pageTheme,
              )
            : null;
          const splitLayout = !isMobilePreview && settings.layout !== "stacked";

          if (block.type === "HERO") {
            return (
              <SectionShell
                key={block.id}
                block={block}
                selected={selected}
                mode={mode}
                toolbarHandlers={toolbarHandlers}
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <div
                  className={cn(
                    "grid gap-6 lg:items-start",
                    splitLayout
                      ? "lg:grid-cols-[minmax(0,1fr)_320px]"
                      : "lg:grid-cols-1",
                  )}
                >
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {badges.map((badge) => (
                        <div
                          key={badge}
                          className="ns-block-pill rounded-full border px-4 py-2 text-sm font-medium"
                        >
                          {badge}
                        </div>
                      ))}
                    </div>
                    <h1 className={heroTitleClass}>
                      <EditableText
                        blockId={block.id}
                        field="headline"
                        value={String(content.headline ?? course.title)}
                        enabled={inlineEnabled}
                        onInlineChange={toolbarHandlers?.onInlineChange}
                      />
                    </h1>
                    <p className={heroBodyClass}>
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

                  <div
                    className="rounded-[2rem] border p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
                    style={{
                      background:
                        appearance.isDark
                          ? "rgba(255,255,255,0.04)"
                          : `radial-gradient(circle at top left, ${pageTheme.accentSoft} 0%, transparent 28%), linear-gradient(160deg, ${settings.accentColor} 0%, ${pageTheme.text} 100%)`,
                      borderColor: appearance.isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(255,255,255,0.12)",
                      color: "#ffffff",
                    }}
                  >
                    <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/6">
                      {canRenderImage(String(content.coverImage ?? "")) ? (
                        <Image
                          src={String(content.coverImage)}
                          alt={course.title}
                          width={1200}
                          height={840}
                          unoptimized
                          className={cn(
                            "h-52 w-full bg-white/4",
                            settings.mediaFit === "contain"
                              ? "object-contain"
                              : "object-cover",
                          )}
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
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <div className="max-w-3xl">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                    {getSalesPageBlockDisplayTitle(block)}
                  </p>
                  {block.subtitle ? (
                    <p className={sectionLeadClass}>
                      {localizeSalesPageText(block.subtitle)}
                    </p>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "mt-6 grid gap-4",
                    getGridColumnsClass(settings.gridColumns, isMobilePreview),
                  )}
                >
                  {items.length ? (
                    items.map((item, index) => (
                      <PremiumCard
                        key={`${block.id}-${index}`}
                        padding="md"
                        className={cn(
                          "ns-block-item rounded-[1.7rem]",
                          !isMobilePreview &&
                            settings.designStyle === "editorial" &&
                            "md:col-span-2 xl:col-span-2",
                          settings.designStyle === "media" && "overflow-hidden p-0",
                        )}
                      >
                        {settings.designStyle === "media" && item.image ? (
                          <div className="overflow-hidden rounded-[1.35rem]">
                            {canRenderImage(String(item.image)) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={String(item.image)}
                                alt={String(item.title ?? `item-${index + 1}`)}
                                className={cn(
                                  "h-44 w-full",
                                  settings.mediaFit === "contain"
                                    ? "object-contain bg-white"
                                    : "object-cover",
                                )}
                              />
                            ) : (
                              <div className="flex h-44 items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(61,59,255,0.16),transparent_34%),linear-gradient(135deg,#111827_0%,#334155_100%)] px-6 text-center text-sm text-white/78">
                                Демо-изображение
                              </div>
                            )}
                          </div>
                        ) : null}
                        <div className={cn(settings.designStyle === "media" && "p-5")}>
                          <div className="flex items-start gap-3">
                            {settings.designStyle === "numbered" ? (
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ns-block-icon-bg)] text-base font-semibold text-[color:var(--ns-block-icon-text)]">
                                {index + 1}
                              </div>
                            ) : (
                              <div className="ns-block-icon flex size-11 shrink-0 items-center justify-center rounded-2xl">
                                {renderIcon(typeof item.icon === "string" ? item.icon : undefined)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="ns-block-item-title text-lg font-semibold tracking-tight">
                                {String(item.title ?? "Новый тезис")}
                              </p>
                              {item.value ? (
                                <p className="mt-1 text-sm font-medium text-[color:var(--ns-block-subtle)]">
                                  {String(item.value)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          {item.description ? (
                            <p
                              className={cn(
                                "mt-3 text-sm leading-7 text-black/58",
                                settings.designStyle === "editorial" && "text-base leading-8",
                              )}
                            >
                              {String(item.description)}
                            </p>
                          ) : null}
                        </div>
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
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <div
                  className={cn(
                    "grid gap-6",
                    splitLayout
                      ? "lg:grid-cols-[minmax(0,1fr)_320px]"
                      : "lg:grid-cols-1",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {getSalesPageBlockDisplayTitle(block)}
                    </p>
                    <h2 className={sectionTitleClass}>
                      <EditableText
                        blockId={block.id}
                        field="headline"
                        value={localizeSalesPageText(
                          String(content.headline ?? "Что ты соберешь руками"),
                        )}
                        enabled={inlineEnabled}
                        onInlineChange={toolbarHandlers?.onInlineChange}
                      />
                    </h2>
                    <p className={sectionBodyClass}>
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
                            className="ns-block-pill rounded-full border px-4 py-3 text-sm font-medium"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="ns-block-item overflow-hidden rounded-[2rem] border">
                    {canRenderImage(
                      String(screenshots[0] ?? content.coverImage ?? ""),
                    ) ? (
                      <Image
                        src={String(screenshots[0] ?? content.coverImage)}
                        alt={String(content.headline ?? course.title)}
                        width={1200}
                        height={900}
                        unoptimized
                        className={cn(
                          "h-full min-h-[280px] w-full bg-white/4",
                          settings.mediaFit === "contain"
                            ? "object-contain"
                            : "object-cover",
                        )}
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
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {getSalesPageBlockDisplayTitle(block)}
                    </p>
                    <h2 className={sectionTitleClass}>
                      Программа курса
                    </h2>
                    <p className={sectionBodyClass}>
                      {String(
                        content.body ??
                          `Курс состоит из ${course.modules.length} модулей и помогает двигаться от базовой логики к практическому результату.`,
                      )}
                    </p>
                  </div>
                  <div className="ns-block-pill rounded-full border px-4 py-3 text-sm">
                    {course.modules.length} модулей
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {(settings.showModules ? course.modules : []).map((module, index) => (
                    <PremiumCard
                      key={module.id}
                      padding="md"
                      className="ns-block-item rounded-[1.8rem]"
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
                        {settings.showLessonCount ? (
                          <div className="ns-block-pill rounded-full border px-4 py-2 text-sm">
                            {module.lessons.length} уроков
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-5 space-y-3">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className="ns-block-item flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border px-4 py-4 text-sm"
                          >
                            <div>
                              <p className="ns-block-item-title font-medium">
                                {lessonIndex + 1}. {lesson.title}
                              </p>
                              <p className="mt-1 text-black/48">{lesson.description}</p>
                            </div>
                            <div className="ns-block-pill inline-flex items-center gap-2 rounded-full border px-3 py-2">
                              <FileText className="size-4" />
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
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <div
                  className={cn(
                    "grid gap-6 lg:items-start",
                    splitLayout
                      ? "lg:grid-cols-[240px_minmax(0,1fr)]"
                      : "lg:grid-cols-1",
                  )}
                >
                  <div className="ns-block-item rounded-[2rem] border p-6">
                    <Avatar className="size-20 rounded-[1.6rem]">
                      {course.author.avatarUrl ? (
                        <AvatarImage src={course.author.avatarUrl} alt={course.author.name} />
                      ) : null}
                      <AvatarFallback className="rounded-[1.6rem] text-xl font-semibold">
                        {getInitials(course.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="ns-block-item-title mt-4 text-xl font-semibold tracking-tight">
                      {course.author.name}
                    </p>
                    <p className="mt-2 text-sm text-black/48">{course.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {getSalesPageBlockDisplayTitle(block)}
                    </p>
                    <h2 className={sectionTitleClass}>
                      Учиться у практиков с внятной системой
                    </h2>
                    <p className={sectionBodyClass}>
                      {String(
                        content.body ??
                          "Этот курс создан так, чтобы студент понимал не только тему, но и сценарий применения навыка.",
                      )}
                    </p>
                    <div
                      className={cn(
                        "mt-6 grid gap-4",
                        !isMobilePreview && "md:grid-cols-2",
                      )}
                    >
                      {items.map((item, index) => (
                        <PremiumCard
                          key={`${block.id}-${index}`}
                          padding="md"
                          className="ns-block-item rounded-[1.6rem]"
                        >
                          <p className="ns-block-item-title text-base font-semibold tracking-tight">
                            {String(item.title ?? "Точка доверия")}
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
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                  {getSalesPageBlockDisplayTitle(block)}
                </p>
                <h2 className={sectionTitleClass}>
                  Вопросы до покупки
                </h2>
                <div className="mt-6 space-y-3">
                  {faqs.length ? (
                    faqs.map((item, index) => (
                      <details
                        key={`${block.id}-${index}`}
                        className="ns-block-item rounded-[1.6rem] border px-5 py-4"
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
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <div
                  className={cn(
                    "grid gap-6 lg:items-start",
                    splitLayout
                      ? "lg:grid-cols-[minmax(0,1fr)_340px]"
                      : "lg:grid-cols-1",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {getSalesPageBlockDisplayTitle(block)}
                    </p>
                    <h2 className={sectionTitleClass}>
                      {String(content.headline ?? "Что входит в стоимость")}
                    </h2>
                    <div className="mt-6 grid gap-3">
                      {included.length ? (
                        included.map((item) => (
                          <div
                            key={item}
                            className="ns-block-item flex items-center gap-3 rounded-[1.4rem] border px-4 py-4 text-sm"
                          >
                            <div className="ns-block-icon flex size-8 items-center justify-center rounded-full">
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
                  <div
                    className="rounded-[2rem] border p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]"
                    style={{
                      background: `linear-gradient(145deg, ${settings.accentColor} 0%, ${pageTheme.text} 100%)`,
                      borderColor: "rgba(255,255,255,0.12)",
                    }}
                  >
                    <p className="text-sm text-white/56">Стоимость</p>
                    {content.oldPrice ? (
                      <p className="mt-3 text-lg text-white/42 line-through">
                        {String(content.oldPrice)}
                      </p>
                    ) : null}
                    <p className={pricingValueClass}>
                      {formatCurrency(course.price, course.currency)}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-white/64">
                      Честная цена за структурированную программу, материалы и премиальный опыт ученика.
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
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <div
                  className="overflow-hidden rounded-[2rem] p-8 text-white"
                  style={{
                    background:
                      appearance.isDark
                        ? "rgba(255,255,255,0.04)"
                        : `radial-gradient(circle at top left, ${pageTheme.accentSoft}, transparent 30%), radial-gradient(circle at bottom right, ${pageTheme.accentSoft}, transparent 28%), linear-gradient(145deg, ${settings.accentColor} 0%, ${pageTheme.text} 100%)`,
                  }}
                >
                  <h2 className={ctaTitleClass}>
                    <EditableText
                      blockId={block.id}
                      field="headline"
                      value={String(content.headline ?? "Открыть курс и начать путь к результату")}
                      enabled={inlineEnabled}
                      onInlineChange={toolbarHandlers?.onInlineChange}
                    />
                  </h2>
                  <p className={ctaBodyClass}>
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
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                  {getSalesPageBlockDisplayTitle(block)}
                </p>
                <h2 className={sectionTitleClass}>
                  Обычный курс против nowa school
                </h2>
                <div className="mt-6 overflow-hidden rounded-[1.8rem] border border-[color:var(--ns-block-card-border)]">
                  <div className={cn(isMobilePreview && "overflow-x-auto")}>
                    <table
                      className={cn(
                        "w-full text-left",
                        isMobilePreview && "min-w-[640px]",
                      )}
                    >
                    <thead className="ns-block-table-head text-sm">
                      <tr>
                        <th className="px-5 py-4 font-medium">Критерий</th>
                        <th className="px-5 py-4 font-medium">Обычный курс</th>
                        <th className="px-5 py-4 font-medium">nowa school</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonItems.map((item, index) => (
                        <tr key={`${block.id}-${index}`} className="border-t border-[color:var(--ns-block-card-border)] bg-[var(--ns-block-card)] text-sm text-black/64">
                          <td className="px-5 py-4 font-medium text-[color:var(--ns-block-text)]">{String(item.label ?? "")}</td>
                          <td className="px-5 py-4">{String(item.ordinaryCourse ?? "")}</td>
                          <td className="px-5 py-4">{String(item.nowaSchoolCourse ?? "")}</td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
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
                appearance={appearance}
                section={sectionMeta}
                sectionAppearance={sectionAppearance}
                sectionPosition={sectionPosition}
              >
                <div
                  className={cn(
                    "grid gap-6",
                    splitLayout
                      ? "lg:grid-cols-[minmax(0,1fr)_300px]"
                      : "lg:grid-cols-1",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                      {getSalesPageBlockDisplayTitle(block)}
                    </p>
                    <h2 className={sectionTitleClass}>
                      {String(content.headline ?? "Сертификат подтвержденного навыка")}
                    </h2>
                    <p className={sectionBodyClass}>
                      {String(
                        content.body ??
                          "Сертификат nowa school подтверждает практический результат и ведет на публичную страницу верификации.",
                      )}
                    </p>
                  </div>
                  <div className="ns-block-item rounded-[2rem] border p-6">
                    <div className="ns-block-icon flex size-12 items-center justify-center rounded-2xl">
                      <ShieldCheck className="size-5" />
                    </div>
                    <p className="mt-4 text-lg font-semibold tracking-tight text-black">
                      Публичная верификация
                    </p>
                    <p className="mt-3 text-sm leading-7 text-black/56">
                      Без слов про государственный диплом. Только верификация навыка и прозрачная страница сертификата.
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
              appearance={appearance}
              section={sectionMeta}
              sectionAppearance={sectionAppearance}
              sectionPosition={sectionPosition}
            >
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-black/38">
                {getSalesPageBlockDisplayTitle(block)}
              </p>
              <h2 className={sectionTitleClass}>
                <EditableText
                  blockId={block.id}
                  field="headline"
                  value={localizeSalesPageText(
                    String(content.headline ?? getSalesPageBlockDisplayTitle(block) ?? "Новый блок"),
                  )}
                  enabled={inlineEnabled}
                  onInlineChange={toolbarHandlers?.onInlineChange}
                />
              </h2>
              <p className={sectionBodyClass}>
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
                        className="ns-block-link inline-flex items-center rounded-full border px-4 py-3 text-sm font-medium transition duration-200 hover:opacity-90"
                      >
                        {String(link.label ?? "Ссылка")}
                      </Link>
                  ))}
                </div>
              ) : null}
            </SectionShell>
          );
        })}

        <section className="px-3 pb-3 pt-1">
          <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-[#0a0d14] px-6 py-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-lg">
                <p className="text-xs uppercase tracking-[0.22em] text-white/42">
                  Nowa School
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                  {mode === "public" ? "Практические курсы с верификацией навыка" : "Locked system footer"}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/66">
                  {mode === "public"
                    ? "Социальные ссылки автора и курса доступны ниже. Системная навигация и брендовая оболочка остаются частью платформы."
                    : "Логотип и системная оболочка футера зафиксированы. Автор может настраивать только social links курса."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(Object.entries(footerSocials) as Array<
                  [keyof FooterSocialLinks, string | undefined]
                >)
                  .filter(([, value]) => Boolean(value?.trim()))
                  .map(([key, value]) => {
                    const href = buildFooterSocialHref(key, value);

                    return href ? (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/82 transition hover:bg-white/10"
                      >
                        {footerSocialLabels[key]}
                      </a>
                    ) : null;
                  })}
                {Object.values(footerSocials).every((value) => !value?.trim()) ? (
                  <p className="max-w-sm text-sm leading-7 text-white/52">
                    Social links пока не добавлены. Заполни их в Creative Studio,
                    и они появятся здесь.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
