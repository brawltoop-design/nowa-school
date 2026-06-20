"use client";

import { useEffect, useState } from "react";
import {
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PencilLine,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type {
  StudentLearningAssignment,
  StudentLearningChecklistItem,
  StudentLearningQuest,
} from "@/server/student/queries";

type LessonPracticeWorkspaceProps = {
  lessonId: string;
  aiSummary: string | null;
  transcript: string | null;
  assignment: StudentLearningAssignment | null;
  checklist: { items: StudentLearningChecklistItem[] } | null;
  quest: StudentLearningQuest | null;
};

function getNotesStorageKey(lessonId: string) {
  return `newschool:lesson-notes:${lessonId}`;
}

function getChecklistStorageKey(lessonId: string) {
  return `newschool:lesson-checklist:${lessonId}`;
}

export function LessonPracticeWorkspace({
  lessonId,
  aiSummary,
  transcript,
  assignment,
  checklist,
  quest,
}: LessonPracticeWorkspaceProps) {
  const [notes, setNotes] = useState("");
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedNotes = window.localStorage.getItem(getNotesStorageKey(lessonId));
    const savedChecklist = window.localStorage.getItem(
      getChecklistStorageKey(lessonId),
    );

    setNotes(savedNotes ?? "");

    if (savedChecklist) {
      try {
        const parsed = JSON.parse(savedChecklist) as Record<string, boolean>;
        setCheckedMap(parsed);
        return;
      } catch {
        // no-op
      }
    }

    setCheckedMap({});
  }, [lessonId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(getNotesStorageKey(lessonId), notes);
  }, [lessonId, notes]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      getChecklistStorageKey(lessonId),
      JSON.stringify(checkedMap),
    );
  }, [lessonId, checkedMap]);

  const checklistItems = checklist?.items ?? [];
  const completedChecklistItems = checklistItems.reduce(
    (sum, item, index) =>
      checkedMap[`${item.text}-${index}`] ? sum + 1 : sum,
    0,
  );
  const checklistProgress = checklistItems.length
    ? Math.round((completedChecklistItems / checklistItems.length) * 100)
    : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
      <div className="space-y-6">
        <PremiumCard
          padding="lg"
          className="rounded-[2.3rem] border-black/6 bg-white/94 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
        >
          <SectionHeader
            eyebrow="Практика"
            title="Конспект и закрепление"
            description="Здесь ученик может держать личные заметки, смотреть AI-выжимку и быстро возвращаться к сути урока."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.7rem] bg-[#f6f7fa] px-5 py-5">
              <div className="flex items-center gap-2 text-sm font-medium text-black">
                <Sparkles className="size-4 text-[#3d3bff]" />
                AI-выжимка
              </div>
              <p className="mt-3 text-sm leading-7 text-black/62">
                {aiSummary ?? "Сводка по уроку появится здесь, когда автор добавит AI-выжимку."}
              </p>
            </div>

            <div className="rounded-[1.7rem] bg-[#f6f7fa] px-5 py-5">
              <div className="flex items-center gap-2 text-sm font-medium text-black">
                <CheckCheck className="size-4 text-[#3d3bff]" />
                Статус практики
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-black">
                {checklistProgress}%
              </p>
              <p className="mt-2 text-sm text-black/52">
                {checklistItems.length
                  ? `${completedChecklistItems} из ${checklistItems.length} шагов отмечено`
                  : "Чеклист пока не добавлен"}
              </p>
              <div className="mt-4 h-2.5 rounded-full bg-black/6">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#3d3bff_0%,#77dbe7_100%)]"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] border border-black/6 bg-[#fafbfd] p-5">
            <div className="flex items-center gap-2">
              <PencilLine className="size-4 text-[#3d3bff]" />
              <p className="text-sm font-medium text-black">Личный конспект ученика</p>
            </div>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Запиши инсайты урока, идеи для домашки, что стоит пересмотреть и какие шаги сделать после просмотра."
              className="mt-4 min-h-[220px] bg-white"
            />
            <p className="mt-3 text-xs leading-6 text-black/40">
              Заметки сохраняются локально в браузере для этого урока.
            </p>
          </div>

          {transcript ? (
            <details className="mt-6 overflow-hidden rounded-[2rem] border border-black/6 bg-[#fafbfd]">
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-black">
                <span className="inline-flex items-center gap-2">
                  <FileText className="size-4 text-[#3d3bff]" />
                  Полный транскрипт урока
                </span>
              </summary>
              <div className="border-t border-black/6 px-5 py-5">
                <p className="whitespace-pre-line text-sm leading-7 text-black/62">
                  {transcript}
                </p>
              </div>
            </details>
          ) : null}
        </PremiumCard>
      </div>

      <div className="space-y-6">
        <PremiumCard
          padding="lg"
          className="rounded-[2.3rem] border-black/6 bg-white/94 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
        >
          <SectionHeader
            eyebrow="Задание"
            title={assignment?.title ?? "Практическое задание"}
            description={
              assignment?.description ??
              "Автор еще не добавил задание, но место под практику уже готово."
            }
          />

          {assignment?.rubric.length ? (
            <div className="mt-6 space-y-3">
              {assignment.rubric.map((item) => (
                <div
                  key={item.criterion}
                  className="flex items-center justify-between gap-3 rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4"
                >
                  <div className="inline-flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-2xl bg-white text-[#3d3bff] shadow-sm">
                      <Target className="size-4" />
                    </div>
                    <span className="text-sm font-medium text-black">
                      {item.criterion}
                    </span>
                  </div>
                  <Badge variant="subtle">{item.points} баллов</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4 text-sm leading-7 text-black/56">
              Добавь через конструктор описание, рубрику и проходной балл, и этот блок
              сразу станет полноценной карточкой задания для ученика.
            </div>
          )}

          {assignment?.passingScore ? (
            <div className="mt-5 inline-flex rounded-full bg-[#eef0ff] px-4 py-3 text-sm font-medium text-[#3d3bff]">
              Проходной балл: {assignment.passingScore}%
            </div>
          ) : null}
        </PremiumCard>

        <PremiumCard
          padding="lg"
          className="rounded-[2.3rem] border-black/6 bg-white/94 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
        >
          <SectionHeader
            eyebrow="Чеклист"
            title="Что сделать после урока"
            description="Минимальный action plan, чтобы материал превращался в результат."
          />

          {checklistItems.length ? (
            <div className="mt-6 space-y-3">
              {checklistItems.map((item, index) => {
                const itemKey = `${item.text}-${index}`;
                const checked = Boolean(checkedMap[itemKey]);

                return (
                  <button
                    key={itemKey}
                    type="button"
                    onClick={() =>
                      setCheckedMap((current) => ({
                        ...current,
                        [itemKey]: !current[itemKey],
                      }))
                    }
                    className={
                      checked
                        ? "flex w-full items-start gap-3 rounded-[1.4rem] border border-[#3d3bff]/18 bg-[#eef0ff] px-4 py-4 text-left transition duration-200"
                        : "flex w-full items-start gap-3 rounded-[1.4rem] border border-black/6 bg-[#fafbfd] px-4 py-4 text-left transition duration-200 hover:border-black/12 hover:bg-white"
                    }
                  >
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[#3d3bff] shadow-sm">
                      {checked ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <ClipboardCheck className="size-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">{item.text}</p>
                      <p className="mt-1 text-xs text-black/42">
                        {item.required ? "обязательно" : "опционально"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4 text-sm leading-7 text-black/56">
              Чеклист пока не добавлен для этого урока.
            </div>
          )}
        </PremiumCard>

        {quest ? (
          <PremiumCard
            padding="lg"
            className="overflow-hidden rounded-[2.3rem] border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.12),transparent_24%),white] shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="primary">Квест</Badge>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                  {quest.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-black/56">
                  {quest.description}
                </p>
              </div>

              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#3d3bff] shadow-sm">
                <Trophy className="size-5" />
              </div>
            </div>

            <div className="mt-6 inline-flex rounded-full bg-[#eef0ff] px-4 py-3 text-sm font-medium text-[#3d3bff]">
              +{quest.rewardPoints} очков за выполнение
            </div>
          </PremiumCard>
        ) : null}
      </div>
    </div>
  );
}
