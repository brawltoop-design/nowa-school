import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Coins, Percent, ReceiptText, ShieldCheck, Tags, Wallet } from "lucide-react";
import { archiveTariff, createPromocode, createTariff, refundOrderAction, togglePromocode, updateTariff } from "@/server/billing/actions";
import type { AuthorCoursePricingData } from "@/server/billing/queries";
import { formatCurrency, formatMinorCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StatCard } from "@/components/premium/stat-card";
import { StaggerGrid } from "@/components/premium/stagger-grid";

type CoursePricingStudioProps = {
  data: AuthorCoursePricingData;
};

function getOrderStatusLabel(status: string) {
  switch (status) {
    case "PAID":
      return "Оплачен";
    case "REFUNDED":
      return "Возврат";
    case "PENDING":
    default:
      return "Ожидает";
  }
}

function getPaymentStatusLabel(status: string | null) {
  switch (status) {
    case "SUCCEEDED":
      return "Подтверждён";
    case "FAILED":
      return "Ошибка";
    case "PARTIALLY_REFUNDED":
      return "Частичный возврат";
    case "REFUNDED":
      return "Возвращён";
    case "REQUIRES_ACTION":
      return "Нужно действие";
    case "PENDING":
      return "В ожидании";
    default:
      return "—";
  }
}

function getPayoutStatusLabel(status: string | null) {
  switch (status) {
    case "PAID":
      return "Выплачено";
    case "REVERSED":
      return "Реверс";
    case "FAILED":
      return "Ошибка";
    case "PENDING":
      return "К выплате";
    default:
      return "—";
  }
}

const inputClass =
  "h-[48px] w-full rounded-[1.15rem] border border-black/10 bg-[#f8f8f8] px-4 text-sm outline-none transition duration-200 focus:border-[#3d3bff]/35 focus:bg-white";
const textareaClass =
  "min-h-[110px] w-full rounded-[1.15rem] border border-black/10 bg-[#f8f8f8] px-4 py-3 text-sm outline-none transition duration-200 focus:border-[#3d3bff]/35 focus:bg-white";

export function CoursePricingStudio({ data }: CoursePricingStudioProps) {
  const paidOrders = data.orders.filter((order) => order.status === "PAID");
  const grossMinor = paidOrders.reduce((sum, order) => sum + order.amountMinor, 0);
  const refundedMinor = data.orders.reduce(
    (sum, order) => sum + order.refundedMinor,
    0,
  );
  const activePromocodes = data.promocodes.filter((promo) => promo.isActive).length;
  const activeTariffs = data.tariffs.filter((tariff) => tariff.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Coins}
          label="GMV"
          value={formatMinorCurrency(grossMinor, data.course.currency)}
          description="подтверждённые заказы"
        />
        <StatCard
          icon={Wallet}
          label="Возвраты"
          value={formatMinorCurrency(refundedMinor, data.course.currency)}
          description="сумма по refund"
        />
        <StatCard
          icon={ShieldCheck}
          label="Тарифы"
          value={String(activeTariffs)}
          description="активные варианты продажи"
        />
        <StatCard
          icon={Tags}
          label="Промокоды"
          value={String(activePromocodes)}
          description="активные скидки"
        />
      </StaggerGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <PremiumCard padding="lg" className="rounded-[2.5rem] bg-white/92 backdrop-blur-xl">
            <SectionHeader
              eyebrow="Монетизация"
              title="Тарифы курса"
              description="Здесь живут варианты продажи курса, фиксированная цена order и управление тем, что увидит ученик в checkout."
            />

            <div className="mt-6 space-y-4">
              {data.tariffs.length ? (
                data.tariffs.map((tariff) => (
                  <PremiumCard
                    key={tariff.id}
                    padding="lg"
                    className="rounded-[2rem] border border-black/8 bg-[#fbfcff]"
                  >
                    <form action={updateTariff} className="space-y-4">
                      <input type="hidden" name="tariffId" value={tariff.id} />

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">{tariff.title}</Badge>
                        {tariff.isDefault ? <Badge variant="subtle">По умолчанию</Badge> : null}
                        <Badge variant="subtle">{tariff.status}</Badge>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-black">Название</span>
                          <input name="title" defaultValue={tariff.title} className={inputClass} />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-black">Цена</span>
                          <input
                            name="price"
                            type="number"
                            min="1"
                            step="0.01"
                            defaultValue={(tariff.priceMinor / 100).toFixed(2)}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-black">Валюта</span>
                          <input
                            name="currency"
                            defaultValue={tariff.currency}
                            className={inputClass}
                          />
                        </label>
                        <label className="flex items-center gap-3 rounded-[1.2rem] bg-[#f4f5fb] px-4 py-4 text-sm text-black/68">
                          <input
                            type="checkbox"
                            name="isDefault"
                            value="true"
                            defaultChecked={tariff.isDefault}
                            className="size-4 rounded border-black/20"
                          />
                          Сделать тарифом по умолчанию
                        </label>
                      </div>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-black">Описание</span>
                        <textarea
                          name="description"
                          defaultValue={tariff.description ?? ""}
                          className={textareaClass}
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-black">
                          Что входит (по строке на пункт)
                        </span>
                        <textarea
                          name="features"
                          defaultValue={tariff.features.join("\n")}
                          className={textareaClass}
                        />
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <PremiumButton type="submit" className="h-11 px-5">
                          Сохранить тариф
                        </PremiumButton>
                      </div>
                    </form>

                    <form action={archiveTariff} className="mt-3">
                      <input type="hidden" name="tariffId" value={tariff.id} />
                      <PremiumButton type="submit" tone="secondary" className="h-11 px-5">
                        Архивировать
                      </PremiumButton>
                    </form>
                  </PremiumCard>
                ))
              ) : (
                <div className="rounded-[1.8rem] bg-[#f7f8fb] px-5 py-5 text-sm leading-7 text-black/58">
                  Явных тарифов ещё нет. Пока checkout использует fallback от базовой цены курса:
                  {" "}
                  {formatCurrency(data.course.legacyPrice, data.course.currency)}.
                </div>
              )}
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.5rem] bg-white/92 backdrop-blur-xl">
            <SectionHeader
              eyebrow="Скидки"
              title="Промокоды"
              description="Промокоды можно ограничивать по тарифу, количеству активаций и сроку. Они списывают скидку прямо в order."
            />

            <div className="mt-6 space-y-4">
              {data.promocodes.length ? (
                data.promocodes.map((promo) => (
                  <div
                    key={promo.id}
                    className="rounded-[1.8rem] border border-black/8 bg-[#fbfcff] px-5 py-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary">{promo.code}</Badge>
                      <Badge variant="subtle">{promo.isActive ? "Активен" : "Выключен"}</Badge>
                      <Badge variant="subtle">
                        {promo.discountType === "PERCENT"
                          ? `${promo.percentOff ?? 0}%`
                          : formatMinorCurrency(promo.amountOffMinor ?? 0, promo.currency ?? data.course.currency)}
                      </Badge>
                    </div>
                    {promo.description ? (
                      <p className="mt-3 text-sm leading-7 text-black/58">{promo.description}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-black/54">
                      <span>Использовано: {promo.redemptionsCount}</span>
                      <span>
                        Лимит: {promo.maxRedemptions != null ? promo.maxRedemptions : "без лимита"}
                      </span>
                      <span>
                        Действует до:{" "}
                        {promo.validUntil
                          ? format(promo.validUntil, "d MMM yyyy, HH:mm", { locale: ru })
                          : "без срока"}
                      </span>
                    </div>
                    <form action={togglePromocode} className="mt-4">
                      <input type="hidden" name="promocodeId" value={promo.id} />
                      <PremiumButton type="submit" tone="secondary" className="h-11 px-5">
                        {promo.isActive ? "Отключить" : "Включить"}
                      </PremiumButton>
                    </form>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.8rem] bg-[#f7f8fb] px-5 py-5 text-sm leading-7 text-black/58">
                  Промокодов ещё нет. Ниже можно создать первый.
                </div>
              )}
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.5rem] bg-white/92 backdrop-blur-xl">
            <SectionHeader
              eyebrow="Заказы"
              title="Последние оплаты, возвраты и выплаты"
              description="Журнал использует серверные статусы order/payment/installment/refund/payout, а не фронтовые догадки."
            />

            <div className="mt-6 space-y-4">
              {data.orders.length ? (
                data.orders.map((order) => {
                  const refundableMinor = Math.max(0, order.amountMinor - order.refundedMinor);

                  return (
                    <PremiumCard
                      key={order.id}
                      padding="lg"
                      className="rounded-[2rem] border border-black/8 bg-[#fbfcff]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="primary">{getOrderStatusLabel(order.status)}</Badge>
                            <Badge variant="subtle">{order.paymentMethod}</Badge>
                            <Badge variant="subtle">
                              Payment: {getPaymentStatusLabel(order.paymentStatus)}
                            </Badge>
                            {order.installmentStatus ? (
                              <Badge variant="subtle">Installment: {order.installmentStatus}</Badge>
                            ) : null}
                            <Badge variant="subtle">
                              Payout: {getPayoutStatusLabel(order.payoutStatus)}
                            </Badge>
                          </div>

                          <h3 className="mt-4 text-xl font-semibold tracking-tight text-black">
                            {order.buyer.name} · {formatMinorCurrency(order.amountMinor, order.currency)}
                          </h3>
                          <p className="mt-2 text-sm text-black/56">{order.buyer.email}</p>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-black/52">
                            <span>Тариф: {order.tariffTitle ?? "—"}</span>
                            <span>
                              Создан: {format(order.createdAt, "d MMM yyyy, HH:mm", { locale: ru })}
                            </span>
                            <span>
                              Оплачен:{" "}
                              {order.paidAt
                                ? format(order.paidAt, "d MMM yyyy, HH:mm", { locale: ru })
                                : "ещё нет"}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] bg-white px-4 py-4 text-left text-sm text-black/58">
                          <p>Provider: {order.paymentProvider ?? "—"}</p>
                          <p className="mt-2">
                            Refunds: {formatMinorCurrency(order.refundedMinor, order.currency)}
                          </p>
                          <p className="mt-2">
                            Остаток к возврату: {formatMinorCurrency(refundableMinor, order.currency)}
                          </p>
                        </div>
                      </div>

                      {(order.offerUrl || order.refundPolicyUrl) ? (
                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-black/54">
                          {order.offerUrl ? <span>Оферта: {order.offerUrl}</span> : null}
                          {order.refundPolicyUrl ? (
                            <span>Политика возвратов: {order.refundPolicyUrl}</span>
                          ) : null}
                        </div>
                      ) : null}

                      {order.refunds.length ? (
                        <div className="mt-4 space-y-2 rounded-[1.5rem] bg-white px-4 py-4 text-sm text-black/58">
                          {order.refunds.map((refund) => (
                            <div key={refund.id} className="flex flex-wrap items-center justify-between gap-3">
                              <span>{refund.status}</span>
                              <span>{formatMinorCurrency(refund.amountMinor, order.currency)}</span>
                              <span>{format(refund.createdAt, "d MMM yyyy, HH:mm", { locale: ru })}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {refundableMinor > 0 && order.status === "PAID" ? (
                        <form action={refundOrderAction} className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="courseId" value={data.course.id} />
                          <input
                            name="reason"
                            placeholder="Причина возврата"
                            className={inputClass}
                          />
                          <input
                            name="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={(refundableMinor / 100).toFixed(2)}
                            defaultValue={(refundableMinor / 100).toFixed(2)}
                            className={inputClass}
                          />
                          <PremiumButton type="submit" tone="secondary" className="h-12 px-5">
                            Сделать возврат
                          </PremiumButton>
                        </form>
                      ) : null}
                    </PremiumCard>
                  );
                })
              ) : (
                <div className="rounded-[1.8rem] bg-[#f7f8fb] px-5 py-5 text-sm leading-7 text-black/58">
                  Заказов по этому курсу пока нет.
                </div>
              )}
            </div>
          </PremiumCard>
        </div>

        <div className="space-y-6">
          <PremiumCard padding="lg" className="rounded-[2.2rem] border-transparent bg-black text-white">
            <p className="text-sm text-white/56">Legacy price</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {formatCurrency(data.course.legacyPrice, data.course.currency)}
            </p>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Базовая цена курса осталась как fallback. Новый checkout приоритетно использует активные тарифы.
            </p>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <ReceiptText className="size-5 text-[#3d3bff]" />
              <p className="text-sm font-medium text-black">Новый тариф</p>
            </div>

            <form action={createTariff} className="mt-5 space-y-4">
              <input type="hidden" name="courseId" value={data.course.id} />
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Название</span>
                <input name="title" placeholder="Стандарт" className={inputClass} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Цена</span>
                <input
                  name="price"
                  type="number"
                  min="1"
                  step="0.01"
                  className={inputClass}
                  placeholder="199"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Валюта</span>
                <input
                  name="currency"
                  defaultValue={data.course.currency}
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Описание</span>
                <textarea
                  name="description"
                  className={textareaClass}
                  placeholder="Что получает ученик в этом пакете"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Что входит</span>
                <textarea
                  name="features"
                  className={textareaClass}
                  placeholder={"6 уроков\nКомьюнити\nШаблоны"}
                />
              </label>
              <PremiumButton type="submit" className="h-12 w-full px-5 text-base">
                Создать тариф
              </PremiumButton>
            </form>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.2rem] bg-white/92 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Percent className="size-5 text-[#3d3bff]" />
              <p className="text-sm font-medium text-black">Новый промокод</p>
            </div>

            <form action={createPromocode} className="mt-5 space-y-4">
              <input type="hidden" name="courseId" value={data.course.id} />

              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Код</span>
                <input
                  name="code"
                  placeholder="NOWA10"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Тип скидки</span>
                <select name="discountType" defaultValue="PERCENT" className={inputClass}>
                  <option value="PERCENT">Процент</option>
                  <option value="FIXED">Фикс</option>
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-black">Процент</span>
                  <input
                    name="percentOff"
                    type="number"
                    min="1"
                    max="100"
                    className={inputClass}
                    placeholder="10"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-black">Фиксированная сумма</span>
                  <input
                    name="amountOff"
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    placeholder="25"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Привязка к тарифу</span>
                <select name="tariffId" defaultValue="" className={inputClass}>
                  <option value="">Все тарифы</option>
                  {data.tariffs.map((tariff) => (
                    <option key={tariff.id} value={tariff.id}>
                      {tariff.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-black">Лимит активаций</span>
                  <input
                    name="maxRedemptions"
                    type="number"
                    min="1"
                    className={inputClass}
                    placeholder="100"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-black">Действует до</span>
                  <input name="validUntil" type="datetime-local" className={inputClass} />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-black">Описание</span>
                <textarea
                  name="description"
                  className={textareaClass}
                  placeholder="Для кампании, вебинара или дожима"
                />
              </label>

              <PremiumButton type="submit" className="h-12 w-full px-5 text-base">
                Создать промокод
              </PremiumButton>
            </form>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
