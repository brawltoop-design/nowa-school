import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Send,
  ShieldCheck,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { requireUserRole } from "@/server/auth/session";
import {
  issueCompletionCertificate,
  submitCertificateProject,
} from "@/server/certificates/actions";
import { getStudentCertificateCenterData } from "@/server/certificates/queries";

type CertificatePageProps = {
  params: Promise<{ courseId: string }>;
};

function statusTone(status: string) {
  return status === "ISSUED" || status === "APPROVED" ? "primary" : "subtle";
}

export default async function StudentCertificatePage({
  params,
}: CertificatePageProps) {
  const { courseId } = await params;
  const session = await requireUserRole(
    ["STUDENT", "ADMIN"],
    `/learn/${courseId}/certificate`,
  );
  const result = await getStudentCertificateCenterData(courseId, {
    userId: session.user.id,
    role: session.user.role,
  });

  if (result.status === "forbidden") {
    redirect("/forbidden");
  }

  if (result.status === "not_found") {
    notFound();
  }

  const { course, progress, requirements, submission, certificates } =
    result.data;
  const issuedCertificates = certificates.filter(
    (certificate) => certificate.status === "ISSUED",
  );
  const pendingCertificate = certificates.find(
    (certificate) => certificate.status === "PENDING",
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Кабинет ученика", href: "/learn" },
          { label: course.title, href: `/learn/${course.id}` },
          { label: "nowa school Verified Skills" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PremiumCard
          padding="lg"
          className="rounded-[2.6rem] bg-white/94 shadow-[0_24px_80px_rgba(15,23,42,0.06)]"
        >
          <Badge variant="primary">nowa school Verified Skills</Badge>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-black sm:text-5xl">
            Сертификат за практический проект и проверенный навык
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-black/58">
            Здесь сертификат выдается не за просмотр уроков, а за прогресс,
            результат теста и практический проект, который можно проверить публично.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.7rem] bg-[#f6f7fa] px-5 py-5">
              <p className="text-sm text-black/42">Прогресс</p>
              <p className="mt-2 text-3xl font-semibold text-black">
                {progress.percent}%
              </p>
            </div>
            <div className="rounded-[1.7rem] bg-[#f6f7fa] px-5 py-5">
              <p className="text-sm text-black/42">Quiz score</p>
              <p className="mt-2 text-3xl font-semibold text-black">
                {progress.bestQuizScore}%
              </p>
            </div>
            <div className="rounded-[1.7rem] bg-[#f6f7fa] px-5 py-5">
              <p className="text-sm text-black/42">Уроки</p>
              <p className="mt-2 text-3xl font-semibold text-black">
                {progress.completedLessons}/{progress.totalLessons}
              </p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard
          padding="lg"
          className="rounded-[2.2rem] border-transparent bg-black text-white"
        >
          <ShieldCheck className="size-6 text-[#9ea7ff]" />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            Public verification
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/62">
            Главный источник истины - публичная страница `/cert/NSAI-...`, а PDF
            только удобная копия для скачивания.
          </p>
          {issuedCertificates[0] ? (
            <PremiumButton
              asChild
              className="mt-6 h-12 w-full bg-white text-black hover:bg-white/90"
            >
              <Link href={`/cert/${issuedCertificates[0].certificateId}`}>
                Открыть сертификат
                <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </PremiumButton>
          ) : null}
        </PremiumCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
          <SectionHeader
            eyebrow="Requirements"
            title="Требования к выдаче"
            description="Completion можно получить после 90% прогресса и quiz score 80%+. Verified Skill требует проект."
          />
          <div className="mt-6 space-y-3">
            {requirements.map((requirement) => (
              <div
                key={requirement.title}
                className="flex gap-4 rounded-[1.5rem] border border-black/8 bg-[#fbfbfc] px-5 py-4"
              >
                <div
                  className={
                    requirement.completed
                      ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3d3bff] text-white"
                      : "flex size-10 shrink-0 items-center justify-center rounded-full bg-[#efefef] text-black/48"
                  }
                >
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-black">{requirement.title}</p>
                  <p className="mt-1 text-sm leading-6 text-black/52">
                    {requirement.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form action={issueCompletionCertificate.bind(null, course.id)}>
            <PremiumButton
              type="submit"
              disabled={!progress.eligibleForCompletion}
              className="mt-6 h-12 w-full disabled:pointer-events-none disabled:opacity-45"
            >
              <Award className="mr-2 size-4" />
              Получить Completion certificate
            </PremiumButton>
          </form>
        </PremiumCard>

        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
          <SectionHeader
            eyebrow="Final project"
            title="Отправка проекта на Verified Skill"
            description="Добавь ссылки на рабочий проект, demo video или repository. Автор проверит проект по rubric."
          />

          {submission ? (
            <div className="mt-6 rounded-[1.7rem] border border-black/8 bg-[#f6f7fa] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-black/42">Текущий submission</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                    {submission.projectTitle}
                  </h3>
                </div>
                <Badge variant={statusTone(submission.status)}>
                  {submission.status}
                </Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-black/58">
                {submission.projectDescription}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={submission.projectUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#eef0ff]"
                >
                  Project
                  <ExternalLink className="size-4" />
                </Link>
                {submission.demoVideoUrl ? (
                  <Link
                    href={submission.demoVideoUrl}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#eef0ff]"
                  >
                    Demo
                    <ExternalLink className="size-4" />
                  </Link>
                ) : null}
                {submission.repositoryUrl ? (
                  <Link
                    href={submission.repositoryUrl}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#eef0ff]"
                  >
                    Repository
                    <ExternalLink className="size-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {pendingCertificate?.latestFeedback ? (
            <div className="mt-5 rounded-[1.6rem] border border-[#3d3bff]/15 bg-[#eef0ff] p-5">
              <p className="text-sm font-medium text-[#3432dc]">Feedback</p>
              <p className="mt-2 text-sm leading-7 text-black/64">
                {pendingCertificate.latestFeedback}
              </p>
            </div>
          ) : null}

          <form
            action={submitCertificateProject.bind(null, course.id)}
            className="mt-6 grid gap-4"
          >
            <input
              name="projectTitle"
              defaultValue={submission?.projectTitle}
              placeholder="Название проекта"
              className="h-[52px] rounded-2xl border border-black/10 bg-[#f8f8f8] px-5 text-sm outline-none focus:border-[#3d3bff]/40 focus:bg-white"
              required
            />
            <textarea
              name="projectDescription"
              defaultValue={submission?.projectDescription}
              placeholder="Что ты собрал, какую задачу решает проект и где виден навык"
              className="min-h-32 rounded-2xl border border-black/10 bg-[#f8f8f8] px-5 py-4 text-sm leading-7 outline-none focus:border-[#3d3bff]/40 focus:bg-white"
              required
            />
            <input
              name="projectUrl"
              defaultValue={submission?.projectUrl}
              placeholder="https://project-url.com"
              type="url"
              className="h-[52px] rounded-2xl border border-black/10 bg-[#f8f8f8] px-5 text-sm outline-none focus:border-[#3d3bff]/40 focus:bg-white"
              required
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="demoVideoUrl"
                defaultValue={submission?.demoVideoUrl ?? ""}
                placeholder="Demo video URL"
                type="url"
                className="h-[52px] rounded-2xl border border-black/10 bg-[#f8f8f8] px-5 text-sm outline-none focus:border-[#3d3bff]/40 focus:bg-white"
              />
              <input
                name="repositoryUrl"
                defaultValue={submission?.repositoryUrl ?? ""}
                placeholder="Repository URL"
                type="url"
                className="h-[52px] rounded-2xl border border-black/10 bg-[#f8f8f8] px-5 text-sm outline-none focus:border-[#3d3bff]/40 focus:bg-white"
              />
            </div>
            <textarea
              name="files"
              placeholder="Дополнительные ссылки или файлы, каждый с новой строки"
              className="min-h-24 rounded-2xl border border-black/10 bg-[#f8f8f8] px-5 py-4 text-sm leading-7 outline-none focus:border-[#3d3bff]/40 focus:bg-white"
            />
            <PremiumButton type="submit" className="h-12 justify-self-start px-6">
              <Send className="mr-2 size-4" />
              Submit for review
            </PremiumButton>
          </form>
        </PremiumCard>
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Credentials"
          title="Мои сертификаты по курсу"
          description="Здесь видны completion, verified skill и expert reviewed records."
        />

        {certificates.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {certificates.map((certificate) => (
              <PremiumCard
                key={certificate.id}
                padding="lg"
                className="rounded-[2rem] bg-white/94"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge variant={statusTone(certificate.status)}>
                      {certificate.statusLabel}
                    </Badge>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                      {certificate.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-black/56">
                      {certificate.description}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-3 text-center">
                    <p className="text-xs text-black/42">Score</p>
                    <p className="mt-1 text-2xl font-semibold text-black">
                      {certificate.score}
                    </p>
                  </div>
                </div>
                {certificate.latestFeedback ? (
                  <p className="mt-5 rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4 text-sm leading-7 text-black/58">
                    {certificate.latestFeedback}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm text-black/42">
                    <Clock3 className="size-4" />
                    {format(certificate.issuedAt, "d MMM yyyy", { locale: ru })}
                  </span>
                  <PremiumButton asChild tone="secondary" className="h-11 px-5">
                    <Link href={`/cert/${certificate.certificateId}`}>
                      Verify
                      <ArrowUpRight className="ml-2 size-4" />
                    </Link>
                  </PremiumButton>
                </div>
              </PremiumCard>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileCheck2}
            title="Сертификатов пока нет"
            description="Заверши требования и отправь практический проект, чтобы получить проверяемый nowa school credential."
          />
        )}
      </div>
    </div>
  );
}
