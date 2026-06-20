import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowUpRight, ReceiptText, Search, ShoppingBag } from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getAdminOrders } from "@/server/admin/queries";

type AdminOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseOrderStatus(value: string | string[] | undefined) {
  const status = getParam(value);
  return status && Object.values(OrderStatus).includes(status as OrderStatus)
    ? (status as OrderStatus)
    : "ALL";
}

const controlClass =
  "h-[52px] rounded-full border border-black/10 bg-[#f8f8f8] px-5 text-sm text-black outline-none transition duration-200 focus:border-[#3d3bff]/40 focus:bg-white";

const orderStatusLabel = {
  PENDING: "Ожидает",
  PAID: "Оплачен",
  REFUNDED: "Возврат",
} as const;

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = getParam(resolvedSearchParams.q) ?? "";
  const status = parseOrderStatus(resolvedSearchParams.status);
  const orders = await getAdminOrders({ query, status });
  const totals = orders.reduce(
    (acc, order) => ({
      amount: acc.amount + order.amount,
      platformFee: acc.platformFee + order.platformFee,
      authorRevenue: acc.authorRevenue + order.authorRevenue,
    }),
    { amount: 0, platformFee: 0, authorRevenue: 0 },
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Админка", href: "/admin" },
          { label: "Заказы" },
        ]}
      />

      <SectionHeader
        eyebrow="Платежи"
        title="Заказы"
        description="Финансовый журнал с суммой заказа, комиссией платформы и выплатой автору."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
          <p className="text-sm text-black/46">Сумма</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
            {formatCurrency(totals.amount, "USD")}
          </p>
        </PremiumCard>
        <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
          <p className="text-sm text-black/46">Комиссия платформы</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
            {formatCurrency(totals.platformFee, "USD")}
          </p>
        </PremiumCard>
        <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
          <p className="text-sm text-black/46">Доход автора</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
            {formatCurrency(totals.authorRevenue, "USD")}
          </p>
        </PremiumCard>
      </div>

      <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/36" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Поиск по покупателю, курсу или payment id"
              className="h-[52px] w-full rounded-full border border-black/10 bg-[#f8f8f8] pl-11 pr-5 text-sm outline-none transition duration-200 placeholder:text-black/34 focus:border-[#3d3bff]/40 focus:bg-white"
            />
          </label>

          <select name="status" defaultValue={status} className={controlClass}>
            <option value="ALL">Все статусы</option>
            <option value={OrderStatus.PENDING}>Ожидает</option>
            <option value={OrderStatus.PAID}>Оплачен</option>
            <option value={OrderStatus.REFUNDED}>Возврат</option>
          </select>

          <button className="h-[52px] rounded-full bg-[#3d3bff] px-6 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8]">
            Применить
          </button>
        </form>
      </PremiumCard>

      <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-black/46">Найдено заказов</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-black">
              {orders.length}
            </p>
          </div>
          <Badge variant="subtle">Демо-оплата подключена</Badge>
        </div>

        {orders.length ? (
          <div className="mt-6 overflow-x-auto rounded-[1.6rem] border border-black/10">
            <table className="w-full min-w-[1080px] text-left">
              <thead className="bg-[#f4f4f4] text-xs text-black/44">
                <tr>
                  <th className="px-5 py-4 font-medium">Покупатель</th>
                  <th className="px-5 py-4 font-medium">Курс</th>
                  <th className="px-5 py-4 font-medium">Сумма</th>
                  <th className="px-5 py-4 font-medium">Комиссия платформы</th>
                  <th className="px-5 py-4 font-medium">Доход автора</th>
                  <th className="px-5 py-4 font-medium">Статус</th>
                  <th className="px-5 py-4 font-medium">Дата</th>
                  <th className="px-5 py-4 font-medium">Платеж</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-black/10 bg-white text-sm transition duration-200 hover:bg-[#fafafa]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-black">{order.user.name}</p>
                      <p className="text-black/44">{order.user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/courses/${order.course.slug}`}
                        className="inline-flex items-center gap-1.5 font-medium text-black transition duration-200 hover:text-[#3d3bff]"
                      >
                        {order.course.title}
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </td>
                    <td className="px-5 py-4 font-medium text-black">
                      {formatCurrency(order.amount, order.currency)}
                    </td>
                    <td className="px-5 py-4 text-black">
                      {formatCurrency(order.platformFee, order.currency)}
                    </td>
                    <td className="px-5 py-4 text-black">
                      {formatCurrency(order.authorRevenue, order.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={order.status === OrderStatus.PAID ? "primary" : "subtle"}>
                        {orderStatusLabel[order.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-black/52">
                      {format(order.createdAt, "d MMM yyyy, HH:mm", { locale: ru })}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-black">{order.paymentProvider ?? "вручную"}</p>
                      <p className="max-w-[180px] truncate text-black/44">
                        {order.paymentId ?? order.id}
                      </p>
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
              title="Заказов по фильтрам нет"
              description="Сбрось поиск или выбери другой статус."
            />
          </div>
        )}
      </PremiumCard>

      <PremiumCard padding="lg" className="rounded-[2rem] bg-[#f8f8f8]">
        <ReceiptText className="size-5 text-[#3d3bff]" />
        <p className="mt-3 text-sm text-black/52">
          Сейчас покупки идут через демо-оплату, но структура уже повторяет будущую платежную аналитику.
        </p>
      </PremiumCard>
    </div>
  );
}
