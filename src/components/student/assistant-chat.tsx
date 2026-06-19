"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  Send,
  Shield,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { askStudentAssistantQuestion } from "@/server/student/actions";
import type { StudentAssistantMessage } from "@/server/student/queries";

type AssistantChatProps = {
  courseId: string;
  courseTitle: string;
  initialMessages: StudentAssistantMessage[];
  suggestedQuestions: string[];
  variant?: "page" | "dock";
  className?: string;
  onClose?: () => void;
};

type LocalMessage = StudentAssistantMessage & {
  pending?: boolean;
};

export function AssistantChat({
  courseId,
  courseTitle,
  initialMessages,
  suggestedQuestions,
  variant = "page",
  className,
  onClose,
}: AssistantChatProps) {
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isPending]);

  function submitQuestion(overrideQuestion?: string) {
    const nextQuestion = (overrideQuestion ?? input).trim();

    if (!nextQuestion || isPending) {
      return;
    }

    const temporaryUserMessage: LocalMessage = {
      id: `pending-${Date.now()}`,
      role: "USER",
      content: nextQuestion,
      createdAtIso: new Date().toISOString(),
      createdAtLabel: "Сейчас",
      pending: true,
    };

    setError(null);
    setIsPending(true);
    setInput("");
    setMessages((current) => [...current, temporaryUserMessage]);

    startTransition(async () => {
      const result = await askStudentAssistantQuestion({
        courseId,
        question: nextQuestion,
      });

      setIsPending(false);
      setMessages((current) => {
        const withoutPending = current.filter(
          (message) => message.id !== temporaryUserMessage.id,
        );

        if (!result.data) {
          return withoutPending;
        }

        return [
          ...withoutPending,
          result.data.userMessage,
          result.data.assistantMessage,
        ];
      });

      if (!result.success) {
        setError(result.message);
      }
    });
  }

  const isDock = variant === "dock";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(71,183,255,0.08),transparent_24%),rgba(255,255,255,0.94)] backdrop-blur-xl",
        isDock
          ? "h-full rounded-[2.3rem] shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
          : "h-[min(76vh,860px)] rounded-[2.6rem] shadow-[0_26px_90px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b border-black/6",
          isDock ? "px-5 py-5" : "px-6 py-6 sm:px-8",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">AI assistant</Badge>
              <Badge variant="subtle">Только по материалам курса</Badge>
            </div>
            <h2
              className={cn(
                "mt-4 font-semibold tracking-tight text-black",
                isDock ? "text-2xl" : "text-3xl",
              )}
            >
              AI-наставник по курсу
            </h2>
            <p
              className={cn(
                "mt-3 text-sm leading-7 text-black/56",
                isDock ? "max-w-sm" : "max-w-3xl",
              )}
            >
              Задавай вопросы по {courseTitle}. Assistant отвечает только на основе
              уроков, транскриптов, summary и текста курса.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div
              className={cn(
                "rounded-[1.6rem] border border-black/6 bg-white/72 text-sm text-black/54",
                isDock ? "px-3.5 py-3.5" : "px-4 py-4",
              )}
            >
              <div className="flex items-center gap-2 font-medium text-black">
                <Shield className="size-4 text-[#3d3bff]" />
                Context-locked
              </div>
              <p className={cn("mt-2 leading-6", isDock ? "max-w-40" : "max-w-48")}>
                Если ответа нет в материалах, assistant честно скажет об этом.
              </p>
            </div>

            {isDock && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex size-11 items-center justify-center rounded-full border border-black/6 bg-white/76 text-black/56 transition duration-200 hover:border-black/12 hover:bg-white hover:text-black"
                aria-label="Скрыть AI-наставника"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={cn(
          "min-h-0 flex-1 space-y-5 overflow-y-auto",
          isDock ? "px-5 py-5" : "px-6 py-6 sm:px-8",
        )}
      >
        {!messages.length && !isPending ? (
          <div className="space-y-5">
            <EmptyState
              icon={Bot}
              title="Чат готов к первому вопросу"
              description="Спроси про ключевые идеи курса, связи между модулями, важные термины или что стоит закрепить перед следующим уроком."
            />

            <div className="flex flex-wrap gap-3">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => setInput(question)}
                  className="rounded-full border border-black/8 bg-white/78 px-4 py-3 text-sm font-medium text-black/70 transition duration-200 hover:border-black/14 hover:bg-white"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isAssistant = message.role === "ASSISTANT";

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className={cn(
                  "flex w-full",
                  isAssistant ? "justify-start" : "justify-end",
                )}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-[2rem] px-5 py-4 sm:max-w-[78%]",
                    isAssistant
                      ? "border border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.1),transparent_22%),#f7f8fd] text-black shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
                      : "bg-black text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full",
                        isAssistant
                          ? "bg-white text-[#3d3bff]"
                          : "bg-white/10 text-white",
                      )}
                    >
                      {isAssistant ? (
                        <Sparkles className="size-4" />
                      ) : (
                        <WandSparkles className="size-4" />
                      )}
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-xs font-medium uppercase tracking-[0.14em]",
                          isAssistant ? "text-black/40" : "text-white/52",
                        )}
                      >
                        {isAssistant ? "AI наставник" : "Вы"}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          isAssistant ? "text-black/42" : "text-white/48",
                        )}
                      >
                        {message.createdAtLabel}
                      </p>
                    </div>
                  </div>

                  <p
                    className={cn(
                      "mt-4 whitespace-pre-line text-sm leading-7 sm:text-[15px]",
                      isAssistant ? "text-black/72" : "text-white/86",
                    )}
                  >
                    {message.content}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isPending ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="flex justify-start"
          >
            <div className="max-w-[78%] rounded-[2rem] border border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.1),transparent_22%),#f7f8fd] px-5 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-white text-[#3d3bff]">
                  <Loader2 className="size-4 animate-spin" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-black/40">
                    AI наставник
                  </p>
                  <p className="text-xs text-black/42">Собирает ответ...</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#3d3bff]/35 animate-pulse" />
                <span className="size-2 rounded-full bg-[#3d3bff]/45 animate-pulse [animation-delay:120ms]" />
                <span className="size-2 rounded-full bg-[#3d3bff]/55 animate-pulse [animation-delay:240ms]" />
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-black/6 bg-white/72 backdrop-blur-xl",
          isDock ? "px-5 py-5" : "px-6 py-5 sm:px-8",
        )}
      >
        {error ? (
          <div className="mb-4 rounded-[1.6rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            {error}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-2">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              disabled={isPending}
              onClick={() => submitQuestion(question)}
              className="rounded-full bg-[#f3f4f8] px-4 py-2.5 text-sm text-black/58 transition duration-200 hover:bg-[#eceef6] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {question}
            </button>
          ))}
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                submitQuestion();
              }
            }}
            placeholder="Спроси про урок, модуль, термин или попроси короткую выжимку по курсу"
            className={cn(
              "border-0 bg-transparent px-2 py-2 text-[15px] shadow-none focus:ring-0",
              isDock ? "min-h-[92px]" : "min-h-[108px]",
            )}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-black/42">
              Assistant отвечает только на основе материалов курса. Быстрая отправка:
              `Ctrl/Cmd + Enter`.
            </p>

            <PremiumButton
              type="button"
              onClick={() => submitQuestion()}
              disabled={isPending || !input.trim()}
              className="h-12 px-5"
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              {isPending ? "Думает..." : "Отправить"}
            </PremiumButton>
          </div>
        </div>
      </div>
    </div>
  );
}
