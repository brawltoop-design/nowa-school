import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  MessageSquareText,
  Shield,
  Sparkles,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AssistantChat } from "@/components/student/assistant-chat";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { requireUserRole } from "@/server/auth/session";
import { getStudentAssistantData } from "@/server/student/queries";

type LearnAssistantPageProps = {
  params: Promise<{ courseId: string }>;
};

const suggestedQuestions = [
  "Что главное в этом курсе?",
  "Сделай короткую выжимку по материалам курса",
  "Какие термины нужно запомнить в первую очередь?",
  "Что стоит закрепить перед следующим уроком?",
];

export default async function LearnAssistantPage({
  params,
}: LearnAssistantPageProps) {
  const { courseId } = await params;
  const session = await requireUserRole(["STUDENT"], `/learn/${courseId}/assistant`);
  const result = await getStudentAssistantData(courseId, {
    userId: session.user.id,
    role: session.user.role,
  });

  if (result.status === "forbidden") {
    redirect("/forbidden");
  }

  if (result.status === "not_found") {
    notFound();
  }

  const { course, messages } = result.data;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Кабинет ученика", href: "/learn" },
          { label: course.title, href: `/learn/${course.id}` },
          { label: "AI-наставник" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <aside className="space-y-4 xl:sticky xl:top-28">
          <PremiumCard
            padding="lg"
            className="overflow-hidden rounded-[2.5rem] border-black/6 bg-white/94 shadow-[0_22px_70px_rgba(15,23,42,0.06)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(71,183,255,0.08),transparent_24%)]" />
            <div className="relative">
              <Link
                href={`/learn/${course.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-black/48 transition duration-200 hover:text-black"
              >
                <ArrowLeft className="size-4" />
                Назад к курсу
              </Link>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge variant="primary">AI assistant</Badge>
                <Badge variant="subtle">{course.category}</Badge>
                <Badge variant="subtle">{course.level}</Badge>
              </div>

              <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-black">
                AI-наставник по курсу
              </h1>
              <p className="mt-3 text-sm leading-7 text-black/56">
                {course.title}. Assistant отвечает только на основе описания курса,
                lesson content, transcript и AI-summary.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4">
                  <p className="text-xs text-black/42">Уроки</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                    {course.metrics.lessonCount}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4">
                  <p className="text-xs text-black/42">Прогресс</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                    {course.metrics.progressPercent}%
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4">
                  <p className="text-xs text-black/42">Сообщения</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                    {course.metrics.messageCount}
                  </p>
                </div>
              </div>

              <PremiumButton asChild className="mt-6 h-12 w-full">
                <Link href={`/learn/${course.id}`}>
                  <BookOpen className="mr-2 size-4" />
                  Вернуться к урокам
                </Link>
              </PremiumButton>
            </div>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] border-black/6 bg-white/94 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
          >
            <SectionHeader
              eyebrow="Как спрашивать"
              title="Получай точные ответы"
              description="Лучше всего работают вопросы по конкретному уроку, модулю, термину или практическому шагу."
            />

            <div className="mt-6 space-y-3">
              {[
                {
                  icon: Bot,
                  title: "Проси объяснить простыми словами",
                  text: "Например: объясни разницу между двумя подходами из модуля.",
                },
                {
                  icon: Sparkles,
                  title: "Проси короткую выжимку",
                  text: "Assistant соберет recap только по уже загруженным материалам курса.",
                },
                {
                  icon: Shield,
                  title: "Без выдуманных фактов",
                  text: "Если в материалах нет ответа, ты сразу увидишь честный отказ.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.6rem] border border-black/6 bg-[#fafbfd] px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                      <item.icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-black/52">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>
        </aside>

        <div className="space-y-6">
          <PremiumCard
            padding="lg"
            className="overflow-hidden rounded-[2.5rem] border-black/6 bg-white/94 shadow-[0_22px_70px_rgba(15,23,42,0.06)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(71,183,255,0.08),transparent_22%)]" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge variant="subtle">Context stuffing MVP</Badge>
                  <h2 className="mt-4 text-[clamp(2.4rem,4vw,4.4rem)] font-semibold leading-[0.95] tracking-tight text-black">
                    Спроси про курс так, будто рядом лучший куратор.
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-black/58 sm:text-lg">
                    Assistant видит структуру курса, описания модулей и уроков,
                    contentText, transcript и AI-summary. Никаких внешних знаний,
                    только твой учебный контекст.
                  </p>
                </div>

                <div className="rounded-[2rem] border border-black/6 bg-[#f6f7fb] px-5 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#3d3bff] shadow-sm">
                      <MessageSquareText className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-black/36">
                        History
                      </p>
                      <p className="mt-1 text-xl font-semibold tracking-tight text-black">
                        {messages.length} сообщений
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PremiumCard>

          <AssistantChat
            courseId={course.id}
            courseTitle={course.title}
            initialMessages={messages}
            suggestedQuestions={suggestedQuestions}
          />
        </div>
      </div>
    </div>
  );
}
