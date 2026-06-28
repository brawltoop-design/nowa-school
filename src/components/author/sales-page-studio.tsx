"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Bot,
  Boxes,
  CheckCircle2,
  Copy,
  Eye,
  FileWarning,
  ImagePlus,
  Laptop2,
  Layers3,
  LoaderCircle,
  MonitorSmartphone,
  Palette,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TabletSmartphone,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CourseSalesPageRenderer } from "@/components/sales-page/course-sales-page-renderer";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { ConfirmDialog } from "@/components/premium/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import {
  applySalesPageSuggestion,
  createSalesPageBlock,
  getSalesPageSuggestions,
  improveSalesPageBlockAction,
  initializeSalesPageTemplate,
  moveSalesPageBlock,
  publishSalesPage,
  resetSalesPageBlock,
  saveSalesPageMeta,
  submitSalesPageForModeration,
  toggleSalesPageBlockVisibility,
  unpublishSalesPage,
  insertSalesPageSectionKit,
  moveSalesPageSection,
  duplicateSalesPageSection,
  deleteSalesPageSection,
  replaceSalesPageBlockType,
  updateSalesPageBlock,
  deleteSalesPageBlock,
  duplicateSalesPageBlock,
  reorderSalesPageBlocks,
} from "@/server/sales-page/actions";
import type {
  CourseStudioData,
  SalesPageAnalyticsSummary,
} from "@/server/sales-page/queries";
import {
  coerceSalesPageBlockSettings,
  coerceSalesPageSectionSettings,
  getDefaultSalesPageTheme,
  getAutoSalesPageSectionSettings,
  getSalesPageBlockDisplayTitle,
  getSalesPageBlockLabel,
  hexToRgba,
  localizeSalesPageText,
  salesPageBlockStylePresets,
  salesPageBlockCatalog,
  salesPageIconCatalog,
  salesPageStatusMeta,
  salesPageThemePresets,
  salesPageTemplateOptions,
  type SalesPageBlockItem,
  type SalesPageBlockContent,
  type SalesPageBlockDraft,
  type SalesPageDeviceMode,
  type SalesPageDraft,
  type SalesPageFaqItem,
  type SalesPageBlockSettings,
} from "@/lib/sales-page";
import { createMockUploadUrl } from "@/lib/lesson-materials";
import { slugifyCourseTitle } from "@/lib/validators/course";
import type { SalesPageSuggestion } from "@/lib/ai-sales-page";

type SalesPageStudioProps = {
  course: CourseStudioData["course"];
  salesPage: SalesPageDraft | null;
  analytics: SalesPageAnalyticsSummary;
  moderation: CourseStudioData["moderation"];
  embedded?: boolean;
  deviceModeOverride?: SalesPageDeviceMode;
  onDirtyChange?: (isDirty: boolean) => void;
};

const salesPageBlockGroups: Array<{
  title: string;
  key: "acquisition" | "trust" | "program";
  description: string;
  items: SalesPageBlockDraft["type"][];
}> = [
  {
    title: "Привлечение",
    key: "acquisition",
    description: "Первый экран, offer, price и конверсия.",
    items: ["HERO", "OUTCOMES", "PRICING", "CTA", "COMPARISON"],
  },
  {
    title: "Доверие",
    key: "trust",
    description: "Доверие, социальные доказательства и верификация.",
    items: ["AUTHOR", "TESTIMONIALS", "FAQ", "CERTIFICATE", "COMMUNITY"],
  },
  {
    title: "Программа",
    key: "program",
    description: "Программа, experience и внутренности продукта.",
    items: [
      "CURRICULUM",
      "WHO_IS_THIS_FOR",
      "WHAT_YOU_WILL_BUILD",
      "PROCESS",
      "FEATURES",
      "FILES_INCLUDED",
      "BONUSES",
      "ICON_GRID",
      "IMAGE_TEXT",
      "CUSTOM_TEXT",
    ],
  },
];

const salesPageMarketplaceKits = [
  {
    key: "launch",
    title: "Стартовый набор",
    description: "Первый экран, результат, цена и финальный призыв к действию для быстрой продающей страницы.",
    items: ["HERO", "OUTCOMES", "PRICING", "CTA"] as SalesPageBlockDraft["type"][],
    sectionStyle: "gradient" as const,
  },
  {
    key: "trust-pack",
    title: "Набор доверия",
    description: "Автор, отзывы, FAQ и сертификат для усиления доверия.",
    items: ["AUTHOR", "TESTIMONIALS", "FAQ", "CERTIFICATE"] as SalesPageBlockDraft["type"][],
    sectionStyle: "glass" as const,
  },
  {
    key: "program-pack",
    title: "Набор программы",
    description: "Программа, процесс, бонусы и материалы для раскрытия продукта.",
    items: ["CURRICULUM", "PROCESS", "BONUSES", "FILES_INCLUDED"] as SalesPageBlockDraft["type"][],
    sectionStyle: "soft" as const,
  },
  {
    key: "proof-loop",
    title: "Закрытие возражений",
    description: "Сравнение, отзывы, FAQ и призыв к действию для финального дожима к покупке.",
    items: ["COMPARISON", "TESTIMONIALS", "FAQ", "CTA"] as SalesPageBlockDraft["type"][],
    sectionStyle: "outline" as const,
  },
  {
    key: "visual-story",
    title: "Визуальная история",
    description: "Изображение с текстом, результат и сетка иконок для красивой продуктовой подачи.",
    items: ["IMAGE_TEXT", "WHAT_YOU_WILL_BUILD", "ICON_GRID"] as SalesPageBlockDraft["type"][],
    sectionStyle: "accent" as const,
  },
  {
    key: "community-proof",
    title: "Сообщество и доверие",
    description: "Автор, сообщество и бонусы для страниц авторов и когортных продуктов.",
    items: ["AUTHOR", "COMMUNITY", "BONUSES"] as SalesPageBlockDraft["type"][],
    sectionStyle: "midnight" as const,
  },
] as const;

type MarketplaceView = "all" | "acquisition" | "trust" | "program" | "kits";
type MarketplaceKitKey = (typeof salesPageMarketplaceKits)[number]["key"];
type BuilderSidebarTab = "blocks" | "layers" | "page-settings" | "theme" | "ai";
type InspectorTab = "content" | "design" | "media" | "icons" | "ai";
type BlockGalleryCategoryKey =
  | "hero"
  | "trust"
  | "results"
  | "video"
  | "curriculum"
  | "pricing"
  | "faq"
  | "cta";
type BlockPreviewTone =
  | "hero"
  | "heroSplit"
  | "trust"
  | "testimonials"
  | "numbers"
  | "media"
  | "curriculum"
  | "pricing"
  | "faq"
  | "cta";

type VisualBlockCard = {
  key: string;
  title: string;
  subtitle: string;
  type: SalesPageBlockDraft["type"];
  tone: BlockPreviewTone;
  badge?: string;
};

const builderSidebarTabs: Array<{ key: BuilderSidebarTab; label: string; icon: typeof Boxes }> = [
  { key: "blocks", label: "Blocks", icon: Boxes },
  { key: "layers", label: "Layers", icon: Layers3 },
  { key: "page-settings", label: "Page Settings", icon: Copy },
  { key: "theme", label: "Theme", icon: Palette },
  { key: "ai", label: "AI", icon: Bot },
];

const inspectorTabs: Array<{ key: InspectorTab; label: string }> = [
  { key: "content", label: "Content" },
  { key: "design", label: "Design" },
  { key: "media", label: "Media" },
  { key: "icons", label: "Icons" },
  { key: "ai", label: "AI" },
];

const visualBlockLibrary: Array<{
  key: BlockGalleryCategoryKey;
  title: string;
  description: string;
  cards: VisualBlockCard[];
}> = [
  {
    key: "hero",
    title: "Hero",
    description: "Первый экран, оффер и сильное первое впечатление.",
    cards: [
      { key: "hero-minimal", title: "Minimal hero", subtitle: "Чистый акцент на результате", type: "HERO", tone: "hero", badge: "Lead" },
      { key: "hero-split", title: "Split hero", subtitle: "Текст слева, media справа", type: "HERO", tone: "heroSplit", badge: "Media" },
      { key: "hero-author", title: "Author-led hero", subtitle: "Сильная авторская подача", type: "AUTHOR", tone: "hero", badge: "Trust" },
      { key: "hero-offer", title: "Offer hero", subtitle: "Оффер + price + CTA", type: "PRICING", tone: "pricing", badge: "Revenue" },
      { key: "hero-story", title: "Story hero", subtitle: "Редакционная подача в одном блоке", type: "IMAGE_TEXT", tone: "media", badge: "Story" },
    ],
  },
  {
    key: "trust",
    title: "Trust",
    description: "Отзывы, верификация, автор и социальные доказательства.",
    cards: [
      { key: "trust-author", title: "Author proof", subtitle: "Блок про автора и опыт", type: "AUTHOR", tone: "trust", badge: "Bio" },
      { key: "trust-testimonials", title: "Testimonials wall", subtitle: "Отзывы и реальные результаты", type: "TESTIMONIALS", tone: "testimonials", badge: "Social" },
      { key: "trust-community", title: "Community proof", subtitle: "Сообщество, поддержка, cohort", type: "COMMUNITY", tone: "trust", badge: "Community" },
      { key: "trust-certificate", title: "Certificate proof", subtitle: "Верификация навыка и сертификат", type: "CERTIFICATE", tone: "trust", badge: "Proof" },
      { key: "trust-compare", title: "Compare proof", subtitle: "Почему этот курс сильнее альтернатив", type: "COMPARISON", tone: "numbers", badge: "Compare" },
    ],
  },
  {
    key: "results",
    title: "Results",
    description: "Что получит студент, какой outcome соберёт и какие навыки закроет.",
    cards: [
      { key: "results-outcomes", title: "Outcomes grid", subtitle: "Карточки результатов и value", type: "OUTCOMES", tone: "numbers", badge: "Outcome" },
      { key: "results-build", title: "What you'll build", subtitle: "Проектный итог обучения", type: "WHAT_YOU_WILL_BUILD", tone: "curriculum", badge: "Project" },
      { key: "results-features", title: "Feature stack", subtitle: "Список сильных сторон продукта", type: "FEATURES", tone: "numbers", badge: "Features" },
      { key: "results-icons", title: "Icon result grid", subtitle: "Иконки, цифры и короткие тезисы", type: "ICON_GRID", tone: "numbers", badge: "Icons" },
      { key: "results-process", title: "Result journey", subtitle: "Путь от старта к финальному skill", type: "PROCESS", tone: "curriculum", badge: "Journey" },
    ],
  },
  {
    key: "video",
    title: "Video / Media",
    description: "Секции под media-storytelling, уроки и визуальные демонстрации.",
    cards: [
      { key: "video-cover", title: "Cover story", subtitle: "Большой media block с narrative текстом", type: "IMAGE_TEXT", tone: "media", badge: "Media" },
      { key: "video-editorial", title: "Editorial media", subtitle: "Контент и скриншоты под редакционный стиль", type: "CUSTOM_TEXT", tone: "media", badge: "Editorial" },
      { key: "video-curriculum", title: "Lesson preview", subtitle: "Покажи как выглядит обучение внутри", type: "CURRICULUM", tone: "curriculum", badge: "Preview" },
      { key: "video-gallery", title: "Visual proof", subtitle: "Скриншоты, кадры, кейсы", type: "WHAT_YOU_WILL_BUILD", tone: "media", badge: "Gallery" },
      { key: "video-walkthrough", title: "Walkthrough", subtitle: "Пошаговое объяснение через media", type: "PROCESS", tone: "media", badge: "Walkthrough" },
    ],
  },
  {
    key: "curriculum",
    title: "Curriculum",
    description: "Программа курса, модули, шаги и что входит внутрь продукта.",
    cards: [
      { key: "curriculum-modules", title: "Module list", subtitle: "Структура модулей и уроков", type: "CURRICULUM", tone: "curriculum", badge: "Modules" },
      { key: "curriculum-process", title: "Learning path", subtitle: "Путь обучения по шагам", type: "PROCESS", tone: "curriculum", badge: "Path" },
      { key: "curriculum-audience", title: "Who is this for", subtitle: "Кому подходит программа", type: "WHO_IS_THIS_FOR", tone: "trust", badge: "Audience" },
      { key: "curriculum-files", title: "Files included", subtitle: "Материалы, шаблоны и бонусы", type: "FILES_INCLUDED", tone: "numbers", badge: "Files" },
      { key: "curriculum-bonuses", title: "Bonus stack", subtitle: "Дополнительные материалы и плюшки", type: "BONUSES", tone: "numbers", badge: "Bonus" },
    ],
  },
  {
    key: "pricing",
    title: "Pricing",
    description: "Цена, оффер и закрытие возражений перед оплатой.",
    cards: [
      { key: "pricing-classic", title: "Classic pricing", subtitle: "Чистая цена и CTA", type: "PRICING", tone: "pricing", badge: "Price" },
      { key: "pricing-offer", title: "Offer stack", subtitle: "Старая цена, выгода, включено", type: "PRICING", tone: "pricing", badge: "Offer" },
      { key: "pricing-compare", title: "Compare before buy", subtitle: "Сравнение с обычным курсом", type: "COMPARISON", tone: "numbers", badge: "Compare" },
      { key: "pricing-close", title: "Closing CTA", subtitle: "Финальный push к оплате", type: "CTA", tone: "cta", badge: "CTA" },
      { key: "pricing-proof", title: "Price with proof", subtitle: "Цена рядом с доверием и proof", type: "TESTIMONIALS", tone: "testimonials", badge: "Proof" },
    ],
  },
  {
    key: "faq",
    title: "FAQ",
    description: "Ответы на возражения и важные вопросы перед покупкой.",
    cards: [
      { key: "faq-clean", title: "Clean FAQ", subtitle: "Классический список вопросов", type: "FAQ", tone: "faq", badge: "FAQ" },
      { key: "faq-compact", title: "Compact FAQ", subtitle: "Короткие ответы в компактном виде", type: "FAQ", tone: "faq", badge: "Compact" },
      { key: "faq-proof", title: "FAQ with proof", subtitle: "Возражения плюс доверие", type: "FAQ", tone: "trust", badge: "Proof" },
      { key: "faq-curriculum", title: "Program FAQ", subtitle: "FAQ про формат и наполнение курса", type: "FAQ", tone: "curriculum", badge: "Program" },
      { key: "faq-checkout", title: "Checkout FAQ", subtitle: "Оплата, доступ и возвраты", type: "FAQ", tone: "pricing", badge: "Checkout" },
    ],
  },
  {
    key: "cta",
    title: "CTA",
    description: "Финальные призывы к действию, захват внимания и переход к оплате.",
    cards: [
      { key: "cta-dark", title: "Dark CTA", subtitle: "Контрастный финальный блок", type: "CTA", tone: "cta", badge: "Dark" },
      { key: "cta-soft", title: "Soft CTA", subtitle: "Мягкий блок с акцентом на value", type: "CTA", tone: "pricing", badge: "Soft" },
      { key: "cta-proof", title: "CTA with proof", subtitle: "Призыв к действию рядом с social proof", type: "CTA", tone: "testimonials", badge: "Proof" },
      { key: "cta-journey", title: "Journey CTA", subtitle: "Призыв после программы и результата", type: "CTA", tone: "curriculum", badge: "Journey" },
      { key: "cta-minimal", title: "Minimal CTA", subtitle: "Минимальный блок-кнопка", type: "CTA", tone: "cta", badge: "Minimal" },
    ],
  },
];

function reorderIds(list: string[], movingId: string, targetIndex: number) {
  const next = [...list];
  const fromIndex = next.findIndex((item) => item === movingId);

  if (fromIndex === -1) {
    return next;
  }

  const [moving] = next.splice(fromIndex, 1);
  const safeIndex = Math.max(0, Math.min(targetIndex, next.length));
  next.splice(safeIndex, 0, moving);

  return next;
}

function toneFromStatus(status: SalesPageDraft["status"]) {
  return salesPageStatusMeta[status]?.tone ?? "subtle";
}

function textFieldNames(content: SalesPageBlockContent) {
  return [
    ["headline", "Заголовок"],
    ["subheadline", "Подзаголовок"],
    ["body", "Описание"],
    ["primaryCtaText", "Основная кнопка"],
    ["secondaryCtaText", "Вторая кнопка"],
    ["coverImage", "Обложка"],
    ["oldPrice", "Старая цена"],
  ].filter(([key]) => key in content) as Array<[string, string]>;
}

function parseMultiline(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinMultiline(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").join("\n")
    : "";
}

function FeedbackCard({
  message,
  tone = "default",
}: {
  message: string;
  tone?: "default" | "success" | "error";
}) {
  return (
    <PremiumCard
      padding="sm"
      className={
        tone === "success"
          ? "rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700"
          : tone === "error"
            ? "rounded-2xl border-red-200 bg-red-50 text-red-600"
            : "rounded-2xl border-black/8 bg-[#f6f7fb] text-black/64"
      }
    >
      <p className="text-sm">{message}</p>
    </PremiumCard>
  );
}

function AnalyticsMiniCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/6 bg-white px-4 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-black/32">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-black">{value}</p>
      <p className="mt-2 text-sm leading-6 text-black/48">{description}</p>
    </div>
  );
}

function StructuredItemsEditor({
  items,
  onChange,
}: {
  items: SalesPageBlockItem[];
  onChange: (items: SalesPageBlockItem[]) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`item-${index}`}
          className="rounded-[1.4rem] border border-black/8 bg-[#fafbff] p-4"
        >
          <input
            id={`item-image-upload-${index}`}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? { ...entry, image: createMockUploadUrl(file.name) }
                      : entry,
                  ),
                );
              }

              event.currentTarget.value = "";
            }}
          />
          <div className="grid gap-3">
            <input
              value={String(item.title ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? { ...entry, title: event.target.value }
                      : entry,
                  ),
                )
              }
              placeholder="Название"
              className="premium-control h-11 bg-white"
            />
            <textarea
              value={String(item.description ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? { ...entry, description: event.target.value }
                      : entry,
                  ),
                )
              }
              rows={3}
              placeholder="Описание"
              className="premium-textarea min-h-[104px] bg-white"
            />
            <input
              value={String(item.icon ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? { ...entry, icon: event.target.value }
                      : entry,
                  ),
                )
              }
              placeholder="Ключ иконки: sparkles, bot, shield..."
              className="premium-control h-11 bg-white"
            />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={String(item.image ?? "")}
                onChange={(event) =>
                  onChange(
                    items.map((entry, entryIndex) =>
                      entryIndex === index
                        ? { ...entry, image: event.target.value }
                        : entry,
                    ),
                  )
                }
                placeholder="URL изображения или /uploads/demo-image.png"
                className="premium-control h-11 bg-white"
              />
              <label
                htmlFor={`item-image-upload-${index}`}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-black/8 bg-white px-4 text-sm font-medium text-black transition duration-200 hover:border-black/12 hover:bg-[#f7f8ff]"
              >
                <ImagePlus className="mr-2 size-4" />
                Добавить изображение
              </label>
            </div>
            {item.image ? (
              <div className="overflow-hidden rounded-[1.2rem] border border-black/8 bg-white">
                {String(item.image).startsWith("/uploads/") ? (
                  <div className="flex h-36 items-center justify-center px-4 text-center text-sm text-black/46">
                    Демо-изображение
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={String(item.image)}
                    alt={String(item.title ?? `item-${index + 1}`)}
                    className="h-36 w-full object-cover"
                  />
                )}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {salesPageIconCatalog.map((icon) => {
                const active = String(item.icon ?? "") === icon.key;

                return (
                  <button
                    key={`${index}-${icon.key}`}
                    type="button"
                    onClick={() =>
                      onChange(
                        items.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, icon: icon.key }
                            : entry,
                        ),
                      )
                    }
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                      active
                        ? "border-[#3d3bff]/30 bg-[#eef0ff] text-[#3d3bff]"
                        : "border-black/8 bg-white text-black/56 hover:border-black/14 hover:text-black"
                    }`}
                  >
                    {icon.label}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-10 px-4"
                onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}
              >
                Удалить элемент
              </PremiumButton>
            </div>
          </div>
        </div>
      ))}
      <PremiumButton
        type="button"
        tone="secondary"
        className="h-10 px-4"
        onClick={() => onChange([...items, { title: "", description: "", icon: "sparkles" }])}
      >
        <Plus className="mr-2 size-4" />
        Добавить элемент
      </PremiumButton>
    </div>
  );
}

function FaqEditor({
  items,
  onChange,
}: {
  items: SalesPageFaqItem[];
  onChange: (items: SalesPageFaqItem[]) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`faq-${index}`}
          className="rounded-[1.4rem] border border-black/8 bg-[#fafbff] p-4"
        >
          <div className="grid gap-3">
            <input
              value={String(item.question ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? { ...entry, question: event.target.value }
                      : entry,
                  ),
                )
              }
              placeholder="Вопрос"
              className="premium-control h-11 bg-white"
            />
            <textarea
              value={String(item.answer ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? { ...entry, answer: event.target.value }
                      : entry,
                  ),
                )
              }
              rows={4}
              placeholder="Ответ"
              className="premium-textarea min-h-[120px] bg-white"
            />
            <div className="flex justify-end">
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-10 px-4"
                onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}
              >
                Удалить вопрос
              </PremiumButton>
            </div>
          </div>
        </div>
      ))}
      <PremiumButton
        type="button"
        tone="secondary"
        className="h-10 px-4"
        onClick={() => onChange([...items, { question: "", answer: "" }])}
      >
        <Plus className="mr-2 size-4" />
        Добавить вопрос
      </PremiumButton>
    </div>
  );
}

function LinksEditor({
  items,
  onChange,
}: {
  items: Array<{ label?: string; url?: string }>;
  onChange: (items: Array<{ label: string; url: string }>) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`link-${index}`}
          className="rounded-[1.4rem] border border-black/8 bg-[#fafbff] p-4"
        >
          <div className="grid gap-3">
            <input
              value={String(item.label ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          label: event.target.value,
                          url: String(entry.url ?? ""),
                        }
                      : {
                          label: String(entry.label ?? ""),
                          url: String(entry.url ?? ""),
                        },
                  ),
                )
              }
              placeholder="Подпись ссылки"
              className="premium-control h-11 bg-white"
            />
            <input
              value={String(item.url ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          label: String(entry.label ?? ""),
                          url: event.target.value,
                        }
                      : {
                          label: String(entry.label ?? ""),
                          url: String(entry.url ?? ""),
                        },
                  ),
                )
              }
              placeholder="https://..."
              className="premium-control h-11 bg-white"
            />
            <div className="flex justify-end">
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-10 px-4"
                onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index).map((entry) => ({ label: String(entry.label ?? ""), url: String(entry.url ?? "") })))}
              >
                Удалить ссылку
              </PremiumButton>
            </div>
          </div>
        </div>
      ))}
      <PremiumButton
        type="button"
        tone="secondary"
        className="h-10 px-4"
        onClick={() =>
          onChange([...items.map((entry) => ({ label: String(entry.label ?? ""), url: String(entry.url ?? "") })), { label: "", url: "" }])
        }
      >
        <Plus className="mr-2 size-4" />
        Добавить ссылку
      </PremiumButton>
    </div>
  );
}

function ComparisonEditor({
  items,
  onChange,
}: {
  items: Array<{
    label?: string;
    ordinaryCourse?: string;
    nowaSchoolCourse?: string;
  }>;
  onChange: (
    items: Array<{
      label: string;
      ordinaryCourse: string;
      nowaSchoolCourse: string;
    }>,
  ) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`comparison-${index}`}
          className="rounded-[1.4rem] border border-black/8 bg-[#fafbff] p-4"
        >
          <div className="grid gap-3">
            <input
              value={String(item.label ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          label: event.target.value,
                          ordinaryCourse: String(entry.ordinaryCourse ?? ""),
                          nowaSchoolCourse: String(entry.nowaSchoolCourse ?? ""),
                        }
                      : {
                          label: String(entry.label ?? ""),
                          ordinaryCourse: String(entry.ordinaryCourse ?? ""),
                          nowaSchoolCourse: String(entry.nowaSchoolCourse ?? ""),
                        },
                  ),
                )
              }
              placeholder="Критерий"
              className="premium-control h-11 bg-white"
            />
            <textarea
              value={String(item.ordinaryCourse ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          label: String(entry.label ?? ""),
                          ordinaryCourse: event.target.value,
                          nowaSchoolCourse: String(entry.nowaSchoolCourse ?? ""),
                        }
                      : {
                          label: String(entry.label ?? ""),
                          ordinaryCourse: String(entry.ordinaryCourse ?? ""),
                          nowaSchoolCourse: String(entry.nowaSchoolCourse ?? ""),
                        },
                  ),
                )
              }
              rows={3}
              placeholder="Обычный курс"
              className="premium-textarea min-h-[92px] bg-white"
            />
            <textarea
              value={String(item.nowaSchoolCourse ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          label: String(entry.label ?? ""),
                          ordinaryCourse: String(entry.ordinaryCourse ?? ""),
                          nowaSchoolCourse: event.target.value,
                        }
                      : {
                          label: String(entry.label ?? ""),
                          ordinaryCourse: String(entry.ordinaryCourse ?? ""),
                          nowaSchoolCourse: String(entry.nowaSchoolCourse ?? ""),
                        },
                  ),
                )
              }
              rows={3}
              placeholder="nowa school"
              className="premium-textarea min-h-[92px] bg-white"
            />
            <div className="flex justify-end">
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-10 px-4"
                onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index).map((entry) => ({ label: String(entry.label ?? ""), ordinaryCourse: String(entry.ordinaryCourse ?? ""), nowaSchoolCourse: String(entry.nowaSchoolCourse ?? "") })))}
              >
                Удалить строку
              </PremiumButton>
            </div>
          </div>
        </div>
      ))}
      <PremiumButton
        type="button"
        tone="secondary"
        className="h-10 px-4"
        onClick={() =>
          onChange([
            ...items.map((entry) => ({
              label: String(entry.label ?? ""),
              ordinaryCourse: String(entry.ordinaryCourse ?? ""),
              nowaSchoolCourse: String(entry.nowaSchoolCourse ?? ""),
            })),
            { label: "", ordinaryCourse: "", nowaSchoolCourse: "" },
          ])
        }
      >
        <Plus className="mr-2 size-4" />
        Добавить строку
      </PremiumButton>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-black">{label}</label>
      <div className="flex items-center gap-3 rounded-[1.2rem] border border-black/8 bg-white px-3 py-3">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#3d3bff"}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 rounded-lg border border-black/8 bg-transparent"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="premium-control h-10 border-0 bg-transparent px-0 shadow-none"
        />
      </div>
    </div>
  );
}

function getResolvedSectionMeta(
  block: SalesPageBlockDraft,
  pageTheme: ReturnType<typeof getDefaultSalesPageTheme>,
) {
  return (
    coerceSalesPageSectionSettings(block.settings, pageTheme) ??
    getAutoSalesPageSectionSettings(block.type, pageTheme)
  );
}

function getSectionRangeFromBlocks(
  blocks: SalesPageBlockDraft[],
  index: number,
  pageTheme: ReturnType<typeof getDefaultSalesPageTheme>,
) {
  const section = getResolvedSectionMeta(blocks[index], pageTheme);

  if (!section) {
    return {
      start: index,
      end: index,
      section: null,
    };
  }

  let start = index;
  let end = index;

  while (start > 0) {
    const previous = getResolvedSectionMeta(blocks[start - 1], pageTheme);

    if (previous?.id !== section.id) {
      break;
    }

    start -= 1;
  }

  while (end < blocks.length - 1) {
    const next = getResolvedSectionMeta(blocks[end + 1], pageTheme);

    if (next?.id !== section.id) {
      break;
    }

    end += 1;
  }

  return {
    start,
    end,
    section,
  };
}

function UploadUrlField({
  label,
  value,
  onChange,
  placeholder = "https://... или /uploads/demo-image.png",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-3 rounded-[1.4rem] border border-black/8 bg-[#fafbff] p-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-black">{label}</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              onChange(createMockUploadUrl(file.name));
            }

            event.currentTarget.value = "";
          }}
        />
        <PremiumButton
          type="button"
          tone="secondary"
          className="h-10 px-4"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="mr-2 size-4" />
          Демо-загрузка
        </PremiumButton>
      </div>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="premium-control h-11 bg-white"
      />

      <div className="overflow-hidden rounded-[1.35rem] border border-black/8 bg-white">
        {value ? (
          value.startsWith("/uploads/") ? (
            <div className="flex h-36 items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(61,59,255,0.12),transparent_32%),linear-gradient(135deg,#f8faff_0%,#eef1ff_100%)] px-6 text-center text-sm text-black/54">
              Демо-изображение
              <br />
              {value}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={label}
              className="h-36 w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-36 items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(61,59,255,0.12),transparent_32%),linear-gradient(135deg,#f8faff_0%,#eef1ff_100%)] text-sm text-black/42">
            Добавь URL изображения или выбери mock upload
          </div>
        )}
      </div>
    </div>
  );
}

function ImageListEditor({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-black">{label}</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              onChange([...values, createMockUploadUrl(file.name)]);
            }

            event.currentTarget.value = "";
          }}
        />
        <div className="flex gap-2">
          <PremiumButton
            type="button"
            tone="secondary"
            className="h-10 px-4"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="mr-2 size-4" />
            Загрузить изображение
          </PremiumButton>
          <PremiumButton
            type="button"
            tone="secondary"
            className="h-10 px-4"
            onClick={() => onChange([...values, ""])}
          >
            <Plus className="mr-2 size-4" />
            Добавить URL
          </PremiumButton>
        </div>
      </div>

      {values.length ? (
        <div className="grid gap-3">
          {values.map((value, index) => (
            <div
              key={`${label}-${index}`}
              className="rounded-[1.4rem] border border-black/8 bg-[#fafbff] p-4"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                <div className="space-y-3">
                  <input
                    value={value}
                    onChange={(event) =>
                      onChange(
                        values.map((entry, entryIndex) =>
                          entryIndex === index ? event.target.value : entry,
                        ),
                      )
                    }
                    placeholder="https://... или /uploads/demo-image.png"
                    className="premium-control h-11 bg-white"
                  />
                  <div className="flex justify-end">
                    <PremiumButton
                      type="button"
                      tone="secondary"
                      className="h-10 px-4"
                      onClick={() =>
                        onChange(values.filter((_, entryIndex) => entryIndex !== index))
                      }
                    >
                      Удалить изображение
                    </PremiumButton>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.1rem] border border-black/8 bg-white">
                  {value ? (
                    value.startsWith("/uploads/") ? (
                      <div className="flex h-32 items-center justify-center px-4 text-center text-xs uppercase tracking-[0.18em] text-black/38">
                        Демо-изображение
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={value}
                        alt={`media-${index + 1}`}
                        className="h-32 w-full object-cover"
                      />
                    )
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs uppercase tracking-[0.2em] text-black/32">
                      Пусто
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <FeedbackCard message="Пока без изображений. Добавь URL или загрузи mock-изображение." />
      )}
    </div>
  );
}

function normalizeLegacySalesPageDraft(
  draft: SalesPageDraft | null,
): SalesPageDraft | null {
  if (!draft) {
    return null;
  }

  return {
    ...draft,
    blocks: draft.blocks.map((block) => ({
      ...block,
      title: getSalesPageBlockDisplayTitle(block),
      subtitle: localizeSalesPageText(block.subtitle),
      settings:
        block.settings && typeof block.settings === "object"
          ? {
              ...block.settings,
              sectionLabel: localizeSalesPageText(
                typeof block.settings.sectionLabel === "string"
                  ? block.settings.sectionLabel
                  : "",
              ),
            }
          : block.settings,
      content: {
        ...block.content,
        headline: localizeSalesPageText(
          typeof block.content.headline === "string"
            ? block.content.headline
            : "",
        ),
        subheadline: localizeSalesPageText(
          typeof block.content.subheadline === "string"
            ? block.content.subheadline
            : "",
        ),
        body: localizeSalesPageText(
          typeof block.content.body === "string" ? block.content.body : "",
        ),
        primaryCtaText: localizeSalesPageText(
          typeof block.content.primaryCtaText === "string"
            ? block.content.primaryCtaText
            : "",
        ),
        secondaryCtaText: localizeSalesPageText(
          typeof block.content.secondaryCtaText === "string"
            ? block.content.secondaryCtaText
            : "",
        ),
        oldPrice: localizeSalesPageText(
          typeof block.content.oldPrice === "string"
            ? block.content.oldPrice
            : "",
        ),
        badges: Array.isArray(block.content.badges)
          ? block.content.badges.map((badge) =>
              typeof badge === "string" ? localizeSalesPageText(badge) : badge,
            )
          : block.content.badges,
        deliverables: Array.isArray(block.content.deliverables)
          ? block.content.deliverables.map((item) =>
              typeof item === "string" ? localizeSalesPageText(item) : item,
            )
          : block.content.deliverables,
        included: Array.isArray(block.content.included)
          ? block.content.included.map((item) =>
              typeof item === "string" ? localizeSalesPageText(item) : item,
            )
          : block.content.included,
        items: Array.isArray(block.content.items)
          ? block.content.items.map((item) => ({
              ...item,
              title: localizeSalesPageText(item.title),
              description: localizeSalesPageText(item.description),
            }))
          : block.content.items,
        faqs: Array.isArray(block.content.faqs)
          ? block.content.faqs.map((item) => ({
              ...item,
              question: localizeSalesPageText(item.question),
              answer: localizeSalesPageText(item.answer),
            }))
          : block.content.faqs,
        links: Array.isArray(block.content.links)
          ? block.content.links.map((item) => ({
              ...item,
              label: localizeSalesPageText(item.label),
            }))
          : block.content.links,
        comparisonItems: Array.isArray(block.content.comparisonItems)
          ? block.content.comparisonItems.map((item) => ({
              ...item,
              label: localizeSalesPageText(item.label),
              ordinaryCourse: localizeSalesPageText(item.ordinaryCourse),
              nowaSchoolCourse: localizeSalesPageText(item.nowaSchoolCourse),
            }))
          : block.content.comparisonItems,
      },
    })),
  };
}

function BlockLibraryPreview({ tone }: { tone: BlockPreviewTone }) {
  if (tone === "hero") {
    return (
      <div className="h-32 rounded-[1.4rem] border border-black/8 bg-[radial-gradient(circle_at_top_right,rgba(61,59,255,0.22),transparent_34%),linear-gradient(135deg,#fbfbff_0%,#eef1ff_100%)] p-4">
        <div className="w-16 rounded-full bg-[#3d3bff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3d3bff]">
          Hero
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-4/5 rounded-full bg-black/82" />
          <div className="h-3 w-3/5 rounded-full bg-black/18" />
        </div>
        <div className="mt-5 flex gap-2">
          <div className="h-9 w-28 rounded-full bg-[#3d3bff]" />
          <div className="h-9 w-20 rounded-full border border-black/10 bg-white" />
        </div>
      </div>
    );
  }

  if (tone === "heroSplit") {
    return (
      <div className="grid h-32 grid-cols-[1.1fr_0.9fr] gap-3 rounded-[1.4rem] border border-black/8 bg-white p-3">
        <div className="rounded-[1.2rem] bg-[#f7f8fc] p-3">
          <div className="h-2.5 w-12 rounded-full bg-[#3d3bff]/18" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded-full bg-black/80" />
            <div className="h-3 w-4/5 rounded-full bg-black/16" />
          </div>
          <div className="mt-4 h-8 w-24 rounded-full bg-black" />
        </div>
        <div className="rounded-[1.2rem] bg-[linear-gradient(135deg,#0f172a_0%,#3d3bff_100%)]" />
      </div>
    );
  }

  if (tone === "trust") {
    return (
      <div className="h-32 rounded-[1.4rem] border border-black/8 bg-white p-3">
        <div className="space-y-2">
          <div className="h-10 rounded-[1rem] bg-[#f7f8fc]" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-16 rounded-[1rem] bg-[#eef0ff]" />
            <div className="h-16 rounded-[1rem] bg-[#f7f8fc]" />
          </div>
        </div>
      </div>
    );
  }

  if (tone === "testimonials") {
    return (
      <div className="grid h-32 grid-cols-2 gap-2 rounded-[1.4rem] border border-black/8 bg-white p-3">
        {[0, 1].map((item) => (
          <div key={item} className="rounded-[1rem] bg-[#f7f8fc] p-3">
            <div className="h-2.5 w-10 rounded-full bg-[#3d3bff]/18" />
            <div className="mt-3 space-y-2">
              <div className="h-2.5 rounded-full bg-black/18" />
              <div className="h-2.5 w-4/5 rounded-full bg-black/12" />
              <div className="h-2.5 w-3/5 rounded-full bg-black/12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tone === "numbers") {
    return (
      <div className="grid h-32 grid-cols-3 gap-2 rounded-[1.4rem] border border-black/8 bg-white p-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-[1rem] bg-[#f7f8fc] p-3">
            <div className="h-7 w-7 rounded-2xl bg-[#3d3bff]/12" />
            <div className="mt-3 h-3 w-3/4 rounded-full bg-black/76" />
            <div className="mt-2 h-2.5 w-full rounded-full bg-black/12" />
          </div>
        ))}
      </div>
    );
  }

  if (tone === "media") {
    return (
      <div className="grid h-32 gap-2 rounded-[1.4rem] border border-black/8 bg-white p-3">
        <div className="h-16 rounded-[1rem] bg-[linear-gradient(135deg,#dbeafe_0%,#eef2ff_100%)]" />
        <div className="space-y-2 rounded-[1rem] bg-[#f7f8fc] p-3">
          <div className="h-2.5 w-3/4 rounded-full bg-black/78" />
          <div className="h-2.5 w-full rounded-full bg-black/14" />
        </div>
      </div>
    );
  }

  if (tone === "curriculum") {
    return (
      <div className="h-32 rounded-[1.4rem] border border-black/8 bg-white p-3">
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-[1rem] bg-[#f7f8fc] px-3 py-2.5">
              <div className="flex size-7 items-center justify-center rounded-full bg-[#3d3bff]/12 text-[10px] font-semibold text-[#3d3bff]">
                {item + 1}
              </div>
              <div className="h-2.5 flex-1 rounded-full bg-black/14" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tone === "pricing") {
    return (
      <div className="h-32 rounded-[1.4rem] border border-black/8 bg-[linear-gradient(135deg,#0f172a_0%,#111827_100%)] p-4 text-white">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-2.5 w-12 rounded-full bg-white/16" />
            <div className="h-3 w-20 rounded-full bg-white/72" />
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/74">
            Offer
          </div>
        </div>
        <div className="mt-5 h-5 w-24 rounded-full bg-white/90" />
        <div className="mt-4 h-8 w-full rounded-full bg-[#3d3bff]" />
      </div>
    );
  }

  if (tone === "faq") {
    return (
      <div className="h-32 rounded-[1.4rem] border border-black/8 bg-white p-3">
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-[1rem] bg-[#f7f8fc] px-3 py-3">
              <div className="h-2.5 w-3/4 rounded-full bg-black/16" />
              <div className="h-5 w-5 rounded-full bg-[#3d3bff]/12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-32 rounded-[1.4rem] border border-black/8 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-4 text-white">
      <div className="h-3 w-16 rounded-full bg-white/18" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-4/5 rounded-full bg-white/82" />
        <div className="h-3 w-2/3 rounded-full bg-white/16" />
      </div>
      <div className="mt-5 h-8 w-28 rounded-full bg-[#3d3bff]" />
    </div>
  );
}

export function SalesPageStudio({
  course,
  salesPage,
  analytics,
  moderation,
  embedded = false,
  deviceModeOverride,
  onDirtyChange,
}: SalesPageStudioProps) {
  const router = useRouter();
  const [localDeviceMode, setLocalDeviceMode] = useState<SalesPageDeviceMode>(
    deviceModeOverride ?? "desktop",
  );
  const normalizedIncomingPage = useMemo(
    () => normalizeLegacySalesPageDraft(salesPage),
    [salesPage],
  );
  const [page, setPage] = useState<SalesPageDraft | null>(normalizedIncomingPage);
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(normalizedIncomingPage),
  );
  const [sidebarTab, setSidebarTab] = useState<BuilderSidebarTab>("blocks");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [activeLibraryCategory, setActiveLibraryCategory] =
    useState<BlockGalleryCategoryKey>("hero");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    normalizedIncomingPage?.blocks[0]?.id ?? null,
  );
  const [selectedTemplate, setSelectedTemplate] = useState("practical-skill");
  const [newBlockType, setNewBlockType] = useState(
    salesPageBlockCatalog[0]?.type ?? "HERO",
  );
  const [feedback, setFeedback] = useState<{
    tone: "default" | "success" | "error";
    message: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SalesPageSuggestion[]>([]);
  const [deleteTargetBlock, setDeleteTargetBlock] =
    useState<SalesPageBlockDraft | null>(null);
  const [blockQuery, setBlockQuery] = useState("");
  const deferredBlockQuery = useDeferredValue(blockQuery);
  const [marketplaceView, setMarketplaceView] = useState<MarketplaceView>("all");
  const [activeKitKey, setActiveKitKey] = useState<MarketplaceKitKey>(
    salesPageMarketplaceKits[0]?.key ?? "launch",
  );
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [deleteTargetSection, setDeleteTargetSection] = useState<{
    blockId: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    setPage(normalizedIncomingPage);
    setSavedSnapshot(JSON.stringify(normalizedIncomingPage));
    setSelectedBlockId((current) => {
      if (
        current &&
        normalizedIncomingPage?.blocks.some((block) => block.id === current)
      ) {
        return current;
      }

      return normalizedIncomingPage?.blocks[0]?.id ?? null;
    });
  }, [normalizedIncomingPage]);

  const isDirty = useMemo(
    () => JSON.stringify(page) !== savedSnapshot,
    [page, savedSnapshot],
  );
  const deviceMode = deviceModeOverride ?? localDeviceMode;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateDeviceMode = (nextMode: SalesPageDeviceMode) => {
    if (deviceModeOverride) {
      return;
    }

    setLocalDeviceMode(nextMode);
  };

  const pageTheme = page?.theme ?? getDefaultSalesPageTheme();
  const activeKit =
    salesPageMarketplaceKits.find((kit) => kit.key === activeKitKey) ??
    salesPageMarketplaceKits[0]!;
  const selectedBlock =
    page?.blocks.find((block) => block.id === selectedBlockId) ?? null;
  const selectedBlockSettings = selectedBlock
    ? coerceSalesPageBlockSettings(
        selectedBlock.settings,
        pageTheme,
      )
    : null;

  const normalizedBlockQuery = deferredBlockQuery.trim().toLowerCase();
  const visibleLibraryCategories = useMemo(() => {
    return visualBlockLibrary
      .map((category) => ({
        ...category,
        cards: category.cards.filter((card) => {
          const haystack = `${card.title} ${card.subtitle} ${card.type} ${card.badge ?? ""}`.toLowerCase();
          return !normalizedBlockQuery || haystack.includes(normalizedBlockQuery);
        }),
      }))
      .filter((category) => category.cards.length > 0);
  }, [normalizedBlockQuery]);
  const activeLibrary =
    visibleLibraryCategories.find((category) => category.key === activeLibraryCategory) ??
    visibleLibraryCategories[0] ??
    null;
  const visibleMarketplaceGroups = useMemo(() => {
    return salesPageBlockGroups
      .map((group) => ({
        ...group,
        blocks: group.items
          .map((type) =>
            salesPageBlockCatalog.find((item) => item.type === type),
          )
          .filter(
            (
              block,
            ): block is (typeof salesPageBlockCatalog)[number] => Boolean(block),
          )
          .filter((block) => {
            const matchesView =
              marketplaceView === "all" ||
              marketplaceView === group.key;
            const haystack = `${block.title} ${block.description} ${block.type}`.toLowerCase();
            const matchesQuery =
              !normalizedBlockQuery || haystack.includes(normalizedBlockQuery);

            return matchesView && matchesQuery;
          }),
      }))
      .filter((group) => group.blocks.length > 0);
  }, [marketplaceView, normalizedBlockQuery]);

  const visibleMarketplaceKits = useMemo(() => {
    return salesPageMarketplaceKits.filter((kit) => {
      const matchesView = marketplaceView === "all" || marketplaceView === "kits";
      const haystack = `${kit.title} ${kit.description} ${kit.items.join(" ")}`.toLowerCase();
      const matchesQuery =
        !normalizedBlockQuery || haystack.includes(normalizedBlockQuery);

      return matchesView && matchesQuery;
    });
  }, [marketplaceView, normalizedBlockQuery]);

  useEffect(() => {
    if (!activeLibrary && visibleLibraryCategories[0]) {
      setActiveLibraryCategory(visibleLibraryCategories[0].key);
    }
  }, [activeLibrary, visibleLibraryCategories]);

  const setSuccess = (message: string) =>
    setFeedback({ tone: "success", message });
  const setError = (message: string) =>
    setFeedback({ tone: "error", message });

  const updateLocalBlock = (
    blockId: string,
    updater: (block: SalesPageBlockDraft) => SalesPageBlockDraft,
  ) => {
    setPage((current) =>
      current
        ? {
            ...current,
            blocks: current.blocks.map((block) =>
              block.id === blockId ? updater(block) : block,
            ),
          }
        : current,
    );
  };

  const handleInlineChange = (blockId: string, field: string, value: string) => {
    updateLocalBlock(blockId, (block) => ({
      ...block,
      content: {
        ...block.content,
        [field]: value,
      },
    }));
  };

  const updateLocalBlockSettings = (
    blockId: string,
    updater: (settings: SalesPageBlockSettings) => SalesPageBlockSettings,
  ) => {
    updateLocalBlock(blockId, (block) => {
      const nextSettings = updater(
        coerceSalesPageBlockSettings(
          block.settings,
          page?.theme ?? getDefaultSalesPageTheme(),
        ),
      );

      return {
        ...block,
        settings: nextSettings,
      };
    });
  };

  const handleSaveSelectedBlock = () => {
    if (!selectedBlock || !page) {
      return;
    }

    setPendingAction("save-block");
    setFeedback(null);

    startTransition(async () => {
      const result = await updateSalesPageBlock(selectedBlock.id, {
        title: selectedBlock.title,
        subtitle: selectedBlock.subtitle,
        content: selectedBlock.content,
        settings: selectedBlock.settings,
        isVisible: selectedBlock.isVisible,
      });

      if (!result.success) {
        setError(result.message);
        setPendingAction(null);
        return;
      }

      setSuccess(result.message);
      setPendingAction(null);
      setSavedSnapshot(JSON.stringify(page));
      router.refresh();
    });
  };

  const handleSaveMeta = () => {
    if (!page) {
      return;
    }

    setPendingAction("save-meta");
    setFeedback(null);

    startTransition(async () => {
      const result = await saveSalesPageMeta(course.id, {
        title: page.title,
        metaTitle: page.metaTitle ?? "",
        metaDescription: page.metaDescription ?? "",
        ogImage: page.ogImage ?? "",
        theme: page.theme,
      });

      if (!result.success) {
        setError(result.message);
        setPendingAction(null);
        return;
      }

      setSuccess(result.message);
      setPendingAction(null);
      setSavedSnapshot(JSON.stringify(page));
      router.refresh();
    });
  };

  const runMutation = async (
    actionKey: string,
    task: () => Promise<{ success: boolean; message: string }>,
  ) => {
    setPendingAction(actionKey);
    setFeedback(null);
    const result = await task();

    if (!result.success) {
      setError(result.message);
      setPendingAction(null);
      return;
    }

    setSuccess(result.message);
    setPendingAction(null);
    router.refresh();
  };

  const handleConfirmDeleteBlock = () => {
    if (!deleteTargetBlock) {
      return;
    }

    const blockToDelete = deleteTargetBlock;
    setDeleteTargetBlock(null);
    void runMutation("delete", async () => deleteSalesPageBlock(blockToDelete.id));
  };

  const handleCreateBlock = (
    type: SalesPageBlockDraft["type"],
    afterBlockId?: string | null,
    position: "before" | "after" = "after",
  ) =>
    runMutation(
      afterBlockId ? `add-block-inline-${position}-${type}` : `add-block-${position}-${type}`,
      async () => createSalesPageBlock(course.id, type, afterBlockId, position),
    );

  const handleCreateKit = (
    kit: (typeof salesPageMarketplaceKits)[number],
    options?: {
      anchorBlockId?: string | null;
      position?: "before" | "after";
    },
  ) =>
    runMutation(
      options?.anchorBlockId
        ? `add-kit-inline-${kit.key}-${options.position ?? "after"}`
        : `add-kit-${kit.key}`,
      async () =>
        insertSalesPageSectionKit(course.id, [...kit.items], {
          anchorBlockId: options?.anchorBlockId,
          position: options?.position ?? "after",
          sectionLabel: kit.title,
          sectionStyle: kit.sectionStyle,
        }),
    );

  const handleOpenDeleteSection = (blockId: string) => {
    if (!page) {
      return;
    }

    const blockIndex = page.blocks.findIndex((block) => block.id === blockId);

    if (blockIndex === -1) {
      return;
    }

    const sectionRange = getSectionRangeFromBlocks(page.blocks, blockIndex, pageTheme);
    const sectionLabel =
      sectionRange.section?.label ||
      page.blocks[sectionRange.start]?.title ||
      "Секция";

    setDeleteTargetSection({
      blockId,
      label: sectionLabel,
    });
  };

  const handleConfirmDeleteSection = () => {
    if (!deleteTargetSection) {
      return;
    }

    const target = deleteTargetSection;
    setDeleteTargetSection(null);
    void runMutation("delete-section", async () =>
      deleteSalesPageSection(target.blockId),
    );
  };

  const persistBlockOrder = (orderedIds: string[]) => {
    if (!page || pendingAction === "reorder") {
      setDraggingBlockId(null);
      setDropIndex(null);
      return;
    }

    const previousPage = page;
    const orderedBlocks = orderedIds
      .map((id) => previousPage.blocks.find((block) => block.id === id))
      .filter((block): block is SalesPageBlockDraft => Boolean(block))
      .map((block, index) => ({
        ...block,
        order: index + 1,
      }));

    setPage({
      ...previousPage,
      blocks: orderedBlocks,
    });
    setDraggingBlockId(null);
    setDropIndex(null);
    setPendingAction("reorder");
    setFeedback(null);

    startTransition(async () => {
      const result = await reorderSalesPageBlocks(course.id, orderedIds);

      if (!result.success) {
        setPage(previousPage);
        setError(result.message);
        setPendingAction(null);
        return;
      }

      const nextPage = {
        ...previousPage,
        blocks: orderedBlocks,
      };

      setSuccess(result.message);
      setSavedSnapshot(JSON.stringify(nextPage));
      setPendingAction(null);
      router.refresh();
    });
  };

  const handleDropAtIndex = (targetIndex: number) => {
    if (!page || !draggingBlockId) {
      setDraggingBlockId(null);
      setDropIndex(null);
      return;
    }

    const orderedIds = reorderIds(
      page.blocks.map((block) => block.id),
      draggingBlockId,
      targetIndex,
    );

    persistBlockOrder(orderedIds);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={Boolean(deleteTargetBlock)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetBlock(null);
          }
        }}
        title="Удалить блок?"
        description={
          deleteTargetBlock
            ? `Блок "${getSalesPageBlockDisplayTitle(deleteTargetBlock)}" исчезнет из продающей страницы и предпросмотра.`
            : "Блок будет удален из продающей страницы."
        }
        confirmLabel="Удалить блок"
        pending={pendingAction === "delete"}
        onConfirm={handleConfirmDeleteBlock}
      />
      <ConfirmDialog
        open={Boolean(deleteTargetSection)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetSection(null);
          }
        }}
        title="Удалить секцию?"
        description={
          deleteTargetSection
            ? `Секция "${deleteTargetSection.label}" будет удалена целиком вместе со всеми вложенными блоками.`
            : "Секция будет удалена целиком."
        }
        confirmLabel="Удалить секцию"
        pending={pendingAction === "delete-section"}
        onConfirm={handleConfirmDeleteSection}
      />

      {!embedded ? (
        <PremiumCard
          padding="lg"
          className="rounded-[2.6rem] bg-white/92 backdrop-blur-xl"
        >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="primary">Конструктор сайта курса</Badge>
              <Badge variant={page ? toneFromStatus(page.status) : "subtle"}>
                {page ? salesPageStatusMeta[page.status].label : "Страница еще не создана"}
              </Badge>
              <Badge variant="subtle">{isDirty ? "Не сохранено" : "Сохранено"}</Badge>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
                Конструктор продающей страницы
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-black/56">
                Собирай публичный мини-сайт курса блоками: оффер, программа,
                доказательства доверия, FAQ, цена, призыв к действию и живой
                предпросмотр на холсте в логике отдельного конструктора сайтов.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PremiumButton asChild tone="secondary" className="h-11 px-4">
              <Link href={`/author/courses/${course.id}/preview/sales-page`}>
                <Eye className="mr-2 size-4" />
                Предпросмотр
              </Link>
            </PremiumButton>

            <div className="inline-flex items-center rounded-full border border-black/8 bg-[#f5f6fb] p-1">
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  deviceMode === "desktop"
                    ? "bg-white text-black shadow-sm"
                    : "text-black/48"
                }`}
                onClick={() => updateDeviceMode("desktop")}
              >
                <Laptop2 className="size-4" />
                Десктоп
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  deviceMode === "tablet"
                    ? "bg-white text-black shadow-sm"
                    : "text-black/48"
                }`}
                onClick={() => updateDeviceMode("tablet")}
              >
                <TabletSmartphone className="size-4" />
                Планшет
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  deviceMode === "mobile"
                    ? "bg-white text-black shadow-sm"
                    : "text-black/48"
                }`}
                onClick={() => updateDeviceMode("mobile")}
              >
                <MonitorSmartphone className="size-4" />
                Мобильная
              </button>
            </div>

            <PremiumButton
              type="button"
              tone="secondary"
              className="h-11 px-4"
              disabled={pendingAction === "ai-page" || !page}
              onClick={() => {
                if (!page) {
                  return;
                }

                setPendingAction("ai-page");
                setFeedback(null);

                startTransition(async () => {
                  const result = await getSalesPageSuggestions(course.id);

                  if (!result.success) {
                    setError(result.message);
                    setPendingAction(null);
                    return;
                  }

                  setSuggestions(result.data?.suggestions ?? []);
                  setSuccess(result.message);
                  setPendingAction(null);
                });
              }}
            >
              {pendingAction === "ai-page" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <WandSparkles className="mr-2 size-4" />
              )}
              AI-улучшение страницы
            </PremiumButton>

            <PremiumButton
              type="button"
              className="h-11 px-4"
              disabled={pendingAction === "submit" || !page}
              onClick={() =>
                runMutation("submit", async () =>
                  submitSalesPageForModeration(course.id, { message: "" }),
                )
              }
            >
              {pendingAction === "submit" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Отправить на модерацию
            </PremiumButton>

            <PremiumButton
              type="button"
              tone="secondary"
              className="h-11 px-4"
              disabled={page?.status !== "APPROVED" || pendingAction === "publish"}
              onClick={() =>
                runMutation("publish", async () => publishSalesPage(course.id))
              }
            >
              {pendingAction === "publish" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              Опубликовать
            </PremiumButton>

            <PremiumButton
              type="button"
              tone="secondary"
              className="h-11 px-4"
              disabled={!page || pendingAction === "unpublish"}
              onClick={() =>
                runMutation("unpublish", async () => unpublishSalesPage(course.id))
              }
            >
              Снять с публикации
            </PremiumButton>
          </div>
        </div>
        </PremiumCard>
      ) : null}

      {feedback ? (
        <FeedbackCard message={feedback.message} tone={feedback.tone} />
      ) : null}

      {isLibraryOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/54 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/14 bg-[#f6f7fb] shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 bg-white/92 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-black/34">
                  Block Library
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                  Visual site sections
                </p>
                <p className="mt-2 text-sm leading-6 text-black/48">
                  Выбирай визуальный паттерн, а затем добавляй блок сразу в холст.
                </p>
              </div>
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-11 px-4"
                onClick={() => setIsLibraryOpen(false)}
              >
                Закрыть библиотеку
              </PremiumButton>
            </div>

            <div className="grid max-h-[calc(92vh-108px)] gap-0 overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="border-b border-black/8 bg-white px-5 py-5 lg:border-b-0 lg:border-r">
                <div className="rounded-[1.2rem] border border-black/8 bg-[#f7f8fc] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Search className="size-4 text-black/36" />
                    <input
                      value={blockQuery}
                      onChange={(event) => setBlockQuery(event.target.value)}
                      placeholder="Найти hero, pricing, faq..."
                      className="h-10 w-full bg-transparent text-sm text-black outline-none placeholder:text-black/34"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {visibleLibraryCategories.map((category) => {
                    const active = activeLibraryCategory === category.key;

                    return (
                      <button
                        key={category.key}
                        type="button"
                        onClick={() => setActiveLibraryCategory(category.key)}
                        className={`w-full rounded-[1.2rem] border px-4 py-3 text-left transition ${
                          active
                            ? "border-[#3d3bff]/28 bg-[#eef0ff]"
                            : "border-black/8 bg-white hover:border-black/14 hover:bg-[#fafbff]"
                        }`}
                      >
                        <p className="text-sm font-medium text-black">{category.title}</p>
                        <p className="mt-1 text-sm leading-6 text-black/46">
                          {category.cards.length} вариантов
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                {activeLibrary ? (
                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-black/34">
                          {activeLibrary.title}
                        </p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                          {activeLibrary.description}
                        </p>
                      </div>
                      <Badge variant="subtle">{activeLibrary.cards.length} вариантов</Badge>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {activeLibrary.cards.map((card) => (
                        <div
                          key={card.key}
                          className="rounded-[1.6rem] border border-black/8 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.04)]"
                        >
                          <BlockLibraryPreview tone={card.tone} />
                          <div className="mt-4 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-black">{card.title}</p>
                              <p className="mt-2 text-sm leading-6 text-black/48">
                                {card.subtitle}
                              </p>
                            </div>
                            {card.badge ? (
                              <Badge variant="subtle">{card.badge}</Badge>
                            ) : null}
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-black/34">
                                {getSalesPageBlockLabel(card.type)}
                              </p>
                              <p className="mt-1 text-xs text-black/42">
                                {selectedBlock
                                  ? `После "${getSalesPageBlockDisplayTitle(selectedBlock)}"`
                                  : "В конец страницы"}
                              </p>
                            </div>
                            <PremiumButton
                              type="button"
                              className="h-10 px-4"
                              disabled={Boolean(pendingAction?.startsWith("add-block"))}
                              onClick={() => {
                                setNewBlockType(card.type);
                                void handleCreateBlock(card.type, selectedBlockId);
                                setIsLibraryOpen(false);
                              }}
                            >
                              <Plus className="mr-2 size-4" />
                              Add
                            </PremiumButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <FeedbackCard message="Ничего не найдено. Попробуй другой запрос." />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-black/32">
              Builder sidebar
            </p>
            <div className="mt-4 grid gap-2">
              {builderSidebarTabs.map((tab) => {
                const active = sidebarTab === tab.key;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSidebarTab(tab.key)}
                    className={`flex items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left text-sm transition ${
                      active
                        ? "border-[#3d3bff]/28 bg-[#eef0ff] text-[#3d3bff]"
                        : "border-black/8 bg-white text-black/58 hover:border-black/14 hover:text-black"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </PremiumCard>

          {sidebarTab === "blocks" ? (
            <>
          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-black/32">
              Шаблоны
            </p>
            <div className="mt-4 space-y-3">
              <select
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
                className="premium-select"
              >
                {salesPageTemplateOptions.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.title}
                  </option>
                ))}
              </select>
              <PremiumButton
                type="button"
                className="h-11 w-full"
                disabled={pendingAction === "template"}
                onClick={() =>
                  runMutation("template", async () =>
                    initializeSalesPageTemplate(
                      course.id,
                      selectedTemplate as typeof salesPageTemplateOptions[number]["key"],
                    ),
                  )
                }
              >
                {pendingAction === "template" ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                Применить шаблон
              </PremiumButton>
            </div>
            <p className="mt-4 text-sm leading-7 text-black/52">
              Если нужно, можно быстро перезаписать структуру страницы под
              практический, авторский или технический сценарий.
            </p>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                  Библиотека блоков
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                  {page?.blocks.length ?? 0} блоков
                </p>
              </div>
              <Badge variant="subtle">{course.metrics.lessonCount} уроков</Badge>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-[1.4rem] border border-black/8 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <Search className="size-4 text-black/36" />
                  <input
                    value={blockQuery}
                    onChange={(event) => setBlockQuery(event.target.value)}
                    placeholder="Найти блок, секцию или набор"
                    className="h-10 w-full bg-transparent text-sm text-black outline-none placeholder:text-black/34"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "Все" },
                  { key: "acquisition", label: "Привлечение" },
                  { key: "trust", label: "Доверие" },
                  { key: "program", label: "Программа" },
                  { key: "kits", label: "Секции" },
                ].map((item) => {
                  const active = marketplaceView === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMarketplaceView(item.key as MarketplaceView)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        active
                          ? "border-[#3d3bff]/30 bg-[#eef0ff] text-[#3d3bff]"
                          : "border-black/8 bg-white text-black/56 hover:border-black/14 hover:text-black"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[1.6rem] border border-black/8 bg-[#fbfcff] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-black">
                      Visual block library
                    </p>
                    <p className="mt-2 text-sm leading-6 text-black/48">
                      Секции с быстрыми thumbnails в логике site builder.
                    </p>
                  </div>
                  <PremiumButton
                    type="button"
                    tone="secondary"
                    className="h-10 px-4"
                    onClick={() => setIsLibraryOpen(true)}
                  >
                    <Eye className="mr-2 size-4" />
                    Открыть
                  </PremiumButton>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {visibleLibraryCategories.map((category) => {
                    const active = activeLibraryCategory === category.key;

                    return (
                      <button
                        key={category.key}
                        type="button"
                        onClick={() => setActiveLibraryCategory(category.key)}
                        className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] transition ${
                          active
                            ? "border-[#3d3bff]/30 bg-[#eef0ff] text-[#3d3bff]"
                            : "border-black/8 bg-white text-black/54 hover:border-black/14 hover:text-black"
                        }`}
                      >
                        {category.title}
                      </button>
                    );
                  })}
                </div>

                {activeLibrary ? (
                  <div className="mt-4 grid gap-3">
                    {activeLibrary.cards.slice(0, 3).map((card) => (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => setNewBlockType(card.type)}
                        className={`rounded-[1.4rem] border p-3 text-left transition ${
                          newBlockType === card.type
                            ? "border-[#3d3bff]/30 bg-[#eef0ff]"
                            : "border-black/8 bg-white hover:border-black/14 hover:bg-[#fafbff]"
                        }`}
                      >
                        <BlockLibraryPreview tone={card.tone} />
                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-black">{card.title}</p>
                            <p className="mt-2 text-sm leading-6 text-black/48">
                              {card.subtitle}
                            </p>
                          </div>
                          {card.badge ? (
                            <Badge variant="subtle">{card.badge}</Badge>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 rounded-[1.6rem] border border-black/6 bg-[#f7f8fc] p-4">
              <p className="text-sm font-medium text-black">
                Быстрая вставка:{" "}
                {salesPageBlockCatalog.find((block) => block.type === newBlockType)
                  ?.title ?? newBlockType}
              </p>
              <p className="mt-2 text-sm leading-6 text-black/48">
                {selectedBlock
                  ? `Новый блок встанет сразу после "${selectedBlock.title ?? selectedBlock.type}".`
                  : "Если блок не выбран, новый блок добавится в конец страницы."}
              </p>
              <PremiumButton
                type="button"
                tone="secondary"
                className="mt-4 h-11 w-full"
                disabled={Boolean(pendingAction?.startsWith("add-block"))}
                onClick={() =>
                  handleCreateBlock(newBlockType, selectedBlockId)
                }
              >
                {pendingAction?.startsWith("add-block") ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                {selectedBlock ? "Вставить после выбранного блока" : "Добавить блок на страницу"}
              </PremiumButton>
            </div>

            <div className="mt-5 space-y-4">
              {visibleMarketplaceKits.length ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-black">
                      Готовые наборы секций
                    </p>
                    <p className="mt-1 text-sm leading-6 text-black/46">
                      Быстрые наборы блоков для лендинга, блока доверия и раскрытия программы.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {visibleMarketplaceKits.map((kit) => (
                      <div
                        key={kit.key}
                        className={`rounded-[1.35rem] border p-4 transition ${
                          activeKitKey === kit.key
                            ? "border-[#3d3bff]/28 bg-[#eef0ff]"
                            : "border-black/6 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-black">{kit.title}</p>
                            <p className="mt-2 text-sm leading-6 text-black/48">
                              {kit.description}
                            </p>
                          </div>
                          <div className="flex size-10 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                            <Boxes className="size-4" />
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {kit.items.map((type) => (
                            <Badge key={`${kit.key}-${type}`} variant="subtle">
                              {salesPageBlockCatalog.find((item) => item.type === type)?.title ??
                                type}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <PremiumButton
                            type="button"
                            tone={activeKitKey === kit.key ? "primary" : "secondary"}
                            className="h-11 w-full"
                            onClick={() => setActiveKitKey(kit.key)}
                          >
                            {activeKitKey === kit.key ? "Активный набор" : "Использовать на холсте"}
                          </PremiumButton>
                          <PremiumButton
                            type="button"
                            tone="secondary"
                            className="h-11 w-full"
                            disabled={Boolean(pendingAction?.startsWith("add-kit"))}
                            onClick={() =>
                              handleCreateKit(kit, {
                                anchorBlockId: selectedBlockId,
                                position: "after",
                              })
                            }
                          >
                            <Plus className="mr-2 size-4" />
                            {selectedBlock
                              ? "Вставить после выбранного блока"
                              : "Добавить набор секций"}
                          </PremiumButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {visibleMarketplaceGroups.map((group) => (
                <div key={group.title} className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-black">{group.title}</p>
                    <p className="mt-1 text-sm leading-6 text-black/46">
                      {group.description}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {group.blocks.map((block) => {
                      const active = newBlockType === block.type;

                      return (
                        <button
                          key={block.type}
                          type="button"
                          onClick={() => setNewBlockType(block.type)}
                          className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${
                            active
                              ? "border-[#3d3bff]/30 bg-[#eef0ff]"
                              : "border-black/6 bg-white hover:border-black/12 hover:bg-[#fafbff]"
                          }`}
                        >
                          <p className="text-sm font-medium text-black">
                            {block.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-black/48">
                            {block.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!visibleMarketplaceGroups.length && !visibleMarketplaceKits.length ? (
                <FeedbackCard message="Ничего не найдено. Попробуй другой запрос или переключи фильтр." />
              ) : null}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-black">Структура страницы</p>
                <Badge variant="subtle">перетаскивание</Badge>
              </div>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropIndex(0);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDropAtIndex(0);
                }}
                className={`h-3 rounded-full transition ${
                  dropIndex === 0 ? "bg-[#3d3bff]/18 ring-2 ring-[#3d3bff]/22" : "bg-transparent"
                }`}
              />

              {page?.blocks.map((block, index) => (
                <div key={block.id} className="space-y-2">
                  {(() => {
                    const section = getResolvedSectionMeta(block, pageTheme);
                    const sectionRange = getSectionRangeFromBlocks(
                      page.blocks,
                      index,
                      pageTheme,
                    );
                    const startsSection = section && sectionRange.start === index;
                    const sectionAnchorId =
                      page.blocks[sectionRange.end]?.id ?? block.id;

                    return (
                  <div
                    draggable
                    onDragStart={() => {
                      setDraggingBlockId(block.id);
                      setDropIndex(index);
                    }}
                    onDragEnd={() => {
                      setDraggingBlockId(null);
                      setDropIndex(null);
                    }}
                    className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition ${
                      selectedBlockId === block.id
                        ? "border-[#3d3bff]/28 bg-[#eef0ff]"
                        : "border-black/6 bg-[#fafbff] hover:border-black/12"
                    } ${
                      draggingBlockId === block.id ? "cursor-grabbing opacity-60" : "cursor-grab"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedBlockId(block.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-black">
                            {getSalesPageBlockDisplayTitle(block)}
                          </p>
                          <p className="mt-1 text-xs tracking-[0.12em] text-black/34">
                            Тип блока: {getSalesPageBlockLabel(block.type)}
                          </p>
                              {section ? (
                            <p className="mt-2 text-xs text-black/42">
                              {startsSection ? "Секция" : "Продолжение"}:{" "}
                              {localizeSalesPageText(section.label) || section.id}
                            </p>
                          ) : null}
                        </div>
                        {block.isVisible ? (
                          <Badge variant="subtle">Видим</Badge>
                        ) : (
                          <Badge variant="default">Скрыт</Badge>
                        )}
                      </div>
                    </button>
                    {startsSection ? (
                      <div className="mt-3 grid gap-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <PremiumButton
                            type="button"
                            tone="secondary"
                            className="h-10 w-full px-4"
                            disabled={Boolean(pendingAction?.startsWith("add-kit"))}
                            onClick={() =>
                              handleCreateKit(activeKit, {
                                anchorBlockId: block.id,
                                position: "before",
                              })
                            }
                          >
                            <Plus className="mr-2 size-4" />
                            Секция сверху
                          </PremiumButton>
                          <PremiumButton
                            type="button"
                            tone="secondary"
                            className="h-10 w-full px-4"
                            disabled={Boolean(pendingAction?.startsWith("add-kit"))}
                            onClick={() =>
                              handleCreateKit(activeKit, {
                                anchorBlockId: sectionAnchorId,
                                position: "after",
                              })
                            }
                          >
                            <Plus className="mr-2 size-4" />
                            Секция снизу
                          </PremiumButton>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <PremiumButton
                            type="button"
                            tone="secondary"
                            className="h-10 w-full px-4"
                            onClick={() =>
                              runMutation("move-section-up", async () =>
                                moveSalesPageSection(block.id, "up"),
                              )
                            }
                          >
                            <ArrowUp className="mr-2 size-4" />
                            Вверх
                          </PremiumButton>
                          <PremiumButton
                            type="button"
                            tone="secondary"
                            className="h-10 w-full px-4"
                            onClick={() =>
                              runMutation("move-section-down", async () =>
                                moveSalesPageSection(block.id, "down"),
                              )
                            }
                          >
                            <ArrowDown className="mr-2 size-4" />
                            Вниз
                          </PremiumButton>
                          <PremiumButton
                            type="button"
                            tone="secondary"
                            className="h-10 w-full px-4"
                            onClick={() =>
                              runMutation("duplicate-section", async () =>
                                duplicateSalesPageSection(block.id),
                              )
                            }
                          >
                            <Copy className="mr-2 size-4" />
                            Дублировать
                          </PremiumButton>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <PremiumButton
                            type="button"
                            tone="secondary"
                            className="h-10 w-full px-4"
                            disabled={Boolean(pendingAction?.startsWith("add-block-inline"))}
                            onClick={() => handleCreateBlock(newBlockType, sectionAnchorId)}
                          >
                            <Plus className="mr-2 size-4" />
                            Блок под секцией
                          </PremiumButton>
                          <PremiumButton
                            type="button"
                            tone="secondary"
                            className="h-10 w-full px-4"
                            onClick={() => handleOpenDeleteSection(block.id)}
                          >
                            Удалить секцию
                          </PremiumButton>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <PremiumButton
                          type="button"
                          tone="secondary"
                          className="h-10 w-full px-4"
                          disabled={Boolean(pendingAction?.startsWith("add-block-inline"))}
                          onClick={() =>
                            handleCreateBlock(newBlockType, block.id, "before")
                          }
                        >
                          <Plus className="mr-2 size-4" />
                          Вставить выше
                        </PremiumButton>
                        <PremiumButton
                          type="button"
                          tone="secondary"
                          className="h-10 w-full px-4"
                          disabled={Boolean(pendingAction?.startsWith("add-block-inline"))}
                          onClick={() => handleCreateBlock(newBlockType, block.id)}
                        >
                          <Plus className="mr-2 size-4" />
                          Вставить ниже
                        </PremiumButton>
                      </div>
                    )}
                  </div>
                    );
                  })()}

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropIndex(index + 1);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDropAtIndex(index + 1);
                    }}
                    className={`h-3 rounded-full transition ${
                      dropIndex === index + 1
                        ? "bg-[#3d3bff]/18 ring-2 ring-[#3d3bff]/22"
                        : "bg-transparent"
                    }`}
                  />
                </div>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] border-black/6 bg-black text-white"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                <FileWarning className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Юридическая подсказка</p>
                <p className="mt-3 text-sm leading-7 text-white/66">
                  Не обещайте гарантированный доход, трудоустройство или
                  результат без усилий. Пишите честно: чему научится человек,
                  какой проект соберет и какие материалы получит.
                </p>
              </div>
            </div>
          </PremiumCard>
            </>
          ) : null}

          {sidebarTab === "layers" ? (
            <PremiumCard
              padding="lg"
              className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                    Layers
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                    Структура страницы
                  </p>
                </div>
                <Badge variant="subtle">{page?.blocks.length ?? 0}</Badge>
              </div>

              <div className="mt-5 space-y-3">
                {page?.blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={`rounded-[1.35rem] border p-4 transition ${
                      selectedBlockId === block.id
                        ? "border-[#3d3bff]/28 bg-[#eef0ff]"
                        : "border-black/8 bg-[#fafbff]"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedBlockId(block.id)}
                    >
                      <p className="text-sm font-medium text-black">
                        {index + 1}. {getSalesPageBlockDisplayTitle(block)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-black/36">
                        {getSalesPageBlockLabel(block.type)}
                      </p>
                    </button>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <PremiumButton
                        type="button"
                        tone="secondary"
                        className="h-10 w-full px-4"
                        onClick={() =>
                          runMutation("move-up", async () =>
                            moveSalesPageBlock(block.id, "up"),
                          )
                        }
                      >
                        <ArrowUp className="mr-2 size-4" />
                        Вверх
                      </PremiumButton>
                      <PremiumButton
                        type="button"
                        tone="secondary"
                        className="h-10 w-full px-4"
                        onClick={() =>
                          runMutation("move-down", async () =>
                            moveSalesPageBlock(block.id, "down"),
                          )
                        }
                      >
                        <ArrowDown className="mr-2 size-4" />
                        Вниз
                      </PremiumButton>
                    </div>
                  </div>
                ))}
              </div>
            </PremiumCard>
          ) : null}

          {sidebarTab === "page-settings" ? (
            <PremiumCard
              padding="lg"
              className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                Page settings
              </p>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">Название страницы</label>
                  <input
                    value={page?.title ?? ""}
                    onChange={(event) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              title: event.target.value,
                            }
                          : current,
                      )
                    }
                    className="premium-control"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">SEO-заголовок</label>
                  <input
                    value={page?.metaTitle ?? ""}
                    onChange={(event) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              metaTitle: event.target.value,
                            }
                          : current,
                      )
                    }
                    className="premium-control"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">SEO-описание</label>
                  <textarea
                    value={page?.metaDescription ?? ""}
                    onChange={(event) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              metaDescription: event.target.value,
                            }
                          : current,
                      )
                    }
                    rows={4}
                    className="premium-textarea"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">OG-изображение</label>
                  <input
                    value={page?.ogImage ?? ""}
                    onChange={(event) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              ogImage: event.target.value,
                            }
                          : current,
                      )
                    }
                    className="premium-control"
                  />
                </div>
                <PremiumButton
                  type="button"
                  className="h-11 w-full"
                  disabled={pendingAction === "save-meta" || !page}
                  onClick={handleSaveMeta}
                >
                  {pendingAction === "save-meta" ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 size-4" />
                  )}
                  Сохранить настройки страницы
                </PremiumButton>
              </div>
            </PremiumCard>
          ) : null}

          {sidebarTab === "theme" ? (
            <PremiumCard
              padding="lg"
              className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                Theme
              </p>
              <div className="mt-5 space-y-4">
                <div className="grid gap-2">
                  {salesPageThemePresets.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() =>
                        setPage((current) =>
                          current
                            ? {
                                ...current,
                                theme: preset.theme,
                              }
                            : current,
                        )
                      }
                      className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                        page?.theme.accent === preset.theme.accent
                          ? "border-[#3d3bff]/30 bg-[#eef0ff]"
                          : "border-black/8 bg-white hover:border-black/14 hover:bg-[#fbfbff]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-4 rounded-full border border-black/8"
                          style={{ backgroundColor: preset.theme.accent }}
                        />
                        <span className="text-sm font-medium text-black">
                          {preset.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <ColorField
                  label="Акцент"
                  value={page?.theme.accent ?? "#3d3bff"}
                  onChange={(value) =>
                    setPage((current) =>
                      current
                        ? {
                            ...current,
                            theme: {
                              ...current.theme,
                              accent: value,
                              accentSoft: hexToRgba(value, 0.12),
                            },
                          }
                        : current,
                    )
                  }
                />
                <ColorField
                  label="Фон"
                  value={page?.theme.background ?? "#f6f7fb"}
                  onChange={(value) =>
                    setPage((current) =>
                      current
                        ? {
                            ...current,
                            theme: {
                              ...current.theme,
                              background: value,
                            },
                          }
                        : current,
                    )
                  }
                />
                <ColorField
                  label="Поверхность"
                  value={page?.theme.surface ?? "#ffffff"}
                  onChange={(value) =>
                    setPage((current) =>
                      current
                        ? {
                            ...current,
                            theme: {
                              ...current.theme,
                              surface: value,
                            },
                          }
                        : current,
                    )
                  }
                />
                <ColorField
                  label="Текст"
                  value={page?.theme.text ?? "#05070b"}
                  onChange={(value) =>
                    setPage((current) =>
                      current
                        ? {
                            ...current,
                            theme: {
                              ...current.theme,
                              text: value,
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
            </PremiumCard>
          ) : null}

          {sidebarTab === "ai" ? (
            <div className="space-y-5">
              <PremiumCard
                padding="lg"
                className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                      AI optimizer
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                      Подсказки по странице
                    </p>
                  </div>
                  <Badge variant="subtle">{suggestions.length}</Badge>
                </div>
                <PremiumButton
                  type="button"
                  className="mt-5 h-11 w-full"
                  disabled={pendingAction === "ai-page" || !page}
                  onClick={() => {
                    if (!page) {
                      return;
                    }

                    setPendingAction("ai-page");
                    setFeedback(null);

                    startTransition(async () => {
                      const result = await getSalesPageSuggestions(course.id);

                      if (!result.success) {
                        setError(result.message);
                        setPendingAction(null);
                        return;
                      }

                      setSuggestions(result.data?.suggestions ?? []);
                      setSuccess(result.message);
                      setPendingAction(null);
                    });
                  }}
                >
                  {pendingAction === "ai-page" ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : (
                    <WandSparkles className="mr-2 size-4" />
                  )}
                  Запустить AI-анализ
                </PremiumButton>

                <div className="mt-5 space-y-3">
                  {suggestions.length ? (
                    suggestions.slice(0, 3).map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="rounded-[1.4rem] border border-black/8 bg-[#fafbff] p-4"
                      >
                        <p className="text-sm font-medium text-black">
                          {suggestion.problem}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-black/48">
                          {suggestion.whyItMatters}
                        </p>
                      </div>
                    ))
                  ) : (
                    <FeedbackCard message="AI-подсказки появятся после запуска анализа страницы." />
                  )}
                </div>
              </PremiumCard>

              <PremiumCard
                padding="lg"
                className="rounded-[2.2rem] border-black/6 bg-black text-white"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                    <FileWarning className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Юридическая подсказка</p>
                    <p className="mt-3 text-sm leading-7 text-white/66">
                      Не обещайте гарантированный доход, трудоустройство или
                      результат без усилий. Пишите честно: чему научится человек,
                      какой проект соберет и какие материалы получит.
                    </p>
                  </div>
                </div>
              </PremiumCard>
            </div>
          ) : null}
        </div>

        <PremiumCard
          padding="lg"
          className="rounded-[2.4rem] bg-white/86 backdrop-blur-xl"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                Предпросмотр на холсте
              </p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                {deviceMode === "desktop"
                  ? "Десктопный холст"
                  : deviceMode === "tablet"
                    ? "Планшетный холст"
                    : "Мобильный холст"}
              </p>
              <p className="mt-2 text-sm leading-6 text-black/46">
                Активный набор секций: {activeKit?.title ?? "Стартовый набор"}.
                Ниже секции можно вставлять прямо на холст, как в визуальном конструкторе.
              </p>
            </div>
            <Badge variant="subtle">{isDirty ? "Живые правки" : "Синхронизировано"}</Badge>
          </div>

          <CourseSalesPageRenderer
            course={course}
            salesPage={page}
            deviceMode={deviceMode}
            mode="editor"
            selectedBlockId={selectedBlockId}
            primaryHref={`/checkout?course=${encodeURIComponent(course.slug)}`}
            secondaryHref={`/courses/${course.slug}#curriculum`}
            toolbarHandlers={{
              onSelect: setSelectedBlockId,
              onInlineChange: handleInlineChange,
              onMoveUp: (blockId) =>
                runMutation("move-up", async () =>
                  moveSalesPageBlock(blockId, "up"),
                ),
              onMoveDown: (blockId) =>
                runMutation("move-down", async () =>
                  moveSalesPageBlock(blockId, "down"),
                ),
              onDuplicate: (blockId) =>
                runMutation("duplicate", async () =>
                  duplicateSalesPageBlock(blockId),
                ),
              onAddBefore: (blockId) =>
                handleCreateBlock(newBlockType, blockId, "before"),
              onAddAfter: (blockId) => handleCreateBlock(newBlockType, blockId),
              onAddSectionAbove: (blockId) =>
                handleCreateKit(activeKit, {
                  anchorBlockId: blockId,
                  position: "before",
                }),
              onAddSectionBelow: (blockId) =>
                handleCreateKit(activeKit, {
                  anchorBlockId: blockId,
                  position: "after",
                }),
              onMoveSectionUp: (blockId) =>
                runMutation("move-section-up", async () =>
                  moveSalesPageSection(blockId, "up"),
                ),
              onMoveSectionDown: (blockId) =>
                runMutation("move-section-down", async () =>
                  moveSalesPageSection(blockId, "down"),
                ),
              onDuplicateSection: (blockId) =>
                runMutation("duplicate-section", async () =>
                  duplicateSalesPageSection(blockId),
                ),
              onDeleteSection: (blockId) => handleOpenDeleteSection(blockId),
              onToggleVisibility: (blockId) =>
                runMutation("toggle", async () =>
                  toggleSalesPageBlockVisibility(blockId),
                ),
              onDelete: (blockId) =>
                setDeleteTargetBlock(
                  page?.blocks.find((block) => block.id === blockId) ?? null,
                ),
              onAiImprove: (blockId) =>
                runMutation("ai-block", async () =>
                  improveSalesPageBlockAction(blockId),
                ),
            }}
          />
        </PremiumCard>

        <div className="space-y-5">
          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-black/32">
              Inspector
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {inspectorTabs.map((tab) => {
                const active = inspectorTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setInspectorTab(tab.key)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? "border-[#3d3bff]/30 bg-[#eef0ff] text-[#3d3bff]"
                        : "border-black/8 bg-white text-black/58 hover:border-black/14 hover:text-black"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-sm leading-6 text-black/48">
              {inspectorTab === "content"
                ? "Редактируй заголовки, текст, FAQ, links и структуру контента выбранного блока."
                : inspectorTab === "design"
                  ? "Фокус на section group, style presets, colors и layout."
                  : inspectorTab === "media"
                    ? "Здесь обычно настраиваются cover image, screenshots и media-fit."
                    : inspectorTab === "icons"
                      ? "Подходящий режим для icon grid и item blocks с иконками."
                      : "Используй AI improve и reset, когда нужно быстро усилить блок."}
            </p>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                  Выбранный блок
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                  {selectedBlock ? getSalesPageBlockDisplayTitle(selectedBlock) : "Выбери блок"}
                </p>
              </div>
              {selectedBlock ? (
                <Badge variant="subtle">{getSalesPageBlockLabel(selectedBlock.type)}</Badge>
              ) : null}
            </div>

            {selectedBlock ? (
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">Заголовок панели</label>
                  <input
                    value={selectedBlock.title ?? ""}
                    onChange={(event) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              blocks: current.blocks.map((block) =>
                                block.id === selectedBlock.id
                                  ? { ...block, title: event.target.value }
                                  : block,
                              ),
                            }
                          : current,
                      )
                    }
                    className="premium-control"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">Подзаголовок</label>
                  <textarea
                    value={selectedBlock.subtitle ?? ""}
                    onChange={(event) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              blocks: current.blocks.map((block) =>
                                block.id === selectedBlock.id
                                  ? { ...block, subtitle: event.target.value }
                                  : block,
                              ),
                            }
                          : current,
                      )
                    }
                    rows={3}
                    className="premium-textarea"
                  />
                </div>

                <div className="rounded-[1.6rem] border border-black/8 bg-[#fafbff] p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-black">Заменить блок</p>
                      <p className="mt-1 text-sm leading-6 text-black/46">
                        Меняет тип блока целиком и подставляет новый content preset,
                        сохраняя место внутри страницы.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <select
                        value={selectedBlock.type}
                        onChange={(event) =>
                          runMutation("replace-block", async () =>
                            replaceSalesPageBlockType(
                              selectedBlock.id,
                              event.target.value as SalesPageBlockDraft["type"],
                            ),
                          )
                        }
                        className="premium-select flex-1"
                      >
                        {salesPageBlockCatalog.map((blockOption) => (
                          <option key={blockOption.type} value={blockOption.type}>
                            {blockOption.title}
                          </option>
                        ))}
                      </select>
                      <Badge variant="subtle" className="self-start sm:self-center">
                        сброс контента
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedBlockSettings ? (
                  <div className="rounded-[1.6rem] border border-black/8 bg-[#fafbff] p-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-black">Группа секции</p>
                        <p className="mt-1 text-sm leading-6 text-black/46">
                          Блоки с одинаковым ID секции, идущие подряд, собираются в
                          одну визуальную секцию в предпросмотре, как в
                          полноценном конструкторе сайтов. Если поля пустые, предпросмотр использует
                          умные auto-секции из шаблона.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Название секции
                          </label>
                          <input
                            value={selectedBlockSettings.sectionLabel ?? ""}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                sectionLabel: event.target.value,
                              }))
                            }
                            placeholder="например, Доверие и доказательства"
                            className="premium-control"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            ID секции
                          </label>
                          <input
                            value={selectedBlockSettings.sectionId ?? ""}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                sectionId: slugifyCourseTitle(event.target.value),
                              }))
                            }
                            placeholder="doverie-i-dokazatelstva"
                            className="premium-control"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Стиль секции
                          </label>
                          <select
                            value={selectedBlockSettings.sectionStyle}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                sectionStyle: event.target
                                  .value as SalesPageBlockSettings["sectionStyle"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value="glass">стекло</option>
                            <option value="soft">мягкий</option>
                            <option value="accent">акцент</option>
                            <option value="gradient">градиент</option>
                            <option value="midnight">полночь</option>
                            <option value="outline">контур</option>
                          </select>
                        </div>

                        <ColorField
                          label="Акцент секции"
                          value={selectedBlockSettings.sectionAccentColor ?? pageTheme.accent}
                          onChange={(value) =>
                            updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                              ...settings,
                              sectionAccentColor: value,
                            }))
                          }
                        />
                        <ColorField
                          label="Поверхность секции"
                          value={selectedBlockSettings.sectionSurfaceColor ?? pageTheme.surface}
                          onChange={(value) =>
                            updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                              ...settings,
                              sectionSurfaceColor: value,
                            }))
                          }
                        />
                        <ColorField
                          label="Текст секции"
                          value={selectedBlockSettings.sectionTextColor ?? pageTheme.text}
                          onChange={(value) =>
                            updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                              ...settings,
                              sectionTextColor: value,
                            }))
                          }
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <PremiumButton
                          type="button"
                          tone="secondary"
                          className="h-10 px-4"
                          onClick={() =>
                            updateLocalBlockSettings(selectedBlock.id, (settings) => {
                              const fallbackLabel =
                                selectedBlock.title ?? selectedBlock.type ?? "Секция";
                              const nextLabel =
                                settings.sectionLabel?.trim() || fallbackLabel;
                              const nextId =
                                settings.sectionId?.trim() ||
                                slugifyCourseTitle(nextLabel) ||
                                slugifyCourseTitle(selectedBlock.type.toLowerCase());

                              return {
                                ...settings,
                                sectionLabel: nextLabel,
                                sectionId: nextId,
                              };
                            })
                          }
                        >
                          Создать секцию из блока
                        </PremiumButton>

                        <PremiumButton
                          type="button"
                          tone="secondary"
                          className="h-10 px-4"
                          onClick={() =>
                            updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                              ...settings,
                              sectionId: "",
                              sectionLabel: "",
                            }))
                          }
                        >
                          Убрать из секции
                        </PremiumButton>
                      </div>
                    </div>
                  </div>
                ) : null}

                {selectedBlockSettings ? (
                  <div className="rounded-[1.6rem] border border-black/8 bg-[#fafbff] p-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-black">Стиль блока</p>
                        <p className="mt-1 text-sm leading-6 text-black/46">
                          Быстрые пресеты для блока, чтобы собрать страницу как
                          настоящий визуальный конструктор.
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {salesPageBlockStylePresets.map((preset) => (
                          <button
                            key={preset.key}
                            type="button"
                            onClick={() =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                ...preset.settings,
                              }))
                            }
                            className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm transition ${
                              selectedBlockSettings.variant === preset.key
                                ? "border-[#3d3bff]/30 bg-[#eef0ff]"
                                : "border-black/8 bg-white hover:border-black/14 hover:bg-[#fbfbff]"
                            }`}
                          >
                            <p className="font-medium text-black">{preset.label}</p>
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Фон блока
                          </label>
                          <select
                            value={selectedBlockSettings.backgroundStyle}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                backgroundStyle: event.target
                                  .value as SalesPageBlockSettings["backgroundStyle"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value="glass">стекло</option>
                            <option value="soft">мягкий</option>
                            <option value="accent">акцент</option>
                            <option value="gradient">градиент</option>
                            <option value="midnight">полночь</option>
                            <option value="outline">контур</option>
                            <option value="solid">сплошной</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Выравнивание
                          </label>
                          <select
                            value={selectedBlockSettings.align}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                align: event.target.value as SalesPageBlockSettings["align"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value="left">слева</option>
                            <option value="center">по центру</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Отступы
                          </label>
                          <select
                            value={selectedBlockSettings.padding}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                padding: event.target.value as SalesPageBlockSettings["padding"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value="sm">малые</option>
                            <option value="md">средние</option>
                            <option value="lg">большие</option>
                            <option value="xl">очень большие</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Макет
                          </label>
                          <select
                            value={selectedBlockSettings.layout}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                layout: event.target.value as SalesPageBlockSettings["layout"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value="split">в две зоны</option>
                            <option value="stacked">вертикально</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Стиль дизайна
                          </label>
                          <select
                            value={selectedBlockSettings.designStyle}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                designStyle: event.target
                                  .value as SalesPageBlockSettings["designStyle"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value="cards">карточки</option>
                            <option value="editorial">редакционный</option>
                            <option value="numbered">нумерованный</option>
                            <option value="media">медиа</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Колонки сетки
                          </label>
                          <select
                            value={selectedBlockSettings.gridColumns}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                gridColumns: Number(event.target.value) as SalesPageBlockSettings["gridColumns"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Стиль элементов
                          </label>
                          <select
                            value={selectedBlockSettings.itemStyle}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                itemStyle: event.target.value as SalesPageBlockSettings["itemStyle"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value="card">карточка</option>
                            <option value="pill">плашка</option>
                            <option value="minimal">минимальный</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Стиль иконок
                          </label>
                          <select
                            value={selectedBlockSettings.iconStyle}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                iconStyle: event.target.value as SalesPageBlockSettings["iconStyle"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value="soft">мягкий</option>
                            <option value="solid">заливка</option>
                            <option value="outline">контур</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Режим изображения
                          </label>
                          <select
                            value={selectedBlockSettings.mediaFit}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                mediaFit: event.target
                                  .value as SalesPageBlockSettings["mediaFit"],
                              }))
                            }
                            className="premium-select"
                          >
                            <option value="cover">на весь блок</option>
                            <option value="contain">целиком внутри</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Акцентный цвет"
                          value={selectedBlockSettings.accentColor ?? page?.theme.accent ?? "#3d3bff"}
                          onChange={(value) =>
                            updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                              ...settings,
                              accentColor: value,
                            }))
                          }
                        />
                        <ColorField
                          label="Цвет поверхности"
                          value={selectedBlockSettings.surfaceColor ?? page?.theme.surface ?? "#ffffff"}
                          onChange={(value) =>
                            updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                              ...settings,
                              surfaceColor: value,
                            }))
                          }
                        />
                        <ColorField
                          label="Цвет текста"
                          value={selectedBlockSettings.textColor ?? page?.theme.text ?? "#05070b"}
                          onChange={(value) =>
                            updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                              ...settings,
                              textColor: value,
                            }))
                          }
                        />
                        <ColorField
                          label="Цвет границы"
                          value={selectedBlockSettings.borderColor ?? "rgba(15,23,42,0.08)"}
                          onChange={(value) =>
                            updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                              ...settings,
                              borderColor: value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-[1.2rem] border border-black/8 bg-white px-4 py-3 text-sm text-black/62">
                          <input
                            type="checkbox"
                            checked={selectedBlockSettings.showModules ?? true}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                showModules: event.target.checked,
                              }))
                            }
                          />
                          Показывать модули
                        </label>
                        <label className="flex items-center gap-3 rounded-[1.2rem] border border-black/8 bg-white px-4 py-3 text-sm text-black/62">
                          <input
                            type="checkbox"
                            checked={selectedBlockSettings.showLessonCount ?? true}
                            onChange={(event) =>
                              updateLocalBlockSettings(selectedBlock.id, (settings) => ({
                                ...settings,
                                showLessonCount: event.target.checked,
                              }))
                            }
                          />
                          Показывать количество уроков
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}

                {textFieldNames(selectedBlock.content).map(([field, label]) => (
                  <div key={field} className="space-y-2">
                    {field === "coverImage" ? (
                      <UploadUrlField
                        label={label}
                        value={String(selectedBlock.content[field] ?? "")}
                        onChange={(value) =>
                          handleInlineChange(selectedBlock.id, field, value)
                        }
                      />
                    ) : field === "body" || field === "subheadline" ? (
                      <>
                        <label className="text-sm font-medium text-black">{label}</label>
                        <textarea
                          value={String(selectedBlock.content[field] ?? "")}
                          onChange={(event) =>
                            handleInlineChange(selectedBlock.id, field, event.target.value)
                          }
                          rows={field === "body" ? 5 : 4}
                          className="premium-textarea"
                        />
                      </>
                    ) : (
                      <>
                        <label className="text-sm font-medium text-black">{label}</label>
                        <input
                          value={String(selectedBlock.content[field] ?? "")}
                          onChange={(event) =>
                            handleInlineChange(selectedBlock.id, field, event.target.value)
                          }
                          className="premium-control"
                        />
                      </>
                    )}
                  </div>
                ))}

                {"badges" in selectedBlock.content ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Бейджи</label>
                    <textarea
                      value={joinMultiline(selectedBlock.content.badges)}
                      onChange={(event) =>
                        updateLocalBlock(selectedBlock.id, (block) => ({
                          ...block,
                          content: {
                            ...block.content,
                            badges: parseMultiline(event.target.value),
                          },
                        }))
                      }
                      rows={4}
                      className="premium-textarea"
                    />
                  </div>
                ) : null}

                {["deliverables", "included"].map((field) =>
                  field in selectedBlock.content ? (
                    <div key={field} className="space-y-2">
                      <label className="text-sm font-medium text-black">
                        {field === "deliverables"
                          ? "Результаты"
                          : field === "included"
                            ? "Что входит"
                            : "Скриншоты"}
                      </label>
                      <textarea
                        value={joinMultiline(selectedBlock.content[field])}
                        onChange={(event) =>
                          updateLocalBlock(selectedBlock.id, (block) => ({
                            ...block,
                            content: {
                              ...block.content,
                              [field]: parseMultiline(event.target.value),
                            },
                          }))
                        }
                        rows={4}
                        className="premium-textarea"
                      />
                    </div>
                  ) : null,
                )}

                {"screenshots" in selectedBlock.content ? (
                  <ImageListEditor
                    label="Скриншоты"
                    values={
                      Array.isArray(selectedBlock.content.screenshots)
                        ? (selectedBlock.content.screenshots as string[])
                        : []
                    }
                    onChange={(values) =>
                      updateLocalBlock(selectedBlock.id, (block) => ({
                        ...block,
                        content: {
                          ...block.content,
                          screenshots: values,
                        },
                      }))
                    }
                  />
                ) : null}

                {"items" in selectedBlock.content ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">
                      Элементы
                    </label>
                    <StructuredItemsEditor
                      items={
                        Array.isArray(selectedBlock.content.items)
                          ? (selectedBlock.content.items as SalesPageBlockItem[])
                          : []
                      }
                      onChange={(items) =>
                        updateLocalBlock(selectedBlock.id, (block) => ({
                          ...block,
                          content: {
                            ...block.content,
                            items,
                          },
                        }))
                      }
                    />
                  </div>
                ) : null}

                {"faqs" in selectedBlock.content ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">FAQ</label>
                    <FaqEditor
                      items={
                        Array.isArray(selectedBlock.content.faqs)
                          ? (selectedBlock.content.faqs as SalesPageFaqItem[])
                          : []
                      }
                      onChange={(items) =>
                        updateLocalBlock(selectedBlock.id, (block) => ({
                          ...block,
                          content: {
                            ...block.content,
                            faqs: items,
                          },
                        }))
                      }
                    />
                  </div>
                ) : null}

                {"links" in selectedBlock.content ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Ссылки</label>
                    <LinksEditor
                      items={
                        Array.isArray(selectedBlock.content.links)
                          ? (selectedBlock.content.links as Array<{
                              label?: string;
                              url?: string;
                            }>)
                          : []
                      }
                      onChange={(items) =>
                        updateLocalBlock(selectedBlock.id, (block) => ({
                          ...block,
                          content: {
                            ...block.content,
                            links: items,
                          },
                        }))
                      }
                    />
                  </div>
                ) : null}

                {"comparisonItems" in selectedBlock.content ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">
                      Строки сравнения
                    </label>
                    <ComparisonEditor
                      items={
                        Array.isArray(selectedBlock.content.comparisonItems)
                          ? (selectedBlock.content.comparisonItems as Array<{
                              label?: string;
                              ordinaryCourse?: string;
                              nowaSchoolCourse?: string;
                            }>)
                          : []
                      }
                      onChange={(items) =>
                        updateLocalBlock(selectedBlock.id, (block) => ({
                          ...block,
                          content: {
                            ...block.content,
                            comparisonItems: items,
                          },
                        }))
                      }
                    />
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <PremiumButton
                    type="button"
                    className="h-11 w-full"
                    disabled={pendingAction === "save-block"}
                    onClick={handleSaveSelectedBlock}
                  >
                    {pendingAction === "save-block" ? (
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 size-4" />
                    )}
                    Сохранить блок
                  </PremiumButton>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <PremiumButton
                      type="button"
                      tone="secondary"
                      className="h-11 w-full"
                      disabled={pendingAction === "reset-block"}
                      onClick={() =>
                        runMutation("reset-block", async () =>
                          resetSalesPageBlock(selectedBlock.id),
                        )
                      }
                    >
                      Сбросить блок
                    </PremiumButton>
                    <PremiumButton
                      type="button"
                      tone="secondary"
                      className="h-11 w-full"
                      disabled={pendingAction === "ai-block"}
                      onClick={() =>
                        runMutation("ai-block", async () =>
                          improveSalesPageBlockAction(selectedBlock.id),
                        )
                      }
                    >
                      <Bot className="mr-2 size-4" />
                      AI-улучшение
                    </PremiumButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <FeedbackCard
                  message="Выбери блок в левой колонке или прямо на холсте, чтобы редактировать контент как в отдельном конструкторе сайтов."
                />
              </div>
            )}
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-black/32">
              Настройки страницы
            </p>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Название страницы</label>
                <input
                  value={page?.title ?? ""}
                  onChange={(event) =>
                    setPage((current) =>
                      current
                        ? {
                            ...current,
                            title: event.target.value,
                          }
                        : current,
                    )
                  }
                  className="premium-control"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">SEO-заголовок</label>
                <input
                  value={page?.metaTitle ?? ""}
                  onChange={(event) =>
                    setPage((current) =>
                      current
                        ? {
                            ...current,
                            metaTitle: event.target.value,
                          }
                        : current,
                    )
                  }
                  className="premium-control"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">SEO-описание</label>
                <textarea
                  value={page?.metaDescription ?? ""}
                  onChange={(event) =>
                    setPage((current) =>
                      current
                        ? {
                            ...current,
                            metaDescription: event.target.value,
                          }
                        : current,
                    )
                  }
                  rows={4}
                  className="premium-textarea"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">OG-изображение</label>
                <input
                  value={page?.ogImage ?? ""}
                  onChange={(event) =>
                    setPage((current) =>
                      current
                        ? {
                            ...current,
                            ogImage: event.target.value,
                          }
                        : current,
                    )
                  }
                  className="premium-control"
                />
              </div>

              <div className="rounded-[1.6rem] border border-black/8 bg-[#fafbff] p-4">
                <div>
                  <p className="text-sm font-medium text-black">Тема страницы</p>
                  <p className="mt-1 text-sm leading-6 text-black/46">
                    Общая палитра страницы. Блоки могут наследовать ее или жить
                    со своей локальной палитрой.
                  </p>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {salesPageThemePresets.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() =>
                        setPage((current) =>
                          current
                            ? {
                                ...current,
                                theme: preset.theme,
                              }
                            : current,
                        )
                      }
                      className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                        page?.theme.accent === preset.theme.accent
                          ? "border-[#3d3bff]/30 bg-[#eef0ff]"
                          : "border-black/8 bg-white hover:border-black/14 hover:bg-[#fbfbff]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-4 rounded-full border border-black/8"
                          style={{ backgroundColor: preset.theme.accent }}
                        />
                        <span className="text-sm font-medium text-black">
                          {preset.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <ColorField
                    label="Акцент"
                    value={page?.theme.accent ?? "#3d3bff"}
                    onChange={(value) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              theme: {
                                ...current.theme,
                                accent: value,
                                accentSoft: hexToRgba(value, 0.12),
                              },
                            }
                          : current,
                      )
                    }
                  />
                  <ColorField
                    label="Фон"
                    value={page?.theme.background ?? "#f6f7fb"}
                    onChange={(value) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              theme: {
                                ...current.theme,
                                background: value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                  <ColorField
                    label="Поверхность"
                    value={page?.theme.surface ?? "#ffffff"}
                    onChange={(value) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              theme: {
                                ...current.theme,
                                surface: value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                  <ColorField
                    label="Текст"
                    value={page?.theme.text ?? "#05070b"}
                    onChange={(value) =>
                      setPage((current) =>
                        current
                          ? {
                              ...current,
                              theme: {
                                ...current.theme,
                                text: value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
              </div>

              <PremiumButton
                type="button"
                className="h-11 w-full"
                disabled={pendingAction === "save-meta" || !page}
                onClick={handleSaveMeta}
              >
                {pendingAction === "save-meta" ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 size-4" />
                )}
                Сохранить настройки страницы
              </PremiumButton>
            </div>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                  Аналитика
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                  Сигналы продающей страницы
                </p>
              </div>
              <Badge variant="subtle">{analytics.pageViews} просмотров</Badge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <AnalyticsMiniCard
                label="Просмотры"
                value={String(analytics.pageViews)}
                description="Просмотры страницы курса"
              />
              <AnalyticsMiniCard
                label="Переходы к оплате"
                value={`${analytics.viewToCheckoutConversion}%`}
                description="Конверсия из просмотра в оплату"
              />
              <AnalyticsMiniCard
                label="Покупки"
                value={String(analytics.totalSales)}
                description="Покупки и mock paid orders"
              />
              <AnalyticsMiniCard
                label="Доход"
                value={`${analytics.authorRevenue.toFixed(0)} ${course.currency}`}
                description="Доход автора после 15%"
              />
            </div>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                  Модерация
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                  Очередь и замечания
                </p>
              </div>
              <Badge variant="subtle">{moderation.openIssuesCount} открытых замечаний</Badge>
            </div>

            <div className="mt-5 space-y-3">
              {moderation.latestSubmission ? (
                <div className="rounded-[1.6rem] border border-black/6 bg-[#fafbff] p-4">
                  <p className="text-sm font-medium text-black">
                    Последняя отправка: {moderation.latestSubmission.status}
                  </p>
                  {moderation.latestSubmission.adminComment ? (
                    <p className="mt-2 text-sm leading-7 text-black/56">
                      {moderation.latestSubmission.adminComment}
                    </p>
                  ) : null}
                </div>
              ) : (
                <FeedbackCard message="Страница еще не отправлялась на модерацию." />
              )}

              {moderation.latestIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-[1.5rem] border border-black/6 bg-[#fbfbfd] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[#fff5e8] text-[#b7791f]">
                      <AlertTriangle className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">
                        {issue.type} · {issue.severity}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-black/56">
                        {issue.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>

          {suggestions.length ? (
            <PremiumCard
              padding="lg"
              className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                    AI-оптимизатор
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                    Подсказки
                  </p>
                </div>
                <Badge variant="primary">{suggestions.length}</Badge>
              </div>

              <div className="mt-5 space-y-4">
                {suggestions.map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[1.7rem] border border-black/6 bg-[#fafbff] p-5"
                  >
                    <p className="text-base font-semibold tracking-tight text-black">
                      {suggestion.problem}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-black/52">
                      {suggestion.whyItMatters}
                    </p>
                    <div className="mt-4 rounded-[1.4rem] border border-dashed border-black/10 bg-white px-4 py-4 text-sm leading-7 text-black/68">
                      {suggestion.suggestedCopy}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <PremiumButton
                        type="button"
                        className="h-10 px-4"
                        disabled={pendingAction === `apply-${suggestion.id}`}
                        onClick={() =>
                          runMutation(`apply-${suggestion.id}`, async () =>
                            applySalesPageSuggestion(course.id, suggestion),
                          )
                        }
                      >
                        Применить
                      </PremiumButton>
                      <PremiumButton
                        type="button"
                        tone="secondary"
                        className="h-10 px-4"
                        onClick={() =>
                          setSuggestions((current) =>
                            current.filter((item) => item.id !== suggestion.id),
                          )
                        }
                      >
                        Отклонить
                      </PremiumButton>
                    </div>
                  </motion.div>
                ))}
              </div>
            </PremiumCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
