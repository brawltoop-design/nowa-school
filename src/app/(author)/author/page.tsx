import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Banknote,
  Coins,
  FileText,
  Globe2,
  Layers3,
  Sparkles,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { StatCard } from "@/components/premium/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { requireUserRole } from "@/server/auth/session";
import { getAuthorDashboardData } from "@/server/author/queries";

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

export default async function AuthorDashboardPage() {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author");
  const data = await getAuthorDashboardData({
    userId: session.user.id,
    role: session.user.role,
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Авторский кабинет" }]} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <PremiumCard padding="lg" className="rounded-[2.6rem] bg-white/92 backdrop-blur-xl">
          <Badge variant="primary">Доход автора</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            Продажи, курсы и экономика автора
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-black/56">
            Здесь уже считаются реальные продажи из orders, количество учеников,
            GMV, комиссия платформы и чистый доход автора.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <PremiumButton asChild className="h-12 px-5">
              <Link href="/author/courses/new">Создать курс</Link>
            </PremiumButton>
            <PremiumButton asChild tone="secondary" className="h-12 px-5">
              <Link href="/courses">Открыть витрину</Link>
            </PremiumButton>
          </div>
        </PremiumCard>

        <PremiumCard padding="lg" className="rounded-[2.2rem] border-transparent bg-black text-white">
          <p className="text-sm text-white/56">Чистый доход</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight">
            {formatCurrency(data.metrics.authorRevenue, "USD")}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/72">
            после удержания платформенной комиссии
          </p>
        </PremiumCard>
      </div>

      <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers3}
          label="Всего курсов"
          value={String(data.metrics.totalCourses)}
          description="в рабочем пространстве автора"
        />
        <StatCard
          icon={Globe2}
          label="Опубликованы"
          value={String(data.metrics.publishedCourses)}
          description="видны в каталоге"
        />
        <StatCard
          icon={FileText}
          label="Черновики"
          value={String(data.metrics.draftCourses)}
          description="ждут упаковки"
        />
        <StatCard
          icon={Users}
          label="Ученики"
          value={String(data.metrics.totalStudents)}
          description="всего enrollments"
        />
        <StatCard
          icon={Coins}
          label="GMV"
          value={formatCurrency(data.metrics.gmv, "USD")}
          description="общий объем продаж"
        />
        <StatCard
          icon={Banknote}
          label="Платформа 15%"
          value={formatCurrency(data.metrics.platformFee, "USD")}
          description="комиссия nowa school"
        />
        <StatCard
          icon={Banknote}
          label="Автор 85%"
          value={formatCurrency(data.metrics.authorRevenue, "USD")}
          description="чистый доход автора"
        />
        <StatCard
          icon={Sparkles}
          label="Просмотры страницы"
          value={String(data.metrics.salesPageViews)}
          description="трафик на продающие страницы"
        />
        <StatCard
          icon={FileText}
          label="На проверке"
          value={String(data.metrics.salesPagePendingReview)}
          description="страниц ждут модерацию"
        />
      </StaggerGrid>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
          <SectionHeader
            eyebrow="Последние продажи"
            title="Последние оплаты"
            description="Последние оплаченные заказы с реальными суммами и разбиением по комиссии."
          />

          {data.recentSales.length ? (
            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-black/10">
              <table className="w-full text-left">
                <thead className="bg-[#f4f4f4] text-xs text-black/44">
                  <tr>
                    <th className="px-5 py-4 font-medium">Покупатель</th>
                    <th className="px-5 py-4 font-medium">Курс</th>
                    <th className="px-5 py-4 font-medium">Сумма</th>
                    <th className="px-5 py-4 font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-t border-black/10 bg-white text-sm"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-black">{sale.buyer.name}</p>
                        <p className="text-black/46">{sale.buyer.email}</p>
                      </td>
                      <td className="px-5 py-4 text-black">{sale.course.title}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-black">
                          {formatCurrency(sale.amount, "USD")}
                        </p>
                        <p className="text-black/46">
                          автору {formatCurrency(sale.authorRevenue, "USD")}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-black/46">
                        {format(sale.createdAt, "d MMM, HH:mm", { locale: ru })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                icon={Coins}
                title="Пока нет продаж"
                description="Опубликуй курс и проведи первый трафик из соцсетей, чтобы здесь появились живые оплаты."
              />
            </div>
          )}
        </PremiumCard>

        <PremiumCard padding="lg" className="rounded-[2.3rem] border-transparent bg-black text-white">
          <p className="text-sm text-white/56">Финансовая модель</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.6rem] bg-white/8 px-5 py-5">
              <p className="text-sm text-white/56">GMV</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatCurrency(data.metrics.gmv, "USD")}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-white/8 px-5 py-5">
              <p className="text-sm text-white/56">Комиссия платформы</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatCurrency(data.metrics.platformFee, "USD")}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-white/8 px-5 py-5">
              <p className="text-sm text-white/56">Доход автора</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatCurrency(data.metrics.authorRevenue, "USD")}
              </p>
            </div>
          </div>
        </PremiumCard>
      </div>

      <div className="space-y-6">
        <SectionHeader
          eyebrow="Мои курсы"
          title="Все продукты автора"
          description="Отсюда можно быстро перейти в Course Studio, посмотреть трафик на sales page и открыть публичную страницу курса."
        />

        {data.courses.length ? (
          <StaggerGrid className="grid gap-5 lg:grid-cols-2">
            {data.courses.map((course) => (
              <PremiumCard
                key={course.id}
                padding="lg"
                className="rounded-[2rem] border-black/6 bg-white/92 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={course.status === "PUBLISHED" ? "primary" : "subtle"}>
                        {courseStatusLabel[course.status]}
                      </Badge>
                      <Badge variant="subtle">{course.category}</Badge>
                      <Badge variant="subtle">{course.level}</Badge>
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                      {course.title}
                    </h3>
                  </div>
                  <p className="text-right text-xl font-semibold tracking-tight text-black">
                    {formatCurrency(course.price, course.currency)}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Уроки</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.lessonCount}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Ученики</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.studentCount}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Продажи</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.paidOrders}
                    </p>
                  </div>
                    <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                      <p className="text-xs text-black/42">GMV</p>
                      <p className="mt-2 text-lg font-semibold text-black">
                        {formatCurrency(course.gmv, course.currency)}
                      </p>
                    </div>
                  </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Продающая страница</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.salesPageStatus
                        ? salesPageStatusLabel[course.salesPageStatus]
                        : "Не создана"}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Просмотры</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.pageViews}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Конверсия в оплату</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.conversionRate}%
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#f6f7fa] px-4 py-4">
                    <p className="text-xs text-black/42">Модерация</p>
                    <p className="mt-2 text-lg font-semibold text-black">
                      {course.pendingModeration ? "Ожидает" : "Чисто"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-black/46">
                    Обновлен {format(course.updatedAt, "d MMM yyyy", { locale: ru })}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <PremiumButton asChild tone="secondary" className="h-12 px-5">
                      <Link href={`/courses/${course.slug}`}>Страница курса</Link>
                    </PremiumButton>
                    <PremiumButton asChild tone="secondary" className="h-12 px-5">
                      <Link href={`/author/courses/${course.id}/certificates`}>
                        Сертификаты
                      </Link>
                    </PremiumButton>
                    <PremiumButton asChild className="h-12 px-5">
                      <Link href={`/author/courses/${course.id}/studio/creative-site`}>
                        Открыть студию
                      </Link>
                    </PremiumButton>
                  </div>
                </div>
              </PremiumCard>
            ))}
          </StaggerGrid>
        ) : (
          <EmptyState
            icon={Layers3}
            title="Пока нет курсов"
            description="Создай первый курс, и после этого здесь появятся конструктор, продажи и аналитика."
            action={
              <PremiumButton asChild>
                <Link href="/author/courses/new">Создать курс</Link>
              </PremiumButton>
            }
          />
        )}
      </div>
    </div>
  );
}
