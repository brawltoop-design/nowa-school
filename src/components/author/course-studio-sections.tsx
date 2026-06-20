import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Coins,
  FileText,
  FileStack,
  Film,
  FolderOpen,
  Layers3,
  Link2,
  Sparkles,
  Users,
} from "lucide-react";
import type { CourseStudioSectionKey } from "@/lib/course-studio";
import { getCourseStudioPath } from "@/lib/course-studio";
import { formatCurrency, formatDurationMinutes } from "@/lib/utils";
import type {
  AuthorBuilderCourse,
  AuthorBuilderModule,
} from "@/server/author/queries";
import type { CourseStudioData } from "@/server/sales-page/queries";
import { CourseOverviewForm } from "@/components/author/course-overview-form";
import { LessonPracticeStudio } from "@/components/author/lesson-practice-studio";
import { ModuleBuilderCard } from "@/components/author/module-builder-card";
import { NewModuleForm } from "@/components/author/new-module-form";
import { SalesPageStudio } from "@/components/author/sales-page-studio";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { StatCard } from "@/components/premium/stat-card";
import { Badge } from "@/components/ui/badge";

type CourseStudioSectionPageProps = {
  section: CourseStudioSectionKey;
  studio: CourseStudioData;
  builderCourse: AuthorBuilderCourse;
};

function getModuleDuration(module: AuthorBuilderModule) {
  return module.lessons.reduce(
    (total, lesson) => total + lesson.durationMinutes,
    0,
  );
}

const courseStatusLabel = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликован",
  BLOCKED: "Заблокирован",
} as const;

const salesPageStatusLabel = {
  DRAFT: "Черновик",
  PENDING_REVIEW: "На модерации",
  IN_REVIEW: "На проверке",
  APPROVED: "Одобрена",
  PUBLISHED: "Опубликована",
  REJECTED: "Отклонена",
  UNPUBLISHED: "Снята с публикации",
} as const;

function OverviewSection({
  studio,
  builderCourse,
}: Omit<CourseStudioSectionPageProps, "section">) {
  const course = studio.course;

  return (
    <div className="space-y-6">
      <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers3}
          label="Модули"
          value={String(course.metrics.moduleCount)}
          description="структурных блоков курса"
        />
        <StatCard
          icon={FileStack}
          label="Уроки"
          value={String(course.metrics.lessonCount)}
          description="уроков внутри curriculum"
        />
        <StatCard
          icon={Users}
          label="Ученики"
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
            eyebrow="Обзор"
            title="База курса и продуктовые настройки"
            description="Slug, описание, цена, обложка и статус курса живут отдельно от публичного сайта и отдельно от слоя уроков."
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
            <p className="text-sm text-white/56">Логика студии</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              4 слоя
            </p>
            <p className="mt-3 text-sm leading-7 text-white/66">
              Обзор, продающая страница, уроки и практика теперь разделены,
              чтобы автор собирал курс как полноценный цифровой продукт.
            </p>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <p className="text-sm text-black/46">Рекомендуемый порядок</p>
            <div className="mt-5 space-y-3">
              {[
                "Сначала собери структуру модулей и уроков.",
                "Потом заполни видео, транскрипт и контент на странице уроков.",
                "После этого настрой практику и только потом полируй продающую страницу.",
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
  );
}

function CurriculumSection({
  studio,
  builderCourse,
}: Omit<CourseStudioSectionPageProps, "section">) {
  const course = studio.course;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
      <SectionHeader
        eyebrow="Программа"
        title="Архитектура программы"
        description="Здесь автор мыслит модулями, логикой пути и финальным результатом каждого блока, а подробное наполнение уроков держит на отдельной странице Уроки."
      />

        {builderCourse.modules.length ? (
          <div className="space-y-5">
            {builderCourse.modules.map((module) => (
              <PremiumCard
                key={module.id}
                padding="lg"
                className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary">Модуль {module.order}</Badge>
                      <Badge variant="subtle">
                        {module.lessons.length} уроков
                      </Badge>
                      <Badge variant="subtle">
                        {getModuleDuration(module)} мин
                      </Badge>
                      {module.practice ? (
                        <Badge variant="subtle">Итог модуля</Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                      {module.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-black/58">
                      {module.description}
                    </p>
                    {module.practice ? (
                      <div className="mt-4 rounded-[1.4rem] border border-black/6 bg-[#fafbff] px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-black/34">
                          Итог модуля
                        </p>
                        <p className="mt-2 text-base font-medium text-black">
                          {module.practice.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-black/48">
                          {module.practice.summary}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <PremiumButton
                      asChild
                      tone="secondary"
                      className="h-11 px-4"
                    >
                      <Link href={`${getCourseStudioPath(course.id, "lessons")}#module-${module.id}`}>
                        Открыть в уроках
                        <ArrowUpRight className="ml-2 size-4" />
                      </Link>
                    </PremiumButton>
                    <PremiumButton
                      asChild
                      tone="secondary"
                      className="h-11 px-4"
                    >
                      <Link
                        href={`${getCourseStudioPath(course.id, "practice")}#module-practice-${module.id}`}
                      >
                        Открыть в практике
                        <ArrowUpRight className="ml-2 size-4" />
                      </Link>
                    </PremiumButton>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {module.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="rounded-[1.5rem] border border-black/6 bg-[#fafbff] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black/52">
                          Урок {lesson.order}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black/52">
                          {lesson.durationMinutes} мин
                        </span>
                      </div>
                      <p className="mt-3 text-base font-medium text-black">
                        {lesson.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-black/48">
                        {lesson.description}
                      </p>
                    </div>
                  ))}
                </div>
              </PremiumCard>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Layers3}
            title="Пока нет модулей"
            description="Добавь первый модуль и собери каркас курса как продуктовый roadmap."
          />
        )}
      </div>

      <div className="space-y-6">
        <NewModuleForm courseId={course.id} />

        <PremiumCard
          padding="lg"
          className="rounded-[2.2rem] border-transparent bg-black text-white"
        >
          <p className="text-sm text-white/56">Принцип программы</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            От обещания к результату
          </p>
          <p className="mt-3 text-sm leading-7 text-white/66">
            Модули здесь отвечают за логический путь студента, а не просто за
            папки с видео. На следующем экране Уроки ты уже насыщаешь каждый
            модуль контентом.
          </p>
        </PremiumCard>
      </div>
    </div>
  );
}

function LessonsSection({
  builderCourse,
}: Omit<CourseStudioSectionPageProps, "section" | "studio">) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Уроки"
        title="Видео, транскрипт, материалы и AI-контент"
        description="Это основной слой курса: названия уроков, видео, транскрипт, текст урока, демо-загрузка и AI-генерация по каждому уроку."
      />

      {builderCourse.modules.length ? (
        <div className="space-y-6">
          {builderCourse.modules.map((module, index) => (
            <div key={module.id} id={`module-${module.id}`}>
              <ModuleBuilderCard
                module={module}
                isFirst={index === 0}
                isLast={index === builderCourse.modules.length - 1}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileStack}
          title="Сначала собери модули"
          description="После создания первого модуля здесь появится полноценный конструктор уроков."
        />
      )}
    </div>
  );
}

function FilesMaterialsSection({
  builderCourse,
}: Omit<CourseStudioSectionPageProps, "section" | "studio">) {
  const lessons = builderCourse.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      ...lesson,
      moduleId: module.id,
      moduleTitle: module.title,
    })),
  );

  const videoReadyLessons = lessons.filter((lesson) => lesson.videoUrl).length;
  const transcriptReadyLessons = lessons.filter((lesson) =>
    Boolean(lesson.transcript?.trim()),
  ).length;
  const transcriptUploads = lessons.flatMap((lesson) =>
    lesson.materials.filter((material) => material.kind === "transcript"),
  );
  const resourceUploads = lessons.flatMap((lesson) =>
    lesson.materials.filter((material) => material.kind === "resource"),
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Файлы и материалы"
        title="Видео, транскрипт и дополнительные ресурсы курса"
        description="Отдельный медиа-слой студии: здесь видно, где уже есть видео, где транскрипт лежит как текст или файл, и какие материалы реально готовы для учеников."
      />

      <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Film}
          label="Видео готово"
          value={String(videoReadyLessons)}
          description="уроков уже имеют ссылку на видео"
        />
        <StatCard
          icon={FileText}
          label="Текст транскрипта"
          value={String(transcriptReadyLessons)}
          description="уроков уже содержат транскрипт"
        />
        <StatCard
          icon={Link2}
          label="Файлы транскрипта"
          value={String(transcriptUploads.length)}
          description="загруженных файлов транскрипта"
        />
        <StatCard
          icon={FolderOpen}
          label="Ресурсы"
          value={String(resourceUploads.length)}
          description="PDF, шаблонов и доп. материалов"
        />
      </StaggerGrid>

      {builderCourse.modules.length ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {builderCourse.modules.map((module) => (
              <PremiumCard
                key={module.id}
                padding="lg"
                className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary">Модуль {module.order}</Badge>
                      <Badge variant="subtle">{module.lessons.length} уроков</Badge>
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                      {module.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-black/56">
                      {module.description}
                    </p>
                  </div>

                  <PremiumButton
                    asChild
                    tone="secondary"
                    className="h-11 px-4"
                  >
                    <Link href={`${getCourseStudioPath(builderCourse.id, "lessons")}#module-${module.id}`}>
                      Открыть в конструкторе уроков
                      <ArrowUpRight className="ml-2 size-4" />
                    </Link>
                  </PremiumButton>
                </div>

                <div className="mt-6 grid gap-4">
                  {module.lessons.map((lesson) => {
                    const transcriptFiles = lesson.materials.filter(
                      (material) => material.kind === "transcript",
                    );
                    const resources = lesson.materials.filter(
                      (material) => material.kind === "resource",
                    );

                    return (
                      <div
                        key={lesson.id}
                        className="rounded-[1.6rem] border border-black/6 bg-[#fafbff] px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black/52">
                                Урок {lesson.order}
                              </span>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black/52">
                                {formatDurationMinutes(lesson.durationMinutes)}
                              </span>
                            </div>
                            <p className="mt-3 text-base font-medium text-black">
                              {lesson.title}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-black/48">
                              {lesson.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant={lesson.videoUrl ? "primary" : "subtle"}>
                              {lesson.videoUrl ? "Видео привязано" : "Нет видео"}
                            </Badge>
                            <Badge
                              variant={
                                lesson.transcript?.trim() || transcriptFiles.length
                                  ? "primary"
                                  : "subtle"
                              }
                            >
                              {lesson.transcript?.trim()
                                ? "Текст транскрипта"
                                : transcriptFiles.length
                                  ? `Файлы транскрипта: ${transcriptFiles.length}`
                                  : "Нет транскрипта"}
                            </Badge>
                            <Badge variant={resources.length ? "primary" : "subtle"}>
                              {resources.length
                                ? `Ресурсы: ${resources.length}`
                                : "Нет ресурсов"}
                            </Badge>
                          </div>
                        </div>

                        {transcriptFiles.length || resources.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {[...transcriptFiles, ...resources].slice(0, 4).map((material) => (
                              <span
                                key={material.id}
                                className="inline-flex rounded-full border border-black/8 bg-white px-3 py-2 text-xs font-medium text-black/56"
                              >
                                {material.name}
                              </span>
                            ))}
                            {transcriptFiles.length + resources.length > 4 ? (
                              <span className="inline-flex rounded-full border border-black/8 bg-white px-3 py-2 text-xs font-medium text-black/42">
                                +{transcriptFiles.length + resources.length - 4} еще
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </PremiumCard>
            ))}
          </div>

          <div className="space-y-6">
            <PremiumCard
              padding="lg"
              className="rounded-[2.2rem] border-transparent bg-black text-white"
            >
              <p className="text-sm text-white/56">Принцип студии</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                Сначала контентные ассеты
              </p>
              <p className="mt-3 text-sm leading-7 text-white/66">
                Автору должно быть видно, где курс уже собран как продукт, а где
                пока нет видео, транскрипта или дополнительных ресурсов.
              </p>
            </PremiumCard>

            <PremiumCard
              padding="lg"
              className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
            >
              <p className="text-sm text-black/46">Рекомендуемый порядок</p>
              <div className="mt-5 space-y-3">
                {[
                  "Сначала привяжи ссылку на видео к ключевым урокам.",
                  "Потом добавь текст транскрипта или файл транскрипта.",
                  "После этого прикрепи PDF, шаблоны, промты и дополнительные материалы.",
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
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="Пока нет материалов уроков"
          description="Сначала создай модули и уроки, и здесь появится полный слой файлов и материалов."
        />
      )}
    </div>
  );
}

function AiStudioSection({
  studio,
}: Omit<CourseStudioSectionPageProps, "section" | "builderCourse">) {
  const lessons = studio.course.modules.flatMap((module) => module.lessons);
  const aiReadyLessons = lessons.filter((lesson) => lesson.aiSummary).length;
  const transcriptReadyLessons = lessons.filter((lesson) => lesson.transcript).length;
  const practiceReadyLessons = lessons.filter(
    (lesson) =>
      lesson.hasQuiz || lesson.hasAssignment || lesson.hasChecklist || lesson.hasQuest,
  ).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="AI-студия"
        title="Методология и готовность контента"
        description="Здесь видно, где курс уже усилен AI-слоем, а где еще не хватает транскрипта, выжимки или практического слоя."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="AI-выжимка"
          value={String(aiReadyLessons)}
          description="уроков уже получили AI-выжимку"
        />
        <StatCard
          icon={CheckCircle2}
          label="Транскрипт"
          value={String(transcriptReadyLessons)}
          description="уроков уже имеют транскрипт"
        />
        <StatCard
          icon={FileStack}
          label="Практика"
          value={String(practiceReadyLessons)}
          description="уроков уже снабжены заданиями"
        />
        <StatCard
          icon={Layers3}
          label="Блоки"
          value={String(studio.salesPage?.blocks.length ?? 0)}
          description="блоков собрано на продающей странице"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
          <Bot className="size-5 text-[#3d3bff]" />
          <p className="mt-4 text-2xl font-semibold tracking-tight text-black">
            {studio.moderation.openIssuesCount}
          </p>
          <p className="mt-2 text-sm leading-7 text-black/56">
            замечаний модерации на продающей странице. Исправляй спорные обещания до
            отправки на проверку.
          </p>
        </PremiumCard>

        <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92">
          <Sparkles className="size-5 text-[#3d3bff]" />
          <p className="mt-4 text-2xl font-semibold tracking-tight text-black">
            {lessons.length ? Math.round((aiReadyLessons / lessons.length) * 100) : 0}%
          </p>
          <p className="mt-2 text-sm leading-7 text-black/56">
            AI-покрытие по урокам. Чем выше этот процент, тем лучше опыт
            ученика и помощь AI-ассистента.
          </p>
        </PremiumCard>

        <PremiumCard
          padding="lg"
          className="rounded-[2.2rem] border-transparent bg-black text-white"
        >
          <p className="text-sm text-white/56">Что делать дальше</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-white/66">
            <p>1. Закрой пробелы по транскриптам.</p>
            <p>2. Для ключевых уроков добавь практический слой вручную.</p>
            <p>3. После этого полируй продающую страницу и отправляй на модерацию.</p>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}

function AnalyticsSection({
  studio,
}: Omit<CourseStudioSectionPageProps, "section" | "builderCourse">) {
  const { course, analytics } = studio;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Трафик и продажи"
        title="Аналитика продающей страницы"
        description="Здесь автор видит, что его Telegram, Instagram или YouTube реально приводят просмотры, клики и покупки."
      />

      <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Просмотры"
          value={String(analytics.pageViews)}
          description="общие просмотры продающей страницы"
        />
        <StatCard
          icon={Users}
          label="Уникальные"
          value={String(analytics.uniqueVisitors)}
          description="уникальные посетители"
        />
        <StatCard
          icon={Sparkles}
          label="Клики по CTA"
          value={String(analytics.ctaClicks)}
          description="клики по вспомогательным CTA"
        />
        <StatCard
          icon={Coins}
          label="Оплата"
          value={`${analytics.viewToCheckoutConversion}%`}
          description="конверсия из просмотра в оплату"
        />
      </StaggerGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
          <p className="text-sm text-black/46">Топ источников трафика</p>
          <div className="mt-5 premium-table-frame overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#f4f4f4] text-xs text-black/44">
                <tr>
                  <th className="px-5 py-4 font-medium">Источник</th>
                  <th className="px-5 py-4 font-medium">Просмотры</th>
                  <th className="px-5 py-4 font-medium">Клики</th>
                  <th className="px-5 py-4 font-medium">Покупки</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topTrafficSources.map((source) => (
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
          <p className="text-sm text-white/56">Распределение дохода</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.6rem] bg-white/8 px-5 py-5">
              <p className="text-sm text-white/56">GMV</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatCurrency(analytics.gmv, course.currency)}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-white/8 px-5 py-5">
              <p className="text-sm text-white/56">Платформа 15%</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatCurrency(analytics.platformFee, course.currency)}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-white/8 px-5 py-5">
              <p className="text-sm text-white/56">Автор 85%</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatCurrency(analytics.authorRevenue, course.currency)}
              </p>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}

function SettingsSection({
  studio,
}: Omit<CourseStudioSectionPageProps, "section" | "builderCourse">) {
  const { course } = studio;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <PremiumCard padding="lg" className="rounded-[2.5rem] bg-white/92">
        <SectionHeader
          eyebrow="Настройки"
          title="Маршруты, модерация и логика публикации"
          description="Системные правила курса и его публичного сайта теперь отделены от редакторов и контента."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.7rem] bg-[#f6f7fb] px-5 py-5">
            <p className="text-sm text-black/42">Slug курса</p>
            <p className="mt-2 text-lg font-semibold text-black">{course.slug}</p>
          </div>
          <div className="rounded-[1.7rem] bg-[#f6f7fb] px-5 py-5">
            <p className="text-sm text-black/42">Статус курса</p>
            <p className="mt-2 text-lg font-semibold text-black">
              {courseStatusLabel[course.status]}
            </p>
          </div>
          <div className="rounded-[1.7rem] bg-[#f6f7fb] px-5 py-5">
            <p className="text-sm text-black/42">Статус продающей страницы</p>
            <p className="mt-2 text-lg font-semibold text-black">
              {studio.salesPage?.status
                ? salesPageStatusLabel[studio.salesPage.status]
                : "Черновик"}
            </p>
          </div>
          <div className="rounded-[1.7rem] bg-[#f6f7fb] px-5 py-5">
            <p className="text-sm text-black/42">Публичный маршрут</p>
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
        <p className="text-sm text-white/56">Чеклист публикации</p>
        <div className="mt-4 space-y-4 text-sm leading-7 text-white/66">
          <p>1. Курс заполнен и имеет адекватное описание.</p>
          <p>2. Внутри уроков есть видео, транскрипт и текст урока.</p>
          <p>3. В Практике добавлены задания хотя бы к ключевым урокам.</p>
          <p>4. Продающая страница прошла модерацию и может быть опубликована.</p>
        </div>
      </PremiumCard>
    </div>
  );
}

export function CourseStudioSectionPage({
  section,
  studio,
  builderCourse,
}: CourseStudioSectionPageProps) {
  if (section === "overview") {
    return <OverviewSection studio={studio} builderCourse={builderCourse} />;
  }

  if (section === "creative-site") {
    return (
      <SalesPageStudio
        course={studio.course}
        salesPage={studio.salesPage}
        analytics={studio.analytics}
        moderation={studio.moderation}
      />
    );
  }

  if (section === "curriculum") {
    return <CurriculumSection studio={studio} builderCourse={builderCourse} />;
  }

  if (section === "lessons") {
    return <LessonsSection builderCourse={builderCourse} />;
  }

  if (section === "practice") {
    return <LessonPracticeStudio modules={studio.course.modules} />;
  }

  if (section === "files-materials") {
    return <FilesMaterialsSection builderCourse={builderCourse} />;
  }

  if (section === "ai-studio") {
    return <AiStudioSection studio={studio} />;
  }

  if (section === "analytics") {
    return <AnalyticsSection studio={studio} />;
  }

  return <SettingsSection studio={studio} />;
}
