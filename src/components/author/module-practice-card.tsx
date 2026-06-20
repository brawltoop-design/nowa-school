"use client";

import { startTransition, useState } from "react";
import {
  BriefcaseBusiness,
  CheckSquare,
  ClipboardList,
  LoaderCircle,
  Plus,
  Rocket,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  coerceModulePractice,
  modulePracticeTypeMeta,
  modulePracticeTypeOptions,
  type ModulePracticeChecklistItem,
  type ModulePracticeDeliverable,
  type ModulePracticeInput,
  type ModulePracticeType,
} from "@/lib/module-practice";
import type { CourseStudioData } from "@/server/sales-page/queries";
import { saveAuthorModulePractice } from "@/server/author/actions";

type PracticeModule = CourseStudioData["course"]["modules"][number];

function Notice({
  message,
  tone = "default",
}: {
  message: string;
  tone?: "default" | "success" | "error";
}) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-600"
        : "border-black/8 bg-[#f6f7fb] text-black/56";

  return (
    <div className={`rounded-[1.4rem] border px-4 py-4 text-sm ${classes}`}>
      {message}
    </div>
  );
}

function TypeChip({
  type,
  active,
  onClick,
}: {
  type: ModulePracticeType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#3d3bff] text-white shadow-[0_18px_50px_rgba(61,59,255,0.24)]"
          : "border border-black/8 bg-white text-black/62 hover:border-black/14 hover:bg-[#f7f8fb]"
      }`}
    >
      {modulePracticeTypeMeta[type].label}
    </button>
  );
}

function DeliverablesEditor({
  items,
  onChange,
}: {
  items: ModulePracticeDeliverable[];
  onChange: (items: ModulePracticeDeliverable[]) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`deliverable-${index}`}
          className="grid gap-3 rounded-[1.3rem] border border-black/8 bg-white p-4 md:grid-cols-[minmax(0,1fr)_140px_44px]"
        >
          <Input
            value={item.text}
            placeholder="Что студент должен сдать"
            onChange={(event) =>
              onChange(
                items.map((entry, entryIndex) =>
                  entryIndex === index
                    ? { ...entry, text: event.target.value }
                    : entry,
                ),
              )
            }
          />
          <select
            value={item.required ? "required" : "optional"}
            onChange={(event) =>
              onChange(
                items.map((entry, entryIndex) =>
                  entryIndex === index
                    ? {
                        ...entry,
                        required: event.target.value === "required",
                      }
                    : entry,
                ),
              )
            }
            className="premium-select"
          >
            <option value="required">обязательно</option>
            <option value="optional">необязательно</option>
          </select>
          {items.length > 1 ? (
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full border border-black/8 bg-white text-black/54 transition hover:border-black/14 hover:text-black"
              onClick={() =>
                onChange(items.filter((_, entryIndex) => entryIndex !== index))
              }
            >
              <Trash2 className="size-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      ))}
      <PremiumButton
        type="button"
        tone="secondary"
        className="h-10 px-4"
        onClick={() =>
          onChange([...items, { text: "", required: true }])
        }
      >
        <Plus className="mr-2 size-4" />
        Добавить результат
      </PremiumButton>
    </div>
  );
}

function ChecklistEditor({
  items,
  onChange,
}: {
  items: ModulePracticeChecklistItem[];
  onChange: (items: ModulePracticeChecklistItem[]) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`checkpoint-${index}`}
          className="grid gap-3 rounded-[1.3rem] border border-black/8 bg-white p-4 md:grid-cols-[minmax(0,1fr)_140px_44px]"
        >
          <Input
            value={item.text}
            placeholder="Чекпоинт по модулю"
            onChange={(event) =>
              onChange(
                items.map((entry, entryIndex) =>
                  entryIndex === index
                    ? { ...entry, text: event.target.value }
                    : entry,
                ),
              )
            }
          />
          <select
            value={item.required ? "required" : "optional"}
            onChange={(event) =>
              onChange(
                items.map((entry, entryIndex) =>
                  entryIndex === index
                    ? {
                        ...entry,
                        required: event.target.value === "required",
                      }
                    : entry,
                ),
              )
            }
            className="premium-select"
          >
            <option value="required">обязательно</option>
            <option value="optional">необязательно</option>
          </select>
          {items.length > 1 ? (
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full border border-black/8 bg-white text-black/54 transition hover:border-black/14 hover:text-black"
              onClick={() =>
                onChange(items.filter((_, entryIndex) => entryIndex !== index))
              }
            >
              <Trash2 className="size-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      ))}
      <PremiumButton
        type="button"
        tone="secondary"
        className="h-10 px-4"
        onClick={() =>
          onChange([...items, { text: "", required: true }])
        }
      >
        <Plus className="mr-2 size-4" />
        Добавить чекпоинт
      </PremiumButton>
    </div>
  );
}

export function ModulePracticeCard({ module }: { module: PracticeModule }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(Boolean(module.practice));
  const [practice, setPractice] = useState<ModulePracticeInput>(
    coerceModulePractice(module.practice, module.title),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const handleSave = () => {
    setFeedback(null);
    setIsSaving(true);

    startTransition(async () => {
      const result = await saveAuthorModulePractice(
        module.id,
        enabled ? practice : null,
      );

      if (!result.success) {
        setFeedback({ tone: "error", message: result.message });
        setIsSaving(false);
        return;
      }

      setFeedback({ tone: "success", message: result.message });
      setIsSaving(false);
      router.refresh();
    });
  };

  return (
    <PremiumCard
      id={`module-practice-${module.id}`}
      padding="lg"
      className="rounded-[2.35rem] bg-white/94 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">Модуль {module.order}</Badge>
            <Badge variant="subtle">{module.lessons.length} уроков</Badge>
            <Badge variant="subtle">
              {enabled
                ? `${practice.deliverables.length} результатов`
                : "задание выключено"}
            </Badge>
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
            {module.title}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-black/56">
            Настрой итоговую практику по модулю отдельно от уроков: проект,
            кейс, рабочий шаблон, аудит или свой формат.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <PremiumButton
            type="button"
            tone={enabled ? "secondary" : "primary"}
            className="h-11 px-4"
            onClick={() => setEnabled((value) => !value)}
          >
            {enabled ? "Выключить задание модуля" : "Включить задание модуля"}
          </PremiumButton>
          <PremiumButton
            type="button"
            className="h-11 px-4"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Сохраняем...
              </>
            ) : (
              "Сохранить задание модуля"
            )}
          </PremiumButton>
        </div>
      </div>

      {enabled ? (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap gap-3">
            {modulePracticeTypeOptions.map((type) => (
              <TypeChip
                key={type}
                type={type}
                active={practice.type === type}
                onClick={() =>
                  setPractice((current) => ({
                    ...current,
                    type,
                  }))
                }
              />
            ))}
          </div>

          <div className="rounded-[1.7rem] border border-black/8 bg-[#fafbff] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Название задания</Label>
                <Input
                  value={practice.title}
                  onChange={(event) =>
                    setPractice((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Краткое описание</Label>
                <Textarea
                  value={practice.summary}
                  className="min-h-[124px]"
                  onChange={(event) =>
                    setPractice((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Ожидаемый результат</Label>
                <Textarea
                  value={practice.outcome}
                  className="min-h-[120px]"
                  onChange={(event) =>
                    setPractice((current) => ({
                      ...current,
                      outcome: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Формат сдачи</Label>
                <Textarea
                  value={practice.submissionLabel}
                  className="min-h-[120px]"
                  onChange={(event) =>
                    setPractice((current) => ({
                      ...current,
                      submissionLabel: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-[1.7rem] border border-black/8 bg-[#fafbff] p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                  <BriefcaseBusiness className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Результаты</p>
                  <p className="mt-1 text-sm leading-6 text-black/46">
                    Что студент должен показать по итогам модуля.
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <DeliverablesEditor
                  items={practice.deliverables}
                  onChange={(deliverables) =>
                    setPractice((current) => ({
                      ...current,
                      deliverables,
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-black/8 bg-[#fafbff] p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                  <CheckSquare className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Контрольные точки</p>
                  <p className="mt-1 text-sm leading-6 text-black/46">
                    Что студент должен проверить перед сдачей модуля.
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <ChecklistEditor
                  items={practice.checklist}
                  onChange={(checklist) =>
                    setPractice((current) => ({
                      ...current,
                      checklist,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-black/8 bg-white px-4 py-4">
              <ClipboardList className="size-5 text-[#3d3bff]" />
              <p className="mt-3 text-sm font-medium text-black">
                {modulePracticeTypeMeta[practice.type].label}
              </p>
              <p className="mt-2 text-sm leading-6 text-black/48">
                {modulePracticeTypeMeta[practice.type].description}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-black/8 bg-white px-4 py-4">
              <BriefcaseBusiness className="size-5 text-[#3d3bff]" />
              <p className="mt-3 text-sm font-medium text-black">
                {practice.deliverables.filter((item) => item.required).length} обязательных
              </p>
              <p className="mt-2 text-sm leading-6 text-black/48">
                обязательных результатов по модулю
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-black/8 bg-white px-4 py-4">
              <Rocket className="size-5 text-[#3d3bff]" />
              <p className="mt-3 text-sm font-medium text-black">
                Готово к проверке
              </p>
              <p className="mt-2 text-sm leading-6 text-black/48">
                модуль можно превратить в заметный milestone, а не просто пачку
                уроков
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <Notice message="Для этого модуля пока выключено итоговое задание. Включи module task, если хочешь завершать модуль не просмотром, а реальным результатом." />
        </div>
      )}

      {feedback ? (
        <div className="mt-5">
          <Notice message={feedback.message} tone={feedback.tone} />
        </div>
      ) : null}
    </PremiumCard>
  );
}
