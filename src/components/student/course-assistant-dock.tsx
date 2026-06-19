"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { AssistantChat } from "@/components/student/assistant-chat";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudentAssistantMessage } from "@/server/student/queries";

type CourseAssistantDockProps = {
  courseId: string;
  courseTitle: string;
  initialMessages: StudentAssistantMessage[];
  suggestedQuestions: string[];
  children: ReactNode;
  enabled?: boolean;
};

function getAssistantDockStorageKey(courseId: string) {
  return `newschool:assistant-dock:${courseId}`;
}

export function CourseAssistantDock({
  courseId,
  courseTitle,
  initialMessages,
  suggestedQuestions,
  children,
  enabled = true,
}: CourseAssistantDockProps) {
  const storageKey = useMemo(
    () => getAssistantDockStorageKey(courseId),
    [courseId],
  );
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(storageKey);
    if (saved === "closed") {
      setIsOpen(false);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, isOpen ? "open" : "closed");
  }, [isOpen, storageKey]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="flex lg:hidden">
        <PremiumButton asChild tone="secondary" className="h-11">
          <Link href={`/learn/${courseId}/assistant`}>
            <Bot className="mr-2 size-4" />
            Открыть AI-чат
          </Link>
        </PremiumButton>
      </div>

      {!isOpen ? (
        <PremiumCard
          padding="md"
          className="hidden rounded-[2rem] border-dashed border-black/10 bg-white/80 lg:block"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="subtle">AI hidden</Badge>
                <p className="text-sm text-black/52">
                  Lesson screen сейчас в чистом full-focus режиме.
                </p>
              </div>
            </div>

            <PremiumButton
              type="button"
              onClick={() => setIsOpen(true)}
              className="h-11 px-5"
            >
              <Bot className="mr-2 size-4" />
              Вернуть AI-наставника
            </PremiumButton>
          </div>
        </PremiumCard>
      ) : null}

      <div
        className={cn(
          "grid gap-6",
          isOpen
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:items-start"
            : "grid-cols-1",
        )}
      >
        <div className="min-w-0 space-y-6">{children}</div>

        {isOpen ? (
          <aside className="hidden min-w-0 lg:block">
            <div className="sticky top-24 h-[calc(100vh-6.5rem)] min-h-[720px] max-h-[900px] min-w-0">
              <AssistantChat
                variant="dock"
                courseId={courseId}
                courseTitle={courseTitle}
                initialMessages={initialMessages}
                suggestedQuestions={suggestedQuestions}
                onClose={() => setIsOpen(false)}
                className="h-full min-h-0"
              />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
