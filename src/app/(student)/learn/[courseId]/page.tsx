import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bot,
  CheckCircle2,
  Clock3,
  PlayCircle,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AnimatedSection } from "@/components/premium/animated-section";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { CourseAssistantDock } from "@/components/student/course-assistant-dock";
import { LessonCompleteButton } from "@/components/student/lesson-complete-button";
import { LessonPracticeWorkspace } from "@/components/student/lesson-practice-workspace";
import { LessonQuizCard } from "@/components/student/lesson-quiz-card";
import { LessonVideoPlayer } from "@/components/student/lesson-video-player";
import { Badge } from "@/components/ui/badge";
import { formatDurationMinutes } from "@/lib/utils";
import { requireUserRole } from "@/server/auth/session";
import { completeStudentLesson } from "@/server/student/actions";
import {
  getStudentAssistantData,
  getStudentLearningData,
} from "@/server/student/queries";

type LearnCoursePageProps = {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getLessonParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function LearnCoursePage({
  params,
  searchParams,
}: LearnCoursePageProps) {
  const { courseId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedLessonId = getLessonParam(resolvedSearchParams.lesson);
  const session = await requireUserRole(["STUDENT", "ADMIN"], `/learn/${courseId}`);
  const result = await getStudentLearningData(courseId, {
    userId: session.user.id,
    role: session.user.role,
  });

  if (result.status === "forbidden") {
    redirect("/forbidden");
  }

  if (result.status === "not_found") {
    notFound();
  }

  const { course, enrollment, viewer } = result.data;
  const lessons = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      ...lesson,
      moduleId: module.id,
      moduleTitle: module.title,
      moduleOrder: module.order,
    })),
  );
  const currentLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ??
    lessons.find((lesson) => !lesson.completed) ??
    lessons[0];

  if (!currentLesson) {
    notFound();
  }

  const currentLessonIndex = lessons.findIndex(
    (lesson) => lesson.id === currentLesson.id,
  );
  const previousLesson =
    currentLessonIndex > 0 ? lessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < lessons.length - 1
      ? lessons[currentLessonIndex + 1]
      : null;
  const assistantResult =
    session.user.role === "STUDENT"
      ? await getStudentAssistantData(courseId, {
          userId: session.user.id,
          role: session.user.role,
        })
      : null;
  const assistantData = assistantResult?.status === "ok" ? assistantResult.data : null;
  const assistantQuestions = [
    `Коротко объясни урок "${currentLesson.title}"`,
    `Что главное в модуле "${currentLesson.moduleTitle}"?`,
    "Сделай выжимку того, что важно закрепить после этого урока",
    "Какие термины из этого урока стоит запомнить в первую очередь?",
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Кабинет ученика", href: "/learn" },
          { label: course.title },
        ]}
      />

      <CourseAssistantDock
          courseId={course.id}
          courseTitle={course.title}
          initialMessages={assistantData?.messages ?? []}
          suggestedQuestions={assistantQuestions}
          enabled={Boolean(assistantData) && !viewer.isAdminPreview}
        >
          <AnimatedSection
            key={currentLesson.id}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-center gap-3 text-sm text-black/52">
              <Badge variant="subtle">{currentLesson.moduleTitle}</Badge>
              <Badge variant="subtle">
                Урок {currentLessonIndex + 1} из {lessons.length}
              </Badge>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-4 py-3">
                <Clock3 className="size-4" />
                {formatDurationMinutes(currentLesson.durationMinutes)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-4 py-3">
                <Shield className="size-4" />
                Level {enrollment.level}
              </span>
              {currentLesson.completed ? (
                <Badge variant="primary">Завершен</Badge>
              ) : null}
              {typeof currentLesson.score === "number" ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#eef0ff] px-4 py-3 text-[#3d3bff]">
                  <Sparkles className="size-4" />
                  Quiz score {currentLesson.score}%
                </span>
              ) : null}
            </div>

            <LessonVideoPlayer
              title={currentLesson.title}
              description={currentLesson.description}
              moduleTitle={currentLesson.moduleTitle}
              lessonLabel={`Урок ${currentLessonIndex + 1} из ${lessons.length}`}
              durationMinutes={currentLesson.durationMinutes}
              videoUrl={currentLesson.videoUrl}
              coverUrl={course.coverUrl}
              hasTranscript={Boolean(currentLesson.transcript)}
              hasQuiz={Boolean(currentLesson.quiz)}
              hasAssignment={Boolean(currentLesson.assignment)}
            />

            <PremiumCard
              padding="lg"
              className="rounded-[2.3rem] border-black/6 bg-white/94 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
            >
              <SectionHeader
                eyebrow="Lesson content"
                title="Основной материал"
                description="Текст урока собран как аккуратный premium reading block без ощущения старой LMS."
              />

              <div className="mt-6 rounded-[2rem] border border-black/6 bg-[#fafbfd] px-6 py-6">
                <p className="whitespace-pre-line text-[15px] leading-8 text-black/72">
                  {currentLesson.contentText}
                </p>
              </div>
            </PremiumCard>

            <LessonPracticeWorkspace
              lessonId={currentLesson.id}
              aiSummary={currentLesson.aiSummary}
              transcript={currentLesson.transcript}
              assignment={currentLesson.assignment}
              checklist={currentLesson.checklist}
              quest={currentLesson.quest}
            />

            {currentLesson.quiz ? (
              <LessonQuizCard
                courseId={course.id}
                lessonId={currentLesson.id}
                quiz={currentLesson.quiz}
                initialScore={currentLesson.score}
                isAdminPreview={viewer.isAdminPreview}
              />
            ) : null}

            <PremiumCard
              padding="lg"
              className="rounded-[2.5rem] border-black/6 bg-white/94 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
            >
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div>
                  <SectionHeader
                    eyebrow="Progress action"
                    title="Закрой урок и двигайся дальше"
                    description="После завершения урока обновим progressPercent, points, level и streak прямо в enrollment."
                  />

                  {course.earnedBadges.length ? (
                    <div className="mt-6 flex flex-wrap gap-3">
                      {course.earnedBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-4 py-3 text-sm text-black/62"
                        >
                          <Trophy className="size-4 text-[#3d3bff]" />
                          <span>{badge.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                  {!viewer.isAdminPreview ? (
                    <>
                      <PremiumButton asChild tone="secondary" className="h-12 px-5">
                        <Link href={`/learn/${course.id}/certificate`}>
                          <Award className="mr-2 size-4" />
                          Сертификат
                        </Link>
                      </PremiumButton>
                      <PremiumButton asChild tone="secondary" className="h-12 px-5">
                        <Link href={`/learn/${course.id}/assistant`}>
                          <Bot className="mr-2 size-4" />
                          Полный AI-чат
                        </Link>
                      </PremiumButton>
                    </>
                  ) : null}

                  {previousLesson ? (
                    <PremiumButton asChild tone="secondary" className="h-12 px-5">
                      <Link href={`/learn/${course.id}?lesson=${previousLesson.id}`}>
                        <ArrowLeft className="mr-2 size-4" />
                        Предыдущий урок
                      </Link>
                    </PremiumButton>
                  ) : null}

                  {viewer.isAdminPreview ? (
                    <div className="rounded-full bg-[#f4f4f4] px-5 py-3 text-sm font-medium text-black/56">
                      В preview завершение отключено
                    </div>
                  ) : (
                    <form
                      action={completeStudentLesson.bind(
                        null,
                        course.id,
                        currentLesson.id,
                        nextLesson?.id ?? currentLesson.id,
                      )}
                    >
                      <LessonCompleteButton className="h-12 px-5" />
                    </form>
                  )}

                  {nextLesson ? (
                    <PremiumButton asChild tone="secondary" className="h-12 px-5">
                      <Link href={`/learn/${course.id}?lesson=${nextLesson.id}`}>
                        Следующий урок
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </PremiumButton>
                  ) : null}
                </div>
              </div>
            </PremiumCard>

            {course.coverUrl ? (
              <div className="overflow-hidden rounded-[2.3rem] border border-black/6 bg-white">
                <Image
                  src={course.coverUrl}
                  alt={course.title}
                  width={1440}
                  height={960}
                  unoptimized
                  className="h-72 w-full object-cover"
                />
              </div>
            ) : null}
          </AnimatedSection>

        </CourseAssistantDock>

      <PremiumCard
        padding="lg"
        className="overflow-hidden rounded-[2.5rem] border-black/6 bg-white/94 shadow-[0_22px_70px_rgba(15,23,42,0.06)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(71,183,255,0.08),transparent_26%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 text-sm font-medium text-black/48 transition duration-200 hover:text-black"
              >
                <ArrowLeft className="size-4" />
                Назад к курсам
              </Link>

              <h1 className="mt-5 text-[clamp(2.1rem,4vw,3.6rem)] font-semibold leading-[0.98] tracking-tight text-black">
                {course.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-black/56 sm:text-[15px]">
                {course.description}
              </p>
            </div>

            {!viewer.isAdminPreview ? (
              <PremiumButton asChild tone="secondary" className="h-12 shrink-0 px-5">
                <Link href={`/learn/${course.id}/assistant`}>
                  <Bot className="mr-2 size-4" />
                  Полный AI-чат
                </Link>
              </PremiumButton>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="subtle">{course.category}</Badge>
            <Badge variant="subtle">{course.level}</Badge>
            <Badge variant="subtle">{course.language}</Badge>
            {viewer.isAdminPreview ? (
              <Badge variant="primary">Admin preview</Badge>
            ) : null}
          </div>

          <div className="mt-6 h-3 rounded-full bg-black/6">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#3d3bff_0%,#77dbe7_100%)]"
              style={{ width: `${enrollment.progressPercent}%` }}
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4">
              <p className="text-xs text-black/42">Points</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                {enrollment.points}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4">
              <p className="text-xs text-black/42">Level</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                {enrollment.level}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#f6f7fa] px-4 py-4">
              <p className="text-xs text-black/42">Streak</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                {enrollment.streakDays}
              </p>
            </div>
          </div>
        </div>
      </PremiumCard>

      <PremiumCard
        padding="lg"
        className="rounded-[2.3rem] border-black/6 bg-white/94 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
      >
        <SectionHeader
          eyebrow="Программа"
          title="Модули и уроки"
          description="Весь путь по курсу с быстрым переходом к следующему уроку."
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {course.modules.map((module) => (
            <div key={module.id} className="space-y-3 rounded-[2rem] border border-black/6 bg-[#fafbfd] p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/34">
                  Модуль {module.order}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-black">
                  {module.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-black/54">
                  {module.description}
                </p>
              </div>

              <div className="space-y-2">
                {module.lessons.map((lesson) => {
                  const isActive = lesson.id === currentLesson.id;

                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/${course.id}?lesson=${lesson.id}`}
                      className={
                        isActive
                          ? "flex items-center justify-between gap-3 rounded-[1.5rem] border border-[#3d3bff] bg-[#eef0ff] px-4 py-4 transition duration-200"
                          : "flex items-center justify-between gap-3 rounded-[1.5rem] border border-black/6 bg-white px-4 py-4 transition duration-200 hover:border-black/10 hover:bg-[#fcfcfd]"
                      }
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-black">
                          {lesson.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black/42">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5" />
                            {formatDurationMinutes(lesson.durationMinutes)}
                          </span>
                          {typeof lesson.score === "number" ? (
                            <span>Score {lesson.score}%</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {lesson.completed ? (
                          <div className="flex size-9 items-center justify-center rounded-full bg-[#eaf8ee] text-[#15803d]">
                            <CheckCircle2 className="size-4" />
                          </div>
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded-full bg-black/6 text-black/36">
                            <PlayCircle className="size-4" />
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PremiumCard>

      <PremiumCard
        padding="lg"
        className="rounded-[2.3rem] border-black/6 bg-white/94 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
      >
        <SectionHeader
          eyebrow="Course rewards"
          title="Бейджи и milestones"
          description="Собранные и будущие награды по курсу."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {course.badges.map((badge) => {
            const earned = course.earnedBadges.some((item) => item.id === badge.id);

            return (
              <div
                key={badge.id}
                className={
                  earned
                    ? "rounded-[1.7rem] border border-[#3d3bff]/18 bg-[#eef0ff] px-5 py-5"
                    : "rounded-[1.7rem] border border-black/6 bg-[#fafbfd] px-5 py-5"
                }
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#3d3bff] shadow-sm">
                    <Trophy className="size-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-black">
                        {badge.title}
                      </h3>
                      {earned ? <Badge variant="primary">Получен</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-black/56">
                      {badge.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PremiumCard>
    </div>
  );
}
