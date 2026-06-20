"use client";

import { startTransition, useState } from "react";
import {
  Bot,
  CheckSquare,
  ClipboardCheck,
  FileQuestion,
  LoaderCircle,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  Assignment,
  Checklist,
  Quest,
  Quiz,
  QuizDifficulty,
} from "@/lib/ai/types";
import {
  assignmentSchema,
  checklistSchema,
  questSchema,
  quizSchema,
} from "@/lib/ai/types";
import type { CourseStudioData } from "@/server/sales-page/queries";
import {
  generateAuthorLessonAiContent,
  saveAuthorLessonPractice,
} from "@/server/author/actions";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModulePracticeCard } from "@/components/author/module-practice-card";

type PracticeModules = CourseStudioData["course"]["modules"];

function defaultQuiz(title: string): Quiz {
  return {
    title: `${title}: тест`,
    questions: [
      {
        question: "",
        options: ["", ""],
        correctAnswerIndex: 0,
        explanation: "",
        difficulty: "medium",
      },
    ],
  };
}

function defaultAssignment(title: string): Assignment {
  return {
    title: `Практика: ${title}`,
    description: "",
    rubric: [
      {
        criterion: "Качество результата",
        points: 10,
      },
    ],
  };
}

function defaultChecklist(): Checklist {
  return {
    items: [
      {
        text: "",
        required: true,
      },
    ],
  };
}

function defaultQuest(title: string): Quest {
  return {
    title: `${title}: мини-квест`,
    description: "",
    rewardPoints: 20,
  };
}

function coerceQuiz(value: unknown, lessonTitle: string) {
  return quizSchema.safeParse(value).success
    ? quizSchema.parse(value)
    : defaultQuiz(lessonTitle);
}

function coerceAssignment(value: unknown, lessonTitle: string) {
  return assignmentSchema.safeParse(value).success
    ? assignmentSchema.parse(value)
    : defaultAssignment(lessonTitle);
}

function coerceChecklist(value: unknown) {
  return checklistSchema.safeParse(value).success
    ? checklistSchema.parse(value)
    : defaultChecklist();
}

function coerceQuest(value: unknown, lessonTitle: string) {
  return questSchema.safeParse(value).success
    ? questSchema.parse(value)
    : defaultQuest(lessonTitle);
}

function PracticeToggle({
  label,
  active,
  icon: Icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: typeof FileQuestion;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#3d3bff] text-white shadow-[0_18px_50px_rgba(61,59,255,0.24)]"
          : "border border-black/8 bg-white text-black/62 hover:border-black/14 hover:bg-[#f7f8fb]"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

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
    <div className={`rounded-[1.5rem] border px-4 py-4 text-sm ${classes}`}>
      {message}
    </div>
  );
}

function PracticeLessonCard({
  moduleTitle,
  lesson,
}: {
  moduleTitle: string;
  lesson: PracticeModules[number]["lessons"][number];
}) {
  const router = useRouter();
  const [quizEnabled, setQuizEnabled] = useState(Boolean(lesson.quiz));
  const [assignmentEnabled, setAssignmentEnabled] = useState(
    Boolean(lesson.assignment),
  );
  const [checklistEnabled, setChecklistEnabled] = useState(
    Boolean(lesson.checklist),
  );
  const [questEnabled, setQuestEnabled] = useState(Boolean(lesson.quest));
  const [quiz, setQuiz] = useState<Quiz>(coerceQuiz(lesson.quiz, lesson.title));
  const [assignment, setAssignment] = useState<Assignment>(
    coerceAssignment(lesson.assignment, lesson.title),
  );
  const [checklist, setChecklist] = useState<Checklist>(
    coerceChecklist(lesson.checklist),
  );
  const [quest, setQuest] = useState<Quest>(coerceQuest(lesson.quest, lesson.title));
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const enabledCount = [
    quizEnabled,
    assignmentEnabled,
    checklistEnabled,
    questEnabled,
  ].filter(Boolean).length;

  const handleSave = () => {
    setFeedback(null);
    setIsSaving(true);

    startTransition(async () => {
      const result = await saveAuthorLessonPractice(lesson.id, {
        quiz: quizEnabled ? quiz : null,
        assignment: assignmentEnabled ? assignment : null,
        checklist: checklistEnabled ? checklist : null,
        quest: questEnabled ? quest : null,
      });

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

  const handleGenerate = () => {
    setFeedback(null);
    setIsGenerating(true);

    startTransition(async () => {
      const result = await generateAuthorLessonAiContent(lesson.id);

      if (!result.success) {
        setFeedback({ tone: "error", message: result.message });
        setIsGenerating(false);
        return;
      }

      setFeedback({ tone: "success", message: result.message });
      setIsGenerating(false);
      router.refresh();
    });
  };

  return (
    <PremiumCard
      padding="lg"
      className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="subtle">{moduleTitle}</Badge>
            <Badge variant="primary">Урок {lesson.order}</Badge>
            <Badge variant="subtle">{lesson.durationMinutes} мин</Badge>
            <Badge variant="subtle">{enabledCount} активных блока</Badge>
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
            {lesson.title}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-black/56">
            {lesson.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <PremiumButton
            type="button"
            tone="secondary"
            className="h-11 px-4"
            disabled={!lesson.transcript?.trim() || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Генерируем...
              </>
            ) : (
              <>
                <Bot className="mr-2 size-4" />
                Собрать из транскрипта
              </>
            )}
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
              "Сохранить практику"
            )}
          </PremiumButton>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <PracticeToggle
          label="Тест"
          active={quizEnabled}
          icon={FileQuestion}
          onClick={() => setQuizEnabled((value) => !value)}
        />
        <PracticeToggle
          label="Задание"
          active={assignmentEnabled}
          icon={ClipboardCheck}
          onClick={() => setAssignmentEnabled((value) => !value)}
        />
        <PracticeToggle
          label="Чек-лист"
          active={checklistEnabled}
          icon={CheckSquare}
          onClick={() => setChecklistEnabled((value) => !value)}
        />
        <PracticeToggle
          label="Квест"
          active={questEnabled}
          icon={Target}
          onClick={() => setQuestEnabled((value) => !value)}
        />
      </div>

      <div className="mt-6 space-y-5">
        {quizEnabled ? (
          <div className="rounded-[1.7rem] border border-black/8 bg-[#fafbff] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-black">Тест</p>
                <p className="mt-1 text-sm text-black/46">
                  Автор сам выбирает вопросы, варианты ответов и сложность.
                </p>
              </div>
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-10 px-4"
                onClick={() =>
                  setQuiz((current) => ({
                    ...current,
                    questions: [
                      ...current.questions,
                      {
                        question: "",
                        options: ["", ""],
                        correctAnswerIndex: 0,
                        explanation: "",
                        difficulty: "medium",
                      },
                    ],
                  }))
                }
              >
                <Plus className="mr-2 size-4" />
                Добавить вопрос
              </PremiumButton>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label>Название теста</Label>
                <Input
                  value={quiz.title}
                  onChange={(event) =>
                    setQuiz((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>

              {quiz.questions.map((question, index) => (
                <div
                  key={`question-${index}`}
                  className="rounded-[1.4rem] border border-black/8 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-black">
                      Вопрос {index + 1}
                    </p>
                    {quiz.questions.length > 1 ? (
                      <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center rounded-full border border-black/8 bg-white text-black/54 transition hover:border-black/14 hover:text-black"
                        onClick={() =>
                          setQuiz((current) => ({
                            ...current,
                            questions: current.questions.filter(
                              (_, questionIndex) => questionIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div className="space-y-2">
                      <Label>Вопрос</Label>
                      <Textarea
                        value={question.question}
                        className="min-h-[96px]"
                        onChange={(event) =>
                          setQuiz((current) => ({
                            ...current,
                            questions: current.questions.map((entry, questionIndex) =>
                              questionIndex === index
                                ? { ...entry, question: event.target.value }
                                : entry,
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={`question-${index}-option-${optionIndex}`} className="space-y-2">
                          <Label>Вариант {optionIndex + 1}</Label>
                          <Input
                            value={option}
                            onChange={(event) =>
                              setQuiz((current) => ({
                                ...current,
                                questions: current.questions.map((entry, questionIndex) =>
                                  questionIndex === index
                                    ? {
                                        ...entry,
                                        options: entry.options.map(
                                          (currentOption, currentOptionIndex) =>
                                            currentOptionIndex === optionIndex
                                              ? event.target.value
                                              : currentOption,
                                        ),
                                      }
                                    : entry,
                                ),
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <PremiumButton
                        type="button"
                        tone="secondary"
                        className="h-10 px-4"
                        onClick={() =>
                          setQuiz((current) => ({
                            ...current,
                            questions: current.questions.map((entry, questionIndex) =>
                              questionIndex === index
                                ? {
                                    ...entry,
                                    options: [...entry.options, ""],
                                  }
                                : entry,
                            ),
                          }))
                        }
                      >
                        <Plus className="mr-2 size-4" />
                        Добавить вариант
                      </PremiumButton>

                      {question.options.length > 2 ? (
                        <PremiumButton
                          type="button"
                          tone="secondary"
                          className="h-10 px-4"
                          onClick={() =>
                            setQuiz((current) => ({
                              ...current,
                              questions: current.questions.map((entry, questionIndex) =>
                                questionIndex === index
                                  ? {
                                      ...entry,
                                      options: entry.options.slice(0, -1),
                                      correctAnswerIndex: Math.min(
                                        entry.correctAnswerIndex,
                                        entry.options.length - 2,
                                      ),
                                    }
                                  : entry,
                              ),
                            }))
                          }
                        >
                          Удалить вариант
                        </PremiumButton>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Индекс правильного ответа</Label>
                        <Input
                          type="number"
                          min="0"
                          max={Math.max(question.options.length - 1, 0)}
                          value={question.correctAnswerIndex}
                          onChange={(event) =>
                            setQuiz((current) => ({
                              ...current,
                              questions: current.questions.map((entry, questionIndex) =>
                                questionIndex === index
                                  ? {
                                      ...entry,
                                      correctAnswerIndex: Math.max(
                                        0,
                                        Number(event.target.value) || 0,
                                      ),
                                    }
                                  : entry,
                              ),
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Difficulty</Label>
                        <select
                          value={question.difficulty}
                          onChange={(event) =>
                            setQuiz((current) => ({
                              ...current,
                              questions: current.questions.map((entry, questionIndex) =>
                                questionIndex === index
                                  ? {
                                      ...entry,
                                      difficulty:
                                        event.target.value as QuizDifficulty,
                                    }
                                  : entry,
                              ),
                            }))
                          }
                          className="premium-select"
                        >
                          <option value="easy">easy</option>
                          <option value="medium">medium</option>
                          <option value="hard">hard</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Explanation</Label>
                      <Textarea
                        value={question.explanation}
                        className="min-h-[96px]"
                        onChange={(event) =>
                          setQuiz((current) => ({
                            ...current,
                            questions: current.questions.map((entry, questionIndex) =>
                              questionIndex === index
                                ? { ...entry, explanation: event.target.value }
                                : entry,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {assignmentEnabled ? (
          <div className="rounded-[1.7rem] border border-black/8 bg-[#fafbff] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-black">Assignment</p>
                <p className="mt-1 text-sm text-black/46">
                  Домашка или practical task именно для этого видео.
                </p>
              </div>
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-10 px-4"
                onClick={() =>
                  setAssignment((current) => ({
                    ...current,
                    rubric: [
                      ...current.rubric,
                      { criterion: "", points: 10 },
                    ],
                  }))
                }
              >
                <Plus className="mr-2 size-4" />
                Add criterion
              </PremiumButton>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="space-y-2">
                <Label>Assignment title</Label>
                <Input
                  value={assignment.title}
                  onChange={(event) =>
                    setAssignment((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={assignment.description}
                  className="min-h-[140px]"
                  onChange={(event) =>
                    setAssignment((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-3">
                {assignment.rubric.map((item, index) => (
                  <div
                    key={`rubric-${index}`}
                    className="grid gap-3 rounded-[1.3rem] border border-black/8 bg-white p-4 md:grid-cols-[minmax(0,1fr)_120px_44px]"
                  >
                    <Input
                      value={item.criterion}
                      placeholder="Критерий оценки"
                      onChange={(event) =>
                        setAssignment((current) => ({
                          ...current,
                          rubric: current.rubric.map((entry, rubricIndex) =>
                            rubricIndex === index
                              ? { ...entry, criterion: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                    />
                    <Input
                      type="number"
                      min="0"
                      value={item.points}
                      onChange={(event) =>
                        setAssignment((current) => ({
                          ...current,
                          rubric: current.rubric.map((entry, rubricIndex) =>
                            rubricIndex === index
                              ? {
                                  ...entry,
                                  points: Math.max(
                                    0,
                                    Number(event.target.value) || 0,
                                  ),
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                    {assignment.rubric.length > 1 ? (
                      <button
                        type="button"
                        className="inline-flex size-11 items-center justify-center rounded-full border border-black/8 bg-white text-black/54 transition hover:border-black/14 hover:text-black"
                        onClick={() =>
                          setAssignment((current) => ({
                            ...current,
                            rubric: current.rubric.filter(
                              (_, rubricIndex) => rubricIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {checklistEnabled ? (
          <div className="rounded-[1.7rem] border border-black/8 bg-[#fafbff] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-black">Checklist</p>
                <p className="mt-1 text-sm text-black/46">
                  Шаги, которые студент проходит по ходу урока.
                </p>
              </div>
              <PremiumButton
                type="button"
                tone="secondary"
                className="h-10 px-4"
                onClick={() =>
                  setChecklist((current) => ({
                    ...current,
                    items: [...current.items, { text: "", required: true }],
                  }))
                }
              >
                <Plus className="mr-2 size-4" />
                Add step
              </PremiumButton>
            </div>

            <div className="mt-5 space-y-3">
              {checklist.items.map((item, index) => (
                <div
                  key={`checklist-${index}`}
                  className="grid gap-3 rounded-[1.3rem] border border-black/8 bg-white p-4 md:grid-cols-[minmax(0,1fr)_140px_44px]"
                >
                  <Input
                    value={item.text}
                    placeholder="Шаг checklist"
                    onChange={(event) =>
                      setChecklist((current) => ({
                        ...current,
                        items: current.items.map((entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, text: event.target.value }
                            : entry,
                        ),
                      }))
                    }
                  />
                  <select
                    value={item.required ? "required" : "optional"}
                    onChange={(event) =>
                      setChecklist((current) => ({
                        ...current,
                        items: current.items.map((entry, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...entry,
                                required: event.target.value === "required",
                              }
                            : entry,
                        ),
                      }))
                    }
                    className="premium-select"
                  >
                    <option value="required">обязательно</option>
                    <option value="optional">необязательно</option>
                  </select>
                  {checklist.items.length > 1 ? (
                    <button
                      type="button"
                      className="inline-flex size-11 items-center justify-center rounded-full border border-black/8 bg-white text-black/54 transition hover:border-black/14 hover:text-black"
                      onClick={() =>
                        setChecklist((current) => ({
                          ...current,
                          items: current.items.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {questEnabled ? (
          <div className="rounded-[1.7rem] border border-black/8 bg-[#fafbff] p-5">
            <div>
              <p className="text-sm font-medium text-black">Квест</p>
              <p className="mt-1 text-sm text-black/46">
                Игровая задача и награда за выполнение урока.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Название квеста</Label>
                <Input
                  value={quest.title}
                  onChange={(event) =>
                    setQuest((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Описание</Label>
                <Textarea
                  value={quest.description}
                  className="min-h-[140px]"
                  onChange={(event) =>
                    setQuest((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Награда в очках</Label>
                <Input
                  type="number"
                  min="0"
                  value={quest.rewardPoints}
                  onChange={(event) =>
                    setQuest((current) => ({
                      ...current,
                      rewardPoints: Math.max(
                        0,
                        Number(event.target.value) || 0,
                      ),
                    }))
                  }
                />
              </div>
            </div>
          </div>
        ) : null}

        {!quizEnabled &&
        !assignmentEnabled &&
        !checklistEnabled &&
        !questEnabled ? (
          <Notice message="Для этого урока пока не выбран ни один практический блок. Включи нужные форматы сверху и сохрани изменения." />
        ) : null}

        {!lesson.transcript?.trim() ? (
          <Notice
            tone="default"
            message="У урока пока нет транскрипта. Ты можешь собрать задания вручную прямо здесь, либо сначала открыть раздел уроков и запустить AI-генерацию после транскрибации."
          />
        ) : null}

        {feedback ? (
          <Notice message={feedback.message} tone={feedback.tone} />
        ) : null}
      </div>
    </PremiumCard>
  );
}

export function LessonPracticeStudio({ modules }: { modules: PracticeModules }) {
  const lessonsCount = modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Практика"
        title="Задания модуля и практика для каждого видео"
        description="Здесь автор решает, чем заканчивается модуль и какие именно форматы практики нужны каждому уроку: проект модуля, тест, задание, чек-лист или квест."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
          <FileQuestion className="size-5 text-[#3d3bff]" />
          <p className="mt-4 text-2xl font-semibold tracking-tight text-black">
            {lessonsCount}
          </p>
          <p className="mt-2 text-sm leading-7 text-black/56">
            уроков доступны для ручной настройки практического слоя
          </p>
        </PremiumCard>
        <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
          <ClipboardCheck className="size-5 text-[#3d3bff]" />
          <p className="mt-4 text-2xl font-semibold tracking-tight text-black">
            5 форматов
          </p>
          <p className="mt-2 text-sm leading-7 text-black/56">
            задание модуля плюс тест, задание, чек-лист и квест на выбор для
            каждого этапа обучения
          </p>
        </PremiumCard>
        <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
          <Sparkles className="size-5 text-[#3d3bff]" />
          <p className="mt-4 text-2xl font-semibold tracking-tight text-black">
            AI + manual
          </p>
          <p className="mt-2 text-sm leading-7 text-black/56">
            можно стартовать от транскрипта, а потом вручную переписать все под
            свой стиль подачи
          </p>
        </PremiumCard>
        <PremiumCard
          padding="lg"
          className="rounded-[2rem] border-transparent bg-black text-white"
        >
          <p className="text-sm text-white/56">Правило конструктора</p>
          <p className="mt-4 text-2xl font-semibold tracking-tight">
            Не все уроки одинаковые
          </p>
          <p className="mt-2 text-sm leading-7 text-white/66">
            Одному видео нужен только чек-лист, другому полноценная домашка.
            Выбирай слой практики под реальную задачу урока.
          </p>
        </PremiumCard>
      </div>

      {modules.length ? (
        <div className="space-y-6">
          {modules.map((module) => (
            <div key={module.id} className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="primary">Модуль {module.order}</Badge>
                <h2 className="text-2xl font-semibold tracking-tight text-black">
                  {module.title}
                </h2>
                <span className="text-sm text-black/42">
                  {module.lessons.length} уроков
                </span>
                {module.practice ? (
                  <Badge variant="subtle">задание модуля готово</Badge>
                ) : null}
              </div>

              <div className="space-y-5">
                <ModulePracticeCard module={module} />
                {module.lessons.map((lesson) => (
                  <PracticeLessonCard
                    key={lesson.id}
                    moduleTitle={module.title}
                    lesson={lesson}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <PremiumCard
          padding="lg"
          className="rounded-[2.3rem] bg-white/92 text-center"
        >
          <p className="text-lg font-semibold tracking-tight text-black">
            Сначала создай модуль и уроки
          </p>
          <p className="mt-3 text-sm leading-7 text-black/56">
            После появления уроков здесь можно будет включать и редактировать
            практический слой для каждого видео.
          </p>
        </PremiumCard>
      )}
    </div>
  );
}
