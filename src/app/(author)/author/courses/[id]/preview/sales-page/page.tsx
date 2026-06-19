import Link from "next/link";
import { Eye, MonitorSmartphone } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CourseSalesPageRenderer } from "@/components/sales-page/course-sales-page-renderer";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { requireUserRole } from "@/server/auth/session";
import { getCourseStudioData } from "@/server/sales-page/queries";

type SalesPagePreviewProps = {
  params: Promise<{ id: string }>;
};

export default async function AuthorSalesPagePreview({
  params,
}: SalesPagePreviewProps) {
  const { id } = await params;
  const session = await requireUserRole(
    ["AUTHOR", "ADMIN"],
    `/author/courses/${id}/preview/sales-page`,
  );
  const result = await getCourseStudioData(id, {
    userId: session.user.id,
    role: session.user.role,
  });

  if (result.status === "forbidden") {
    redirect("/forbidden");
  }

  if (result.status === "not_found") {
    notFound();
  }

  const { course, salesPage } = result.data;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Авторский кабинет", href: "/author" },
          { label: course.title, href: `/author/courses/${course.id}/studio` },
          { label: "Preview" },
        ]}
      />

      <PremiumCard
        padding="lg"
        className="rounded-[2.7rem] bg-white/92 backdrop-blur-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="primary">Sales Page Preview</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-black/56">
              Отдельный preview author-side, где можно быстро проверить mobile и
              desktop перед модерацией и публикацией.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <PremiumButton
              asChild
              tone="secondary"
              className="h-12 px-5"
            >
              <Link href={`/author/courses/${course.id}/studio?tab=sales-page`}>
                <Eye className="mr-2 size-4" />
                Вернуться в Studio
              </Link>
            </PremiumButton>
            <PremiumButton asChild className="h-12 px-5">
              <Link href={`/courses/${course.slug}`}>Открыть public route</Link>
            </PremiumButton>
          </div>
        </div>
      </PremiumCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <PremiumCard
          padding="lg"
          className="rounded-[2.5rem] bg-white/92 backdrop-blur-xl"
        >
          <SectionHeader
            eyebrow="Desktop"
            title="Desktop preview"
            description="Так страница выглядит в основном режиме."
          />
          <div className="mt-6">
            <CourseSalesPageRenderer
              course={course}
              salesPage={salesPage}
              mode="preview"
              primaryHref={`/checkout/mock?course=${encodeURIComponent(course.slug)}`}
              secondaryHref={`/courses/${course.slug}#curriculum`}
            />
          </div>
        </PremiumCard>

        <PremiumCard
          padding="lg"
          className="rounded-[2.5rem] bg-white/92 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="size-4 text-[#3d3bff]" />
            <SectionHeader
              eyebrow="Mobile"
              title="Mobile preview"
              description="Суженная версия canvas для быстрой визуальной проверки."
            />
          </div>
          <div className="mt-6">
            <CourseSalesPageRenderer
              course={course}
              salesPage={salesPage}
              mode="preview"
              deviceMode="mobile"
              primaryHref={`/checkout/mock?course=${encodeURIComponent(course.slug)}`}
              secondaryHref={`/courses/${course.slug}#curriculum`}
            />
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
