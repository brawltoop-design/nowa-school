import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Banknote,
  BookOpen,
  CircleDollarSign,
  Coins,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { StatCard } from "@/components/premium/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getAdminDashboardData } from "@/server/admin/queries";

export default async function AdminPage() {
  const data = await getAdminDashboardData();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Админка" }]} />

      <SectionHeader
        eyebrow="Admin command"
        title="Операционная панель"
        description="Деньги, пользователи, курсы и последние события платформы в одном спокойном рабочем экране."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <PremiumCard padding="lg" className="rounded-[2.4rem] bg-white/92 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <Badge variant="primary">Live operations</Badge>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-black sm:text-4xl">
                Контроль качества, экономики и доступа без ощущения старой CMS.
              </h2>
            </div>

            <div className="grid min-w-[220px] gap-3">
              <div className="rounded-[1.5rem] bg-[#f6f7fa] px-5 py-4">
                <p className="text-sm text-black/46">Paid orders</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
                  {data.metrics.paidOrders}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[#f6f7fa] px-5 py-4">
                <p className="text-sm text-black/46">Published</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
                  {data.metrics.publishedCourses}
                </p>
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard
          padding="lg"
          className="rounded-[2.2rem] border-transparent bg-black text-white"
        >
          <p className="text-sm text-white/56">Platform revenue</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight">
            {formatCurrency(data.metrics.platformRevenue, "USD")}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/72">
            комиссия платформы с paid orders
          </p>
        </PremiumCard>
      </div>

      <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Всего пользователей"
          value={String(data.metrics.totalUsers)}
          description="все роли в системе"
        />
        <StatCard
          icon={ShieldCheck}
          label="Авторы"
          value={String(data.metrics.totalAuthors)}
          description="могут создавать курсы"
        />
        <StatCard
          icon={GraduationCap}
          label="Ученики"
          value={String(data.metrics.totalStudents)}
          description="покупатели и learners"
        />
        <StatCard
          icon={BookOpen}
          label="Всего курсов"
          value={String(data.metrics.totalCourses)}
          description="draft, published и blocked"
        />
        <StatCard
          icon={BookOpen}
          label="Опубликованные"
          value={String(data.metrics.publishedCourses)}
          description="видны в каталоге"
        />
        <StatCard
          icon={ShieldAlert}
          label="Заблокированные"
          value={String(data.metrics.blockedCourses)}
          description="скрыты с витрины"
        />
        <StatCard
          icon={Coins}
          label="GMV"
          value={formatCurrency(data.metrics.gmv, "USD")}
          description="объем успешных оплат"
        />
        <StatCard
          icon={Banknote}
          label="Выплаты авторам"
          value={formatCurrency(data.metrics.authorPayouts, "USD")}
          description="85% от продаж"
        />
      </StaggerGrid>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
          <SectionHeader
            eyebrow="Orders"
            title="Последние заказы"
            description="Покупатель, курс, статус и экономика сделки."
          />

          {data.recentOrders.length ? (
            <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-black/10">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-[#f4f4f4] text-xs text-black/44">
                  <tr>
                    <th className="px-5 py-4 font-medium">Покупатель</th>
                    <th className="px-5 py-4 font-medium">Курс</th>
                    <th className="px-5 py-4 font-medium">Финансы</th>
                    <th className="px-5 py-4 font-medium">Статус</th>
                    <th className="px-5 py-4 font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-black/10 bg-white text-sm transition duration-200 hover:bg-[#fafafa]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-black">{order.buyer.name}</p>
                        <p className="text-black/46">{order.buyer.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-black">{order.course.title}</p>
                        <p className="text-black/46">{order.author.name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-black">
                          {formatCurrency(order.amount, "USD")}
                        </p>
                        <p className="text-black/46">
                          {formatCurrency(order.platformFee, "USD")} platform
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={order.status === "PAID" ? "primary" : "subtle"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-black/46">
                        {format(order.createdAt, "d MMM, HH:mm", { locale: ru })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                icon={ShoppingBag}
                title="Заказов пока нет"
                description="После первой покупки здесь появится финансовый поток платформы."
              />
            </div>
          )}
        </PremiumCard>

        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
          <SectionHeader
            eyebrow="Users"
            title="Новые пользователи"
            description="Последние регистрации по ролям."
          />

          {data.recentUsers.length ? (
            <div className="mt-6 space-y-3">
              {data.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-black/8 bg-[#fbfbfc] px-5 py-4 transition duration-200 hover:border-black/14 hover:bg-white"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-black">{user.name}</p>
                    <p className="truncate text-sm text-black/46">{user.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={user.role === "ADMIN" ? "primary" : "subtle"}>
                      {user.role}
                    </Badge>
                    <p className="mt-2 text-xs text-black/42">
                      {format(user.createdAt, "d MMM", { locale: ru })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                icon={UserPlus}
                title="Пользователей пока нет"
                description="Новые регистрации будут появляться здесь."
              />
            </div>
          )}
        </PremiumCard>
      </div>

      <StaggerGrid className="grid gap-5 md:grid-cols-3">
        <StatCard
          icon={CircleDollarSign}
          label="Take rate"
          value="15%"
          description="комиссия платформы"
        />
        <StatCard
          icon={Banknote}
          label="Author share"
          value="85%"
          description="выплаты авторам"
        />
        <StatCard
          icon={ShoppingBag}
          label="Paid orders"
          value={String(data.metrics.paidOrders)}
          description="успешные покупки"
        />
      </StaggerGrid>
    </div>
  );
}
