import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { formatMinorCurrency } from "@/lib/utils";
import { resolveMockInstallmentAction } from "@/server/billing/actions";
import { getMockInstallmentConfirmationData } from "@/server/billing/service";

type MockInstallmentConfirmationPageProps = {
  params: Promise<{ installmentPlanId: string }>;
};

export default async function MockInstallmentConfirmationPage({
  params,
}: MockInstallmentConfirmationPageProps) {
  const { installmentPlanId } = await params;
  const plan = await getMockInstallmentConfirmationData(installmentPlanId);

  if (!plan) {
    return (
      <div className="app-shell page-section">
        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
          <p className="text-lg font-semibold text-black">План рассрочки не найден</p>
          <p className="mt-3 text-sm leading-7 text-black/56">
            Вернись в checkout и создай новый order.
          </p>
          <div className="mt-6">
            <PremiumButton asChild className="h-12 px-5">
              <Link href="/courses">В каталог</Link>
            </PremiumButton>
          </div>
        </PremiumCard>
      </div>
    );
  }

  const payment = plan.order.payments[0] ?? null;
  const returnHref = `/checkout/success?orderId=${encodeURIComponent(plan.orderId)}&state=pending`;
  const isResolved =
    plan.status === "APPROVED" ||
    plan.status === "DECLINED" ||
    plan.status === "FAILED" ||
    plan.status === "COMPLETED";

  return (
    <div className="app-shell page-section">
      <div className="mx-auto max-w-4xl">
        <PremiumCard
          padding="lg"
          className="rounded-[2.8rem] border-black/6 bg-white/94 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
        >
          <Badge variant="primary">Mock Installment Provider</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black">
            Подтверди решение по рассрочке
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-black/56">
            Платформа ждёт подтверждение провайдера вебхуком и только после этого выдаёт доступ к курсу.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <PremiumCard padding="lg" className="rounded-[2rem] bg-[#f7f8fb]">
              <p className="text-sm text-black/46">Order</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-black">
                {plan.order.course.title}
              </h2>
              <p className="mt-2 text-sm text-black/56">
                Installment plan: {plan.id}
              </p>
              <div className="mt-5 space-y-3 text-sm text-black/58">
                <div className="flex items-center justify-between gap-3">
                  <span>Статус плана</span>
                  <span className="font-medium text-black">{plan.status}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Сумма order</span>
                  <span className="font-medium text-black">
                    {formatMinorCurrency(plan.order.amountMinor, plan.order.currency)}
                  </span>
                </div>
                {payment ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Связанный payment</span>
                    <span className="font-medium text-black">{payment.status}</span>
                  </div>
                ) : null}
              </div>
            </PremiumCard>

            <div className="space-y-4">
              {isResolved ? (
                <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
                  <p className="text-sm text-black/46">Решение уже обработано</p>
                  <p className="mt-3 text-lg font-medium text-black">
                    Возвращайся на страницу статуса заказа и продолжай сценарий.
                  </p>
                  <div className="mt-5">
                    <PremiumButton asChild className="h-12 px-5">
                      <Link href={returnHref}>Открыть статус заказа</Link>
                    </PremiumButton>
                  </div>
                </PremiumCard>
              ) : (
                <>
                  <form action={resolveMockInstallmentAction}>
                    <input type="hidden" name="installmentPlanId" value={plan.id} />
                    <input type="hidden" name="outcome" value="approve" />
                    <PremiumButton type="submit" className="h-12 w-full px-5 text-base">
                      Одобрить рассрочку
                    </PremiumButton>
                  </form>

                  <form action={resolveMockInstallmentAction}>
                    <input type="hidden" name="installmentPlanId" value={plan.id} />
                    <input type="hidden" name="outcome" value="decline" />
                    <PremiumButton
                      type="submit"
                      tone="secondary"
                      className="h-12 w-full px-5 text-base"
                    >
                      Отклонить заявку
                    </PremiumButton>
                  </form>
                </>
              )}

              <PremiumButton asChild tone="secondary" className="h-12 w-full px-5 text-base">
                <Link href={returnHref}>Страница статуса order</Link>
              </PremiumButton>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
