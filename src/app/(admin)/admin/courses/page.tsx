import Link from "next/link";
import { CourseStatus } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowUpRight, BookOpen, ExternalLink, Search, ShieldAlert } from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { updateAdminCourseStatus } from "@/server/admin/actions";
import { getAdminCourses } from "@/server/admin/queries";

type AdminCoursesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseCourseStatus(value: string | string[] | undefined) {
  const status = getParam(value);
  return status && Object.values(CourseStatus).includes(status as CourseStatus)
    ? (status as CourseStatus)
    : "ALL";
}

function getStatusBadgeVariant(status: CourseStatus) {
  return status === CourseStatus.PUBLISHED ? "primary" : "subtle";
}

const actionButtonClass =
  "inline-flex h-9 items-center justify-center rounded-full border border-black/8 bg-white px-3 text-xs font-medium text-black/66 transition duration-200 hover:border-black/14 hover:bg-[#f6f6f6] disabled:cursor-not-allowed disabled:opacity-40";

export default async function AdminCoursesPage({
  searchParams,
}: AdminCoursesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = getParam(resolvedSearchParams.q) ?? "";
  const status = parseCourseStatus(resolvedSearchParams.status);
  const courses = await getAdminCourses({ query, status });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Админка", href: "/admin" },
          { label: "Курсы" },
        ]}
      />

      <SectionHeader
        eyebrow="Course moderation"
        title="Курсы платформы"
        description="Публикация, блокировка и возврат в draft без тяжелой CMS-обвязки."
      />

      <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/36" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Поиск по названию, slug, категории или автору"
              className="h-[52px] w-full rounded-full border border-black/10 bg-[#f8f8f8] pl-11 pr-5 text-sm outline-none transition duration-200 placeholder:text-black/34 focus:border-[#3d3bff]/40 focus:bg-white"
            />
          </label>

          <select
            name="status"
            defaultValue={status}
            className="h-[52px] rounded-full border border-black/10 bg-[#f8f8f8] px-5 text-sm text-black outline-none transition duration-200 focus:border-[#3d3bff]/40 focus:bg-white"
          >
            <option value="ALL">Все статусы</option>
            <option value={CourseStatus.DRAFT}>Draft</option>
            <option value={CourseStatus.PUBLISHED}>Published</option>
            <option value={CourseStatus.BLOCKED}>Blocked</option>
          </select>

          <button className="h-[52px] rounded-full bg-[#3d3bff] px-6 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8]">
            Применить
          </button>
        </form>
      </PremiumCard>

      <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-black/46">Найдено курсов</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-black">
              {courses.length}
            </p>
          </div>
          <Badge variant="subtle">Admin actions</Badge>
        </div>

        {courses.length ? (
          <div className="mt-6 overflow-x-auto rounded-[1.6rem] border border-black/10">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="bg-[#f4f4f4] text-xs text-black/44">
                <tr>
                  <th className="px-5 py-4 font-medium">Курс</th>
                  <th className="px-5 py-4 font-medium">Автор</th>
                  <th className="px-5 py-4 font-medium">Course</th>
                  <th className="px-5 py-4 font-medium">Sales page</th>
                  <th className="px-5 py-4 font-medium">Moderation</th>
                  <th className="px-5 py-4 font-medium">Цена</th>
                  <th className="px-5 py-4 font-medium">Создан</th>
                  <th className="px-5 py-4 font-medium">Views</th>
                  <th className="px-5 py-4 font-medium">Продажи</th>
                  <th className="px-5 py-4 font-medium">Revenue</th>
                  <th className="px-5 py-4 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr
                    key={course.id}
                    className="border-t border-black/10 bg-white text-sm transition duration-200 hover:bg-[#fafafa]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-black">{course.title}</p>
                      <p className="text-black/44">{course.slug}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-black">{course.author.name}</p>
                      <p className="text-black/44">{course.author.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={getStatusBadgeVariant(course.status)}>
                        {course.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={course.salesPageStatus === "PUBLISHED" ? "primary" : "subtle"}>
                        {course.salesPageStatus ?? "NONE"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={course.moderationStatus === "APPROVED" ? "primary" : "subtle"}>
                        {course.moderationStatus ?? "NONE"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-medium text-black">
                      {formatCurrency(course.price, course.currency)}
                    </td>
                    <td className="px-5 py-4 text-black/52">
                      {format(course.createdAt, "d MMM yyyy", { locale: ru })}
                    </td>
                    <td className="px-5 py-4 text-black">{course.pageViews}</td>
                    <td className="px-5 py-4 text-black">{course.salesCount}</td>
                    <td className="px-5 py-4 font-medium text-black">
                      {formatCurrency(course.revenue, course.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <form
                          action={updateAdminCourseStatus.bind(
                            null,
                            course.id,
                            CourseStatus.PUBLISHED,
                          )}
                        >
                          <button
                            className={actionButtonClass}
                            disabled={course.status === CourseStatus.PUBLISHED}
                          >
                            Publish
                          </button>
                        </form>
                        <form
                          action={updateAdminCourseStatus.bind(
                            null,
                            course.id,
                            CourseStatus.BLOCKED,
                          )}
                        >
                          <button
                            className={actionButtonClass}
                            disabled={course.status === CourseStatus.BLOCKED}
                          >
                            Block
                          </button>
                        </form>
                        <form
                          action={updateAdminCourseStatus.bind(
                            null,
                            course.id,
                            CourseStatus.DRAFT,
                          )}
                        >
                          <button
                            className={actionButtonClass}
                            disabled={course.status === CourseStatus.DRAFT}
                          >
                            Draft
                          </button>
                        </form>
                        <Link
                          href={`/courses/${course.slug}`}
                          className={actionButtonClass}
                        >
                          <ExternalLink className="mr-1.5 size-3.5" />
                          Курс
                        </Link>
                        <Link
                          href={`/admin/users?q=${encodeURIComponent(course.author.email)}`}
                          className={actionButtonClass}
                        >
                          <ArrowUpRight className="mr-1.5 size-3.5" />
                          Автор
                        </Link>
                        {course.salesPageId ? (
                          <Link
                            href={`/admin/moderation/sales-pages/${course.salesPageId}`}
                            className={actionButtonClass}
                          >
                            <ShieldAlert className="mr-1.5 size-3.5" />
                            Review
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              icon={ShieldAlert}
              title="Курсов по фильтрам нет"
              description="Сбрось поиск или выбери другой статус."
            />
          </div>
        )}
      </PremiumCard>

      <div className="grid gap-4 md:grid-cols-2">
        <PremiumCard padding="lg" className="rounded-[2rem] bg-[#f8f8f8]">
          <BookOpen className="size-5 text-[#3d3bff]" />
          <p className="mt-3 text-sm text-black/52">Published курсы попадают в публичный каталог.</p>
        </PremiumCard>
        <PremiumCard padding="lg" className="rounded-[2rem] bg-[#f8f8f8]">
          <ShieldAlert className="size-5 text-[#3d3bff]" />
          <p className="mt-3 text-sm text-black/52">Blocked курсы скрываются с витрины и остаются в админском контроле.</p>
        </PremiumCard>
      </div>
    </div>
  );
}
