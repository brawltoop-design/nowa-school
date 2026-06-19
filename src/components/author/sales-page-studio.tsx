"use client";

import { startTransition, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Eye,
  FileWarning,
  Laptop2,
  LoaderCircle,
  MonitorSmartphone,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
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
  updateSalesPageBlock,
  deleteSalesPageBlock,
  duplicateSalesPageBlock,
} from "@/server/sales-page/actions";
import type {
  CourseStudioData,
  SalesPageAnalyticsSummary,
} from "@/server/sales-page/queries";
import {
  salesPageBlockCatalog,
  salesPageStatusMeta,
  salesPageTemplateOptions,
  type SalesPageBlockItem,
  type SalesPageBlockContent,
  type SalesPageBlockDraft,
  type SalesPageDeviceMode,
  type SalesPageDraft,
  type SalesPageFaqItem,
} from "@/lib/sales-page";
import type { SalesPageSuggestion } from "@/lib/ai-sales-page";

type SalesPageStudioProps = {
  course: CourseStudioData["course"];
  salesPage: SalesPageDraft | null;
  analytics: SalesPageAnalyticsSummary;
  moderation: CourseStudioData["moderation"];
};

function toneFromStatus(status: SalesPageDraft["status"]) {
  return salesPageStatusMeta[status]?.tone ?? "subtle";
}

function textFieldNames(content: SalesPageBlockContent) {
  return [
    ["headline", "Headline"],
    ["subheadline", "Subheadline"],
    ["body", "Body"],
    ["primaryCtaText", "Primary CTA"],
    ["secondaryCtaText", "Secondary CTA"],
    ["coverImage", "Cover image"],
    ["oldPrice", "Old price"],
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
              placeholder="Title"
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
              placeholder="Description"
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
              placeholder="Icon key: sparkles, bot, shield..."
              className="premium-control h-11 bg-white"
            />
            <div className="flex justify-end">
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-10 px-4"
                onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}
              >
                Remove item
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
        Add item
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
              placeholder="Question"
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
              placeholder="Answer"
              className="premium-textarea min-h-[120px] bg-white"
            />
            <div className="flex justify-end">
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-10 px-4"
                onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}
              >
                Remove FAQ
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
        Add FAQ
      </PremiumButton>
    </div>
  );
}

export function SalesPageStudio({
  course,
  salesPage,
  analytics,
  moderation,
}: SalesPageStudioProps) {
  const router = useRouter();
  const [deviceMode, setDeviceMode] = useState<SalesPageDeviceMode>("desktop");
  const [page, setPage] = useState<SalesPageDraft | null>(salesPage);
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(salesPage),
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    salesPage?.blocks[0]?.id ?? null,
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

  const isDirty = useMemo(
    () => JSON.stringify(page) !== savedSnapshot,
    [page, savedSnapshot],
  );

  const selectedBlock =
    page?.blocks.find((block) => block.id === selectedBlockId) ?? null;

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
            ? `Блок "${deleteTargetBlock.title ?? deleteTargetBlock.type}" исчезнет из sales page и live preview.`
            : "Блок будет удален из sales page."
        }
        confirmLabel="Удалить блок"
        pending={pendingAction === "delete"}
        onConfirm={handleConfirmDeleteBlock}
      />

      <PremiumCard
        padding="lg"
        className="rounded-[2.6rem] bg-white/92 backdrop-blur-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="primary">Sales Page Builder</Badge>
              <Badge variant={page ? toneFromStatus(page.status) : "subtle"}>
                {page ? salesPageStatusMeta[page.status].label : "No page yet"}
              </Badge>
              <Badge variant="subtle">{isDirty ? "Unsaved" : "Saved"}</Badge>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
                Course sales page studio
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-black/56">
                Собирай мини-сайт курса: оффер, программа, proof points, FAQ,
                цена, CTA и live preview без старой CMS-структуры.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PremiumButton asChild tone="secondary" className="h-11 px-4">
              <Link href={`/author/courses/${course.id}/preview/sales-page`}>
                <Eye className="mr-2 size-4" />
                Preview
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
                onClick={() => setDeviceMode("desktop")}
              >
                <Laptop2 className="size-4" />
                Desktop
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  deviceMode === "mobile"
                    ? "bg-white text-black shadow-sm"
                    : "text-black/48"
                }`}
                onClick={() => setDeviceMode("mobile")}
              >
                <MonitorSmartphone className="size-4" />
                Mobile
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
              AI Improve Page
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
              Submit for moderation
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
              Publish
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
              Unpublish
            </PremiumButton>
          </div>
        </div>
      </PremiumCard>

      {feedback ? (
        <FeedbackCard message={feedback.message} tone={feedback.tone} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-black/32">
              Templates
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
                Apply template
              </PremiumButton>
            </div>
            <p className="mt-4 text-sm leading-7 text-black/52">
              Если нужно, можно быстро перезаписать структуру страницы под skill,
              creator или tech-сценарий.
            </p>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                  Blocks
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                  {page?.blocks.length ?? 0} blocks
                </p>
              </div>
              <Badge variant="subtle">{course.metrics.lessonCount} lessons</Badge>
            </div>

            <div className="mt-5 space-y-3">
              <select
                value={newBlockType}
                onChange={(event) =>
                  setNewBlockType(event.target.value as SalesPageBlockDraft["type"])
                }
                className="premium-select"
              >
                {salesPageBlockCatalog.map((block) => (
                  <option key={block.type} value={block.type}>
                    {block.title}
                  </option>
                ))}
              </select>
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-11 w-full"
                disabled={pendingAction === "add-block"}
                onClick={() =>
                  runMutation("add-block", async () =>
                    createSalesPageBlock(course.id, newBlockType),
                  )
                }
              >
                {pendingAction === "add-block" ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                Add block
              </PremiumButton>
            </div>

            <div className="mt-6 space-y-3">
              {page?.blocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition ${
                    selectedBlockId === block.id
                      ? "border-[#3d3bff]/28 bg-[#eef0ff]"
                      : "border-black/6 bg-[#fafbff] hover:border-black/12"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-black">
                        {block.title ?? block.type}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-black/34">
                        {block.type}
                      </p>
                    </div>
                    {block.isVisible ? (
                      <Badge variant="subtle">Visible</Badge>
                    ) : (
                      <Badge variant="default">Hidden</Badge>
                    )}
                  </div>
                </button>
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
        </div>

        <PremiumCard
          padding="lg"
          className="rounded-[2.4rem] bg-white/86 backdrop-blur-xl"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                Live preview
              </p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                {deviceMode === "desktop" ? "Desktop canvas" : "Mobile canvas"}
              </p>
            </div>
            <Badge variant="subtle">{isDirty ? "Live edits" : "Synced"}</Badge>
          </div>

          <CourseSalesPageRenderer
            course={course}
            salesPage={page}
            deviceMode={deviceMode}
            mode="editor"
            selectedBlockId={selectedBlockId}
            primaryHref={`/checkout/mock?course=${encodeURIComponent(course.slug)}`}
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-black/32">
                  Selected block
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                  {selectedBlock?.title ?? selectedBlock?.type ?? "Choose a block"}
                </p>
              </div>
              {selectedBlock ? (
                <Badge variant="subtle">{selectedBlock.type}</Badge>
              ) : null}
            </div>

            {selectedBlock ? (
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">Panel title</label>
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

                {textFieldNames(selectedBlock.content).map(([field, label]) => (
                  <div key={field} className="space-y-2">
                    <label className="text-sm font-medium text-black">{label}</label>
                    {field === "body" || field === "subheadline" ? (
                      <textarea
                        value={String(selectedBlock.content[field] ?? "")}
                        onChange={(event) =>
                          handleInlineChange(selectedBlock.id, field, event.target.value)
                        }
                        rows={field === "body" ? 5 : 4}
                        className="premium-textarea"
                      />
                    ) : (
                      <input
                        value={String(selectedBlock.content[field] ?? "")}
                        onChange={(event) =>
                          handleInlineChange(selectedBlock.id, field, event.target.value)
                        }
                        className="premium-control"
                      />
                    )}
                  </div>
                ))}

                {"badges" in selectedBlock.content ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Badges</label>
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

                {["deliverables", "included", "screenshots"].map((field) =>
                  field in selectedBlock.content ? (
                    <div key={field} className="space-y-2">
                      <label className="text-sm font-medium text-black">
                        {field === "deliverables"
                          ? "Deliverables"
                          : field === "included"
                            ? "Included"
                            : "Screenshots"}
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

                {"items" in selectedBlock.content ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">
                      Items
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
                    Save block
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
                      Reset block
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
                      AI improve
                    </PremiumButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <FeedbackCard
                  message="Выбери блок слева или на canvas, чтобы редактировать тексты, изображения и массивы контента."
                />
              </div>
            )}
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-black/32">
              Page settings
            </p>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Page title</label>
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
                <label className="text-sm font-medium text-black">Meta title</label>
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
                <label className="text-sm font-medium text-black">Meta description</label>
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
                <label className="text-sm font-medium text-black">OG image</label>
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
                Save page settings
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
                  Analytics
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                  Sales page signals
                </p>
              </div>
              <Badge variant="subtle">{analytics.pageViews} views</Badge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <AnalyticsMiniCard
                label="Views"
                value={String(analytics.pageViews)}
                description="Просмотры страницы курса"
              />
              <AnalyticsMiniCard
                label="Checkout"
                value={`${analytics.viewToCheckoutConversion}%`}
                description="Конверсия просмотр -> checkout"
              />
              <AnalyticsMiniCard
                label="Purchases"
                value={String(analytics.totalSales)}
                description="Покупки и mock paid orders"
              />
              <AnalyticsMiniCard
                label="Revenue"
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
                  Moderation
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                  Queue & issues
                </p>
              </div>
              <Badge variant="subtle">{moderation.openIssuesCount} open issues</Badge>
            </div>

            <div className="mt-5 space-y-3">
              {moderation.latestSubmission ? (
                <div className="rounded-[1.6rem] border border-black/6 bg-[#fafbff] p-4">
                  <p className="text-sm font-medium text-black">
                    Last submission: {moderation.latestSubmission.status}
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
                    AI optimizer
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-black">
                    Suggestions
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
                        Apply
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
                        Reject
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
