import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StatCard } from "@/components/premium/stat-card";
import { Badge } from "@/components/ui/badge";
import { requireUserRole } from "@/server/auth/session";
import { reviewCertificateSubmission } from "@/server/certificates/actions";
import { getAuthorCourseCertificatesData } from "@/server/certificates/queries";

type AuthorCertificatesPageProps = {
  params: Promise<{ id: string }>;
};

function statusTone(status: string) {
  return status === "APPROVED" || status === "ISSUED" ? "primary" : "subtle";
}

const statusLabel: Record<string, string> = {
  DRAFT: "Черновик",
  SUBMITTED: "Отправлено",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
  NEEDS_REVISION: "Нужна доработка",
  PENDING: "Ожидает",
  ISSUED: "Выдан",
  REVOKED: "Отозван",
  EXPIRED: "Истек",
};

export default async function AuthorCourseCertificatesPage({
  params,
}: AuthorCertificatesPageProps) {
  const { id } = await params;
  const session = await requireUserRole(
    ["AUTHOR", "ADMIN"],
    `/author/courses/${id}/certificates`,
  );
  const result = await getAuthorCourseCertificatesData(id, {
    userId: session.user.id,
    role: session.user.role,
  });

  if (result.status === "forbidden") {
    redirect("/forbidden");
  }

  if (result.status === "not_found") {
    notFound();
  }

  const { course, metrics, submissions } = result.data;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Авторский кабинет", href: "/author" },
          { label: course.title, href: `/author/courses/${course.id}/creative-studio` },
          { label: "Сертификаты" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <PremiumCard padding="lg" className="rounded-[2.6rem] bg-white/94">
          <Badge variant="primary">Проверка навыков</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            Проверка проектов учеников
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-black/56">
            Автор видит заявки на сертификат, ссылки на проекты, оценку и обратную связь.
            Одобрение выдает публичный сертификат подтвержденного навыка nowa school.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <PremiumButton asChild tone="secondary" className="h-12 px-5">
              <Link href={`/author/courses/${course.id}/creative-studio`}>
                <ArrowLeft className="mr-2 size-4" />
                В студию курса
              </Link>
            </PremiumButton>
            <PremiumButton asChild tone="secondary" className="h-12 px-5">
              <Link href={`/courses/${course.slug}`}>Публичная страница</Link>
            </PremiumButton>
          </div>
        </PremiumCard>

        <PremiumCard
          padding="lg"
          className="rounded-[2.2rem] border-transparent bg-black text-white"
        >
          <p className="text-sm text-white/56">Средняя оценка</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight">
            {metrics.averageScore}
          </p>
          <p className="mt-3 text-sm leading-7 text-white/62">
            по выданным сертификатам курса
          </p>
        </PremiumCard>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          icon={FileCheck2}
          label="Заявки"
          value={String(metrics.totalSubmissions)}
          description="все отправленные проекты"
        />
        <StatCard
          icon={RotateCcw}
          label="Ожидают"
          value={String(metrics.pendingSubmissions)}
          description="ждут решения"
        />
        <StatCard
          icon={CheckCircle2}
          label="Выданы"
          value={String(metrics.issuedCertificates)}
          description="выданные сертификаты"
        />
      </div>

      <SectionHeader
        eyebrow="Очередь"
        title="Заявки на сертификат"
        description="Проверь проект, поставь оценку и дай короткую полезную обратную связь."
      />

      {submissions.length ? (
        <div className="space-y-5">
          {submissions.map((submission) => (
            <PremiumCard
              key={submission.id}
              padding="lg"
              className="rounded-[2.2rem] bg-white/94"
            >
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusTone(submission.status)}>
                      {statusLabel[submission.status] ?? submission.status}
                    </Badge>
                    {submission.certificate ? (
                      <Badge variant={statusTone(submission.certificate.status)}>
                        {statusLabel[submission.certificate.status] ?? submission.certificate.status}
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                    {submission.projectTitle}
                  </h2>
                  <p className="mt-2 text-sm text-black/46">
                    {submission.student.name} · {submission.student.email}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-black/58">
                    {submission.projectDescription}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={submission.projectUrl}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#eef0ff]"
                    >
                      Проект
                      <ExternalLink className="size-4" />
                    </Link>
                    {submission.demoVideoUrl ? (
                      <Link
                        href={submission.demoVideoUrl}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#eef0ff]"
                      >
                        Демо
                        <ExternalLink className="size-4" />
                      </Link>
                    ) : null}
                    {submission.repositoryUrl ? (
                      <Link
                        href={submission.repositoryUrl}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#eef0ff]"
                      >
                        Репозиторий
                        <ExternalLink className="size-4" />
                      </Link>
                    ) : null}
                    {submission.certificate ? (
                      <Link
                        href={`/cert/${submission.certificate.certificateId}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#eef0ff] px-4 py-2.5 text-sm font-medium text-[#3d3bff] transition hover:bg-[#e2e5ff]"
                      >
                        Страница верификации
                        <ArrowUpRight className="size-4" />
                      </Link>
                    ) : null}
                  </div>
                  {submission.certificate?.latestFeedback ? (
                    <p className="mt-5 rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4 text-sm leading-7 text-black/58">
                      {submission.certificate.latestFeedback}
                    </p>
                  ) : null}
                  <p className="mt-5 text-xs text-black/40">
                    Обновлено {format(submission.updatedAt, "d MMM yyyy, HH:mm", { locale: ru })}
                  </p>
                </div>

                <form className="grid gap-3">
                  <input
                    name="score"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={submission.certificate?.score ?? 85}
                    className="h-12 rounded-2xl border border-black/10 bg-[#f8f8f8] px-4 text-sm outline-none focus:border-[#3d3bff]/40 focus:bg-white"
                    required
                  />
                  <textarea
                    name="feedback"
                    placeholder="Обратная связь для ученика"
                    defaultValue={submission.certificate?.latestFeedback ?? ""}
                    className="min-h-28 rounded-2xl border border-black/10 bg-[#f8f8f8] px-4 py-3 text-sm leading-7 outline-none focus:border-[#3d3bff]/40 focus:bg-white"
                    required
                  />
                  <div className="grid gap-3">
                    <PremiumButton
                      formAction={reviewCertificateSubmission.bind(
                        null,
                        course.id,
                        submission.id,
                        "approve",
                      )}
                      className="h-12"
                    >
                      <CheckCircle2 className="mr-2 size-4" />
                      Одобрить
                    </PremiumButton>
                    <PremiumButton
                      formAction={reviewCertificateSubmission.bind(
                        null,
                        course.id,
                        submission.id,
                        "revision",
                      )}
                      tone="secondary"
                      className="h-12"
                    >
                      <RotateCcw className="mr-2 size-4" />
                      Отправить на доработку
                    </PremiumButton>
                    <PremiumButton
                      formAction={reviewCertificateSubmission.bind(
                        null,
                        course.id,
                        submission.id,
                        "reject",
                      )}
                      tone="secondary"
                      className="h-12"
                    >
                      <XCircle className="mr-2 size-4" />
                      Отклонить
                    </PremiumButton>
                  </div>
                </form>
              </div>
            </PremiumCard>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileCheck2}
          title="Заявок пока нет"
          description="Когда ученики отправят финальный проект, очередь проверки появится здесь."
        />
      )}
    </div>
  );
}
