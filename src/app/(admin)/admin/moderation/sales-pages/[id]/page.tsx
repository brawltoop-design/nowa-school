import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseSalesPageRenderer } from "@/components/sales-page/course-sales-page-renderer";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import {
  approveSalesPageSubmission,
  rejectSalesPageSubmission,
  requestSalesPageChanges,
} from "@/server/sales-page/actions";
import { getAdminModerationDetail } from "@/server/sales-page/queries";

type AdminSalesPageModerationDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminSalesPageModerationDetail({
  params,
}: AdminSalesPageModerationDetailProps) {
  const { id } = await params;
  const data = await getAdminModerationDetail(id);

  if (!data) {
    notFound();
  }

  const detail = data;

  async function approveAction() {
    "use server";

    await approveSalesPageSubmission(detail.salesPage.id, { adminComment: "" });
  }

  async function requestChangesAction() {
    "use server";

    await requestSalesPageChanges(detail.salesPage.id, {
      adminComment: "Нужны правки перед публикацией.",
    });
  }

  async function rejectAction() {
    "use server";

    await rejectSalesPageSubmission(detail.salesPage.id, {
      adminComment: "Страница отклонена. Исправь claims и подачу.",
    });
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Админка", href: "/admin" },
          { label: "Moderation", href: "/admin/moderation" },
          { label: detail.course.title },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PremiumCard
          padding="lg"
          className="rounded-[2.5rem] bg-white/92 backdrop-blur-xl"
        >
          <SectionHeader
            eyebrow="Preview"
            title="Sales page review"
            description="Полный preview страницы курса до approve / reject."
          />
          <div className="mt-6">
            <CourseSalesPageRenderer
              course={detail.course}
              salesPage={detail.salesPage}
              mode="admin"
              primaryHref={`/checkout/mock?course=${encodeURIComponent(detail.course.slug)}`}
              secondaryHref={`/courses/${detail.course.slug}`}
            />
          </div>
        </PremiumCard>

        <div className="space-y-5">
          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="subtle">{detail.salesPage.status}</Badge>
              {detail.latestSubmission ? (
                <Badge variant="subtle">{detail.latestSubmission.status}</Badge>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-7 text-black/56">
              Автор: {detail.course.author.name} · {detail.course.author.email}
            </p>

            <div className="mt-5 space-y-3">
              <form action={approveAction}>
                <PremiumButton type="submit" className="h-11 w-full">
                  Approve
                </PremiumButton>
              </form>
              <form action={requestChangesAction}>
                <PremiumButton type="submit" tone="secondary" className="h-11 w-full">
                  Request changes
                </PremiumButton>
              </form>
              <form action={rejectAction}>
                <PremiumButton type="submit" tone="secondary" className="h-11 w-full">
                  Reject
                </PremiumButton>
              </form>
            </div>

            <div className="mt-5">
              <PremiumButton asChild tone="secondary" className="h-11 w-full">
                <Link href={`/courses/${detail.course.slug}`}>Open public course</Link>
              </PremiumButton>
            </div>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <p className="text-sm font-medium text-black">Automatic issues</p>
            <div className="mt-5 space-y-3">
              {detail.issues.length ? (
                detail.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-[1.5rem] border border-black/6 bg-[#fafbff] p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="subtle">{issue.type}</Badge>
                      <Badge variant="subtle">{issue.severity}</Badge>
                      <Badge variant="subtle">{issue.status}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-black/56">
                      {issue.message}
                    </p>
                    {issue.fieldPath ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-black/34">
                        {issue.fieldPath}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-black/56">
                  Автоматических issues сейчас нет.
                </p>
              )}
            </div>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl"
          >
            <p className="text-sm font-medium text-black">Submission history</p>
            <div className="mt-5 space-y-3">
              {detail.submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-[1.5rem] border border-black/6 bg-[#fafbff] p-4"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="subtle">{submission.status}</Badge>
                  </div>
                  {submission.message ? (
                    <p className="mt-3 text-sm leading-7 text-black/56">
                      {submission.message}
                    </p>
                  ) : null}
                  {submission.adminComment ? (
                    <p className="mt-3 text-sm leading-7 text-black/56">
                      Admin: {submission.adminComment}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
