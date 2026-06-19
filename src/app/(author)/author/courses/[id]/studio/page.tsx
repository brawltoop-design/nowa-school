import Link from "next/link";
import { Coins, FileStack, Layers3, Sparkles, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { StatCard } from "@/components/premium/stat-card";
import { CourseOverviewForm } from "@/components/author/course-overview-form";
import { ModuleBuilderCard } from "@/components/author/module-builder-card";
import { NewModuleForm } from "@/components/author/new-module-form";
import { SalesPageStudio } from "@/components/author/sales-page-studio";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { requireUserRole } from "@/server/auth/session";
import { getAuthorCourseBuilderData } from "@/server/author/queries";
import { getCourseStudioData } from "@/server/sales-page/queries";

type CourseStudioPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const studioTabs = [
  { key: "overview", label: "Overview" },
  { key: "sales-page", label: "Sales Page" },
  { key: "curriculum", label: "Curriculum" },
  { key: "lessons", label: "Lessons" },
  { key: "assignments", label: "Assignments" },
  { key: "ai-methodologist", label: "AI Methodologist" },
  { key: "analytics", label: "Analytics" },
  { key: "settings", label: "Settings" },
] as const;

function getTab(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return studioTabs.some((tab) => tab.key === raw) ? raw : "overview";
}

export default async function CourseStudioPage({
  params,
  searchParams,
}: CourseStudioPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = getTab(resolvedSearchParams.tab);
  const session = await requireUserRole(
    ["AUTHOR", "ADMIN"],
    `/author/courses/${id}/studio`,
  );

  const [studioResult, builderResult] = await Promise.all([
    getCourseStudioData(id, {
      userId: session.user.id,
      role: session.user.role,
    }),
    getAuthorCourseBuilderData(id, {
      userId: session.user.id,
      role: session.user.role,
    }),
  ]);

  if (studioResult.status === "forbidden" || builderResult.status === "forbidden") {
    redirect("/forbidden");
  }

  if (studioResult.status === "not_found" || builderResult.status === "not_found") {
    notFound();
  }

  const studio = studioResult.data;
  const builderCourse = builderResult.course;
  const course = studio.course;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Авторский кабинет", href: "/author" },
          { label: course.title },
          { label: "Course Studio" },
        ]}
      />

      <PremiumCard
        padding="lg"
        className="rounded-[2.8rem] bg-white/92 backdrop-blur-xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="primary">Course Studio</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-black/56">
              Один workspace для контента курса, продающей страницы, модерации,
              AI-подсказок и аналитики продаж.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <PremiumButton asChild tone="secondary" className="h-12 px-5">
              <Link href="/author">К dashboard</Link>
            </PremiumButton>
            <PremiumButton asChild className="h-12 px-5">
              <Link href={`/courses/${course.slug}`}>Публичная страница</Link>
            </PremiumButton>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {studioTabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/author/courses/${course.id}/studio?tab=${tab.key}`}
              className={`inline-flex items-center rounded-full px-4 py-3 text-sm font-medium transition duration-200 ${
                activeTab === tab.key
                  ? "bg-[#3d3bff] text-white"
                  : "border border-black/8 bg-[#f7f7f8] text-black/62 hover:border-black/14 hover:bg-white"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </PremiumCard>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Layers3}
              label="Modules"
              value={String(course.metrics.moduleCount)}
              description="структурных блоков курса"
            />
            <StatCard
              icon={FileStack}
              label="Lessons"
              value={String(course.metrics.lessonCount)}
              description="уроков внутри curriculum"
            />
            <StatCard
              icon={Users}
              label="Students"
              value={String(course.metrics.studentCount)}
              description="оплаченных enrollments"
            />
            <StatCard
              icon={Coins}
              label="GMV"
              value={formatCurrency(course.metrics.gmv, course.currency)}
              description="доход до комиссии"
            />
          </StaggerGrid>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <PremiumCard
              padding="lg"
              className="rounded-[2.5rem] bg-white/92 backdrop-blur-xl"
            >
              <SectionHeader
                eyebrow="Overview"
                title="Основные настройки курса"
                description="Тут остаются твои существующие данные курса: slug, описание, цена, уровень и статус."
              />
              <div className="mt-6">
                <CourseOverviewForm course={builderCourse} />
              </div>
            </PremiumCard>

            <div className="space-y-5">
              <PremiumCard
                padding="lg"
                className="rounded-[2.2rem] border-transparent bg-black text-white"
              >
                <p className="text-sm text-white/56">Sales page status</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {studio.salesPage?.status ?? "DRAFT"}
                </p>
                <p className="mt-3 text-sm leading-7 text-white/66">
                  Пока страница не approved и не published, курс не будет
                  выглядеть как полноценная продающая витрина.
                </p>
              </PremiumCard>

              <PremiumCard
                padding="lg"
                className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
              >
                <p className="text-sm text-black/46">Recommendations</p>
                <div className="mt-5 space-y-3">
                  {[
                    "Сначала заполни overview и переведи курс в PUBLISHED, когда контент готов.",
                    "Потом собери Sales Page и отправь ее на moderation.",
                    "После approve публикуй страницу и веди трафик на курс.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4 text-sm font-medium text-black/62"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </PremiumCard>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "sales-page" ? (
        <SalesPageStudio
          course={course}
          salesPage={studio.salesPage}
          analytics={studio.analytics}
          moderation={studio.moderation}
        />
      ) : null}

      {activeTab === "curriculum" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Curriculum"
              title="Программа курса"
              description="Текущий builder сохранен: модульная структура, уроки, файлы и AI-генерация остаются на месте."
            />

            {builderCourse.modules.length ? (
              <div className="space-y-6">
                {builderCourse.modules.map((module, index) => (
                  <ModuleBuilderCard
                    key={module.id}
                    module={module}
                    isFirst={index === 0}
                    isLast={index === builderCourse.modules.length - 1}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Layers3}
                title="Пока нет модулей"
                description="Добавь первый модуль и собери программу прямо здесь."
              />
            )}
          </div>

          <div className="space-y-6">
            <NewModuleForm courseId={course.id} />
          </div>
        </div>
      ) : null}

      {activeTab === "lessons" ? (
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Lesson Studio"
            title="Контент и media readiness"
            description="Быстрый срез по урокам: видео, transcript, summary и AI-готовность."
          />

          <StaggerGrid className="grid gap-5 lg:grid-cols-2">
            {course.modules.flatMap((module) =>
              module.lessons.map((lesson) => (
                <PremiumCard
                  key={lesson.id}
                  padding="lg"
                  className="rounded-[2rem] bg-white/92 backdrop-blur-xl"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="subtle">{module.title}</Badge>
                    {lesson.aiSummary ? <Badge variant="primary">AI summary</Badge> : null}
                    {lesson.videoUrl ? <Badge variant="subtle">Video</Badge> : null}
                    {lesson.transcript ? <Badge variant="subtle">Transcript</Badge> : null}
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                    {lesson.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-black/56">
                    {lesson.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-black/56">
                    <div className="rounded-full bg-[#f6f7fb] px-4 py-3">
                      {lesson.durationMinutes} мин
                    </div>
                    <div className="rounded-full bg-[#f6f7fb] px-4 py-3">
                      {lesson.videoUrl ? "Видео готово" : "Без видео"}
                    </div>
                    <div className="rounded-full bg-[#f6f7fb] px-4 py-3">
                      {lesson.transcript ? "Transcript ready" : "No transcript"}
                    </div>
                  </div>
                </PremiumCard>
              )),
            )}
          </StaggerGrid>
        </div>
      ) : null}

      {activeTab === "assignments" ? (
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Practice layer"
            title="Assignments, quizzes and quests"
            description="Студентский слой уже привязан к урокам. Здесь видно, где практика собрана хорошо, а где уроки еще сухие."
          />

          <StaggerGrid className="grid gap-5 lg:grid-cols-2">
            {course.modules.flatMap((module) =>
              module.lessons.map((lesson) => (
                <PremiumCard
                  key={lesson.id}
                  padding="lg"
                  className="rounded-[2rem] bg-white/92 backdrop-blur-xl"
                >
                  <p className="text-sm text-black/42">{module.title}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-black">
                    {lesson.title}
                  </h3>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge variant={lesson.hasQuiz ? "primary" : "subtle"}>
                      {lesson.hasQuiz ? "Quiz ready" : "No quiz"}
                    </Badge>
                    <Badge variant={lesson.hasAssignment ? "primary" : "subtle"}>
                      {lesson.hasAssignment ? "Assignment" : "No assignment"}
                    </Badge>
                    <Badge variant={lesson.hasChecklist ? "primary" : "subtle"}>
                      {lesson.hasChecklist ? "Checklist" : "No checklist"}
                    </Badge>
                    <Badge variant={lesson.hasQuest ? "primary" : "subtle"}>
                      {lesson.hasQuest ? "Quest" : "No quest"}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-black/56">
                    Практика и тесты генерируются из transcript. Если чего-то не
                    хватает, открой Curriculum и запусти AI-генерацию на уровне
                    урока.
                  </p>
                </PremiumCard>
              )),
            )}
          </StaggerGrid>
        </div>
      ) : null}

      {activeTab === "ai-methodologist" ? (
        <div className="space-y-6">
          <SectionHeader
            eyebrow="AI Methodologist"
            title="Где курс еще можно усилить"
            description="Эта вкладка собирает content readiness и sales readiness без отдельного перегруженного инструмента."
          />

          <div className="grid gap-6 xl:grid-cols-3">
            <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
              <Sparkles className="size-5 text-[#3d3bff]" />
              <p className="mt-4 text-2xl font-semibold tracking-tight text-black">
                {course.modules.flatMap((module) => module.lessons).filter((lesson) => lesson.aiSummary).length}
              </p>
              <p className="mt-2 text-sm leading-7 text-black/56">
                уроков уже имеют AI-summary и готовы к student experience.
              </p>
            </PremiumCard>
            <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
              <Badge variant="subtle">Sales</Badge>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-black">
                {studio.salesPage?.blocks.length ?? 0}
              </p>
              <p className="mt-2 text-sm leading-7 text-black/56">
                блоков на sales page. Если страница короткая, усиливай outcomes,
                build-result и FAQ.
              </p>
            </PremiumCard>
            <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
              <Badge variant="subtle">Moderation</Badge>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-black">
                {studio.moderation.openIssuesCount}
              </p>
              <p className="mt-2 text-sm leading-7 text-black/56">
                открытых moderation issues. Исправь claims до отправки страницы
                в review.
              </p>
            </PremiumCard>
          </div>
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Traffic & sales"
            title="Аналитика продающей страницы"
            description="Здесь автор видит, что его Telegram, Instagram или YouTube реально приводят просмотры, клики и покупки."
          />

          <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Users}
              label="Page views"
              value={String(studio.analytics.pageViews)}
              description="общие просмотры sales page"
            />
            <StatCard
              icon={Users}
              label="Unique"
              value={String(studio.analytics.uniqueVisitors)}
              description="уникальные visitorId / userId"
            />
            <StatCard
              icon={Sparkles}
              label="CTA clicks"
              value={String(studio.analytics.ctaClicks)}
              description="клики по вспомогательным CTA"
            />
            <StatCard
              icon={Coins}
              label="Checkout"
              value={`${studio.analytics.viewToCheckoutConversion}%`}
              description="conversion view -> checkout"
            />
          </StaggerGrid>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
              <p className="text-sm text-black/46">Top traffic sources</p>
              <div className="mt-5 overflow-hidden rounded-[1.6rem] border border-black/10">
                <table className="w-full text-left">
                  <thead className="bg-[#f4f4f4] text-xs text-black/44">
                    <tr>
                      <th className="px-5 py-4 font-medium">Source</th>
                      <th className="px-5 py-4 font-medium">Views</th>
                      <th className="px-5 py-4 font-medium">Clicks</th>
                      <th className="px-5 py-4 font-medium">Purchases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studio.analytics.topTrafficSources.map((source) => (
                      <tr key={source.source} className="border-t border-black/10 text-sm">
                        <td className="px-5 py-4 font-medium text-black">{source.source}</td>
                        <td className="px-5 py-4 text-black/62">{source.views}</td>
                        <td className="px-5 py-4 text-black/62">{source.clicks}</td>
                        <td className="px-5 py-4 text-black/62">{source.purchases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PremiumCard>

            <PremiumCard
              padding="lg"
              className="rounded-[2.3rem] border-transparent bg-black text-white"
            >
              <p className="text-sm text-white/56">Revenue split</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.6rem] bg-white/8 px-5 py-5">
                  <p className="text-sm text-white/56">GMV</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {formatCurrency(studio.analytics.gmv, course.currency)}
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-white/8 px-5 py-5">
                  <p className="text-sm text-white/56">Platform 15%</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {formatCurrency(studio.analytics.platformFee, course.currency)}
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-white/8 px-5 py-5">
                  <p className="text-sm text-white/56">Author 85%</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {formatCurrency(studio.analytics.authorRevenue, course.currency)}
                  </p>
                </div>
              </div>
            </PremiumCard>
          </div>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <PremiumCard padding="lg" className="rounded-[2.5rem] bg-white/92">
            <SectionHeader
              eyebrow="Settings"
              title="Routing, moderation and publishing logic"
              description="Тут зафиксированы системные правила курса и его продающей страницы."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.7rem] bg-[#f6f7fb] px-5 py-5">
                <p className="text-sm text-black/42">Course slug</p>
                <p className="mt-2 text-lg font-semibold text-black">{course.slug}</p>
              </div>
              <div className="rounded-[1.7rem] bg-[#f6f7fb] px-5 py-5">
                <p className="text-sm text-black/42">Course status</p>
                <p className="mt-2 text-lg font-semibold text-black">{course.status}</p>
              </div>
              <div className="rounded-[1.7rem] bg-[#f6f7fb] px-5 py-5">
                <p className="text-sm text-black/42">Sales page status</p>
                <p className="mt-2 text-lg font-semibold text-black">
                  {studio.salesPage?.status ?? "DRAFT"}
                </p>
              </div>
              <div className="rounded-[1.7rem] bg-[#f6f7fb] px-5 py-5">
                <p className="text-sm text-black/42">Public route</p>
                <p className="mt-2 text-lg font-semibold text-black">
                  /courses/{course.slug}
                </p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] border-transparent bg-black text-white"
          >
            <p className="text-sm text-white/56">Publishing checklist</p>
            <div className="mt-5 space-y-3">
              {[
                "Курс должен быть в status PUBLISHED.",
                "Sales page должна пройти moderation и получить APPROVED.",
                "После approve автор вручную нажимает Publish.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.4rem] bg-white/8 px-4 py-4 text-sm text-white/72"
                >
                  {item}
                </div>
              ))}
            </div>
          </PremiumCard>
        </div>
      ) : null}
    </div>
  );
}
