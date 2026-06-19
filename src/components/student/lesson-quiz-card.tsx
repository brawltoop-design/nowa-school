"use client";

import { startTransition, useMemo, useState } from "react";
import { CheckCircle2, CircleHelp, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { slideUp } from "@/lib/motion";
import type { StudentLearningQuiz } from "@/server/student/queries";
import { submitStudentQuizScore } from "@/server/student/actions";

type LessonQuizCardProps = {
  courseId: string;
  lessonId: string;
  quiz: StudentLearningQuiz;
  initialScore: number | null;
  isAdminPreview: boolean;
};

export function LessonQuizCard({
  courseId,
  lessonId,
  quiz,
  initialScore,
  isAdminPreview,
}: LessonQuizCardProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(initialScore);
  const [message, setMessage] = useState<string | null>(
    initialScore !== null ? `Последний сохраненный score: ${initialScore}%` : null,
  );
  const [isPending, setIsPending] = useState(false);

  const scorableQuestions = useMemo(
    () =>
      quiz.questions.filter(
        (question) =>
          question.type === "multiple_choice" &&
          question.correctAnswerIndex !== null,
      ),
    [quiz.questions],
  );

  function calculateScore() {
    if (!scorableQuestions.length) {
      return 100;
    }

    const correctAnswers = scorableQuestions.reduce((count, question) => {
      return answers[question.id] === question.correctAnswerIndex ? count + 1 : count;
    }, 0);

    return Math.round((correctAnswers / scorableQuestions.length) * 100);
  }

  function handleSubmit() {
    const nextScore = calculateScore();
    setScore(nextScore);
    setMessage(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await submitStudentQuizScore({
        courseId,
        lessonId,
        score: nextScore,
      });

      setIsPending(false);
      setMessage(result.message);
      if (result.success && result.data) {
        setScore(result.data.score);
      }
    });
  }

  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
    >
      <PremiumCard
        padding="lg"
        className="rounded-[2.3rem] border-black/6 bg-white/94 shadow-[0_20px_70px_rgba(15,23,42,0.05)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="primary">Quiz</Badge>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
              {quiz.title}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-black/56">
              Аккуратная проверка понимания урока. Score сохраняется в прогресс, а
              за результат от 80% начисляется бонус +20 points.
            </p>
          </div>

          {score !== null ? (
            <div className="rounded-full bg-[#eef0ff] px-4 py-3 text-sm font-medium text-[#3d3bff]">
              Score {score}%
            </div>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          {quiz.questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-[1.8rem] border border-black/6 bg-[#fafbfd] p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#eef0ff] text-sm font-semibold text-[#3d3bff]">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-black">
                    {question.prompt}
                  </p>
                  <p className="mt-1 text-xs text-black/42">
                    {question.type === "multiple_choice"
                      ? "Выбери один вариант"
                      : "Рефлексия по уроку"}
                  </p>
                </div>
              </div>

              {question.type === "multiple_choice" ? (
                <div className="mt-4 grid gap-3">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex;

                    return (
                      <button
                        key={`${question.id}-${optionIndex}`}
                        type="button"
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: optionIndex,
                          }))
                        }
                        className={
                          selected
                            ? "rounded-[1.3rem] border border-[#3d3bff] bg-[#eef0ff] px-4 py-4 text-left text-sm font-medium text-black transition duration-200"
                            : "rounded-[1.3rem] border border-black/6 bg-white px-4 py-4 text-left text-sm font-medium text-black/72 transition duration-200 hover:border-black/12 hover:bg-[#f7f8fb]"
                        }
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4">
                  <Textarea
                    value={notes[question.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    placeholder="Коротко запиши свою мысль или вывод по уроку"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {message ? (
          <div className="mt-5 flex items-center gap-3 rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4 text-sm text-black/68">
            <Sparkles className="size-4 text-[#3d3bff]" />
            <span>{message}</span>
          </div>
        ) : null}

        {isAdminPreview ? (
          <div className="mt-6 flex items-center gap-3 rounded-[1.5rem] border border-black/6 bg-[#f8f9fb] px-4 py-4 text-sm text-black/62">
            <CircleHelp className="size-4 text-[#3d3bff]" />
            <span>В admin preview score не сохраняется.</span>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PremiumButton
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="h-12 px-6"
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 size-4" />
              )}
              {isPending ? "Сохраняем score..." : "Проверить тест"}
            </PremiumButton>

            <p className="text-sm text-black/46">
              Считаются только вопросы с выбором ответа.
            </p>
          </div>
        )}
      </PremiumCard>
    </motion.div>
  );
}
