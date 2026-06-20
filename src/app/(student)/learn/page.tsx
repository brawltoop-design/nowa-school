import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Award,
  BookOpen,
  Bot,
  Clock3,
  Flame,
  Layers3,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { StatCard } from "@/components/premium/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, formatDurationMinutes } from "@/lib/utils";
import { getServerAuthSession } from "@/server/auth/session";
import { getStudentDashboardData } from "@/server/student/queries";

export default async function LearnPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return null;
  }

  const data = await getStudentDashboardData({
    userId: session.user.id,
    role: session.user.role,
  });
  const activeCourse = data.courses[0];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Обучение" }]} />

      <SectionHeader
        eyebrow="Learning"
        title="Премиальный кабинет ученика"
        description="Купленные программы, прогресс, очки, уровень и последние шаги собраны в одном спокойном learning workspace."
        action={
          <PremiumButton asChild>
            <Link href="/courses">Смотреть каталог</Link>
          </PremiumButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <PremiumCard
          padding="lg"
          className="overflow-hidden rounded-[2.8rem] border-black/6 bg-white/94 shadow-[0_26px_100px_rgba(15,23,42,0.06)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(71,183,255,0.08),transparent_26%)]" />

          <div className="relative">
            <p className="text-sm text-black/42">Текущий фокус</p>
            <h1 className="mt-3 max-w-4xl text-[clamp(2.7rem,5vw,4.8rem)] font-semibold leading-[0.95] tracking-tight text-black">
              {activeCourse ? activeCourse.title : "Кабинет готов к первой покупке"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-black/58 sm:text-lg">
              {activeCourse
                ? "Продолжай курс с того места, где остановился. Прогресс, очки и последние уроки уже связаны с реальным доступом."
                : "После первой покупки здесь сразу появятся уроки, бейджи, прогресс и плавный переход в обучение."}
            </p>

            {activeCourse ? (
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.8rem] bg-[#f6f7fa] px-5 py-5">
                  <p className="text-sm text-black/42">Прогресс</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
                    {activeCourse.progressPercent}%
                  </p>
                  <div className="mt-4 h-2.5 rounded-full bg-black/6">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#3d3bff_0%,#77dbe7_100%)]"
                      style={{ width: `${activeCourse.progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-[1.8rem] bg-[#f6f7fa] px-5 py-5">
                  <p className="text-sm text-black/42">Уроки</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
                    {activeCourse.completedLessons}/{activeCourse.lessonCount}
                  </p>
                  <p className="mt-2 text-sm text-black/48">
                    {formatDurationMinutes(activeCourse.durationMinutes)}
                  </p>
                </div>
                <div className="rounded-[1.8rem] bg-[#f6f7fa] px-5 py-5">
                  <p className="text-sm text-black/42">Следующий шаг</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
                    Продолжить
                  </p>
                  <PremiumButton asChild className="mt-4 h-11 w-full">
                    <Link
                      href={
                        activeCourse.nextLessonId
                          ? `/learn/${activeCourse.courseId}?lesson=${activeCourse.nextLessonId}`
                          : `/learn/${activeCourse.courseId}`
                      }
                    >
                      Открыть курс
                    </Link>
                  </PremiumButton>
                </div>
              </div>
            ) : null}

            {activeCourse ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <PremiumButton asChild className="h-12 px-5">
                  <Link
                    href={
                      activeCourse.nextLessonId
                        ? `/learn/${activeCourse.courseId}?lesson=${activeCourse.nextLessonId}`
                        : `/learn/${activeCourse.courseId}`
                    }
                  >
                    Продолжить обучение
                  </Link>
                </PremiumButton>
                <PremiumButton asChild tone="secondary" className="h-12 px-5">
                  <Link href={`/learn/${activeCourse.courseId}/assistant`}>
                    <Bot className="mr-2 size-4" />
                    AI-наставник
                  </Link>
                </PremiumButton>
              </div>
            ) : null}
          </div>
        </PremiumCard>

        <div className="space-y-4">
          <PremiumCard padding="lg" className="rounded-[2.3rem] border-transparent bg-black text-white">
            <p className="text-sm text-white/56">Общий уровень</p>
            <p className="mt-3 text-5xl font-semibold tracking-tight">
              {data.metrics.currentLevel}
            </p>
            <p className="mt-3 text-sm leading-7 text-white/70">
              рассчитывается как `floor(очков / 100) + 1`
            </p>
          </PremiumCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92 backdrop-blur-xl">
              <p className="text-sm text-black/42">Очки</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
                {formatCompactNumber(data.metrics.totalPoints)}
              </p>
            </PremiumCard>
            <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92 backdrop-blur-xl">
              <p className="text-sm text-black/42">Серия</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
                {data.metrics.currentStreakDays}
              </p>
            </PremiumCard>
          </div>
        </div>
      </div>

      <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Курсы"
          value={String(data.metrics.totalCourses)}
          description="купленных программ"
        />
        <StatCard
          icon={Target}
          label="Завершено"
          value={String(data.metrics.completedLessons)}
          description="уроков пройдено"
        />
        <StatCard
          icon={Award}
          label="Очки"
          value={formatCompactNumber(data.metrics.totalPoints)}
          description="очки вовлечения"
        />
        <StatCard
          icon={Flame}
          label="Серия"
          value={`${data.metrics.currentStreakDays} дн`}
          description="лучшая серия"
        />
      </StaggerGrid>

      {data.courses.length ? (
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Мои курсы"
            title="Купленные программы"
            description="Каждый курс открывается как аккуратный учебный маршрут со своим прогрессом, очками и следующим уроком."
          />

          <StaggerGrid className="grid gap-5 lg:grid-cols-2">
            {data.courses.map((course) => (
              <PremiumCard
                key={course.enrollmentId}
                padding="lg"
                className="rounded-[2.2rem] border-black/6 bg-white/94 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="subtle">{course.category}</Badge>
                      <Badge variant="subtle">{course.level}</Badge>
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                      {course.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-black/56">
                      {course.description}
                    </p>
                  </div>
                  <div className="rounded-full bg-[#eef0ff] px-4 py-3 text-sm font-medium text-[#3d3bff]">
                    {course.progressPercent}%
                  </div>
                </div>

                <div className="mt-6 h-2.5 rounded-full bg-black/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#3d3bff_0%,#77dbe7_100%)]"
                    style={{ width: `${course.progressPercent}%` }}
                  />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Уроки</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.completedLessons}/{course.lessonCount}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Время</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {formatDurationMinutes(course.durationMinutes)}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Очки</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.points}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Серия</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.streakDays}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-4 py-3 text-sm text-black/62">
                    <Sparkles className="size-4 text-[#3d3bff]" />
                    <span>{course.authorName}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <PremiumButton asChild tone="secondary" className="h-12 px-5">
                      <Link href={`/learn/${course.courseId}/assistant`}>
                        <Bot className="mr-2 size-4" />
                        AI-наставник
                      </Link>
                    </PremiumButton>
                    <PremiumButton asChild className="h-12 px-5">
                      <Link
                        href={
                          course.nextLessonId
                            ? `/learn/${course.courseId}?lesson=${course.nextLessonId}`
                            : `/learn/${course.courseId}`
                        }
                      >
                        Продолжить
                      </Link>
                    </PremiumButton>
                  </div>
                </div>
              </PremiumCard>
            ))}
          </StaggerGrid>
        </div>
      ) : (
        <EmptyState
          icon={Layers3}
          title="Пока нет купленных курсов"
          description="Открой каталог, купи первую программу и кабинет ученика сразу наполнится уроками, бейджами и прогрессом."
          action={
            <PremiumButton asChild tone="secondary">
              <Link href="/courses">Открыть каталог</Link>
            </PremiumButton>
          }
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94 backdrop-blur-xl">
          <SectionHeader
            eyebrow="Последние уроки"
            title="Последние уроки"
            description="Последние завершенные шаги по купленным программам."
          />

          {data.recentLessons.length ? (
            <div className="mt-6 space-y-3">
              {data.recentLessons.map((lesson) => (
                <Link
                  key={`${lesson.lessonId}-${lesson.completedAt.toISOString()}`}
                  href={`/learn/${lesson.courseId}?lesson=${lesson.lessonId}`}
                  className="flex items-center justify-between gap-4 rounded-[1.7rem] border border-black/6 bg-[#fafbfd] px-5 py-5 transition duration-200 hover:border-black/10 hover:bg-white"
                >
                  <div>
                    <p className="text-sm text-black/42">{lesson.courseTitle}</p>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-black">
                      {lesson.lessonTitle}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-black/48">
                      <span className="inline-flex items-center gap-2">
                        <Clock3 className="size-4" />
                        {formatDurationMinutes(lesson.durationMinutes)}
                      </span>
                      <span>
                        {format(lesson.completedAt, "d MMMM, HH:mm", { locale: ru })}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-full bg-[#eef0ff] px-4 py-3 text-sm font-medium text-[#3d3bff]">
                    {typeof lesson.score === "number" ? `${lesson.score}%` : "Готово"}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                icon={Clock3}
                title="Последних уроков пока нет"
                description="Заверши первый урок, и здесь появится история движения по курсу."
              />
            </div>
          )}
        </PremiumCard>

        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94 backdrop-blur-xl">
          <SectionHeader
            eyebrow="Бейджи"
            title="Полученные бейджи"
            description="Награды открываются по мере продвижения внутри курсов."
          />

          {data.earnedBadges.length ? (
            <div className="mt-6 grid gap-3">
              {data.earnedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-[1.7rem] border border-black/6 bg-[#fafbfd] px-5 py-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                      <Trophy className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-black/42">{badge.courseTitle}</p>
                      <h3 className="mt-1 text-lg font-semibold tracking-tight text-black">
                        {badge.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-black/56">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                icon={Trophy}
                title="Бейджей пока нет"
                description="Когда закроешь первые learning milestones, награды появятся здесь."
              />
            </div>
          )}
        </PremiumCard>
      </div>
    </div>
  );
}
