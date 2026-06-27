import Image from "next/image";
import Link from "next/link";
import { Eye, Lock, MonitorSmartphone } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CourseSalesPageRenderer } from "@/components/sales-page/course-sales-page-renderer";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { requireUserRole } from "@/server/auth/session";
import { getCourseStudioData } from "@/server/sales-page/queries";

function LockedPreviewChrome() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/8 px-5 py-4">
        <div className="flex items-center gap-4">
          <Image
            src="/nowa-school-black-logo.png"
            alt="nowa school"
            width={3470}
            height={1076}
            className="h-8 w-auto sm:h-9"
            priority
          />
          <div className="hidden items-center gap-3 lg:flex">
            {["Каталог", "Авторы", "Кейсы", "Гайды"].map((item) => (
              <span
                key={item}
                className="text-sm font-medium text-black/56"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-[#f4f5fb] px-4 py-2 text-sm font-medium text-black/56 sm:inline-flex">
            Войти
          </span>
          <span className="rounded-full bg-[#3d3bff] px-4 py-2 text-sm font-medium text-white">
            Начать бесплатно
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/6 bg-[#fbfbfd] px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-black/62">
          <Lock className="size-4 text-[#3d3bff]" />
          Системный хедер — зафиксирован
        </div>
        <p className="text-sm text-black/42">
          Автор редактирует только контент между хедером и футером
        </p>
      </div>
    </div>
  );
}

function LockedPreviewFooter() {
  return (
    <div className="mt-5 overflow-hidden rounded-[1.8rem] border border-black/8 bg-white/92 px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-black/62">
          <Lock className="size-4 text-[#3d3bff]" />
          Системный футер
        </div>
        <p className="text-sm text-black/42">
          Общий футер платформы рендерится автоматически
        </p>
      </div>
    </div>
  );
}

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
          {
            label: course.title,
            href: `/author/courses/${course.id}/creative-studio`,
          },
          { label: "Предпросмотр" },
        ]}
      />

      <PremiumCard
        padding="lg"
        className="rounded-[2.7rem] bg-white/92 backdrop-blur-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="primary">Предпросмотр продающей страницы</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-black/56">
              Отдельный авторский предпросмотр, где можно быстро проверить
              мобильную и десктопную версию перед модерацией и публикацией.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <PremiumButton
              asChild
              tone="secondary"
              className="h-12 px-5"
            >
              <Link href={`/author/courses/${course.id}/creative-studio`}>
                <Eye className="mr-2 size-4" />
                Вернуться в студию
              </Link>
            </PremiumButton>
            <PremiumButton asChild className="h-12 px-5">
              <Link href={`/courses/${course.slug}`}>Открыть публичную страницу</Link>
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
            eyebrow="Десктоп"
            title="Предпросмотр на компьютере"
            description="Так страница выглядит вместе с системным хедером и системным футером."
          />
          <div className="mt-6">
            <div className="space-y-5">
              <LockedPreviewChrome />
              <CourseSalesPageRenderer
                course={course}
                salesPage={salesPage}
                mode="preview"
                primaryHref={`/checkout/mock?course=${encodeURIComponent(course.slug)}`}
                secondaryHref={`/courses/${course.slug}#curriculum`}
              />
              <LockedPreviewFooter />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard
          padding="lg"
          className="rounded-[2.5rem] bg-white/92 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="size-4 text-[#3d3bff]" />
            <SectionHeader
              eyebrow="Мобильная версия"
              title="Предпросмотр на телефоне"
              description="Суженная версия canvas для проверки мобильного контента внутри системной оболочки."
            />
          </div>
          <div className="mt-6">
            <div className="space-y-5">
              <LockedPreviewChrome />
              <CourseSalesPageRenderer
                course={course}
                salesPage={salesPage}
                mode="preview"
                deviceMode="mobile"
                primaryHref={`/checkout/mock?course=${encodeURIComponent(course.slug)}`}
                secondaryHref={`/courses/${course.slug}#curriculum`}
              />
              <LockedPreviewFooter />
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
