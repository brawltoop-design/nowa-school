import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { formatMinorCurrency } from "@/lib/utils";
import {
  resolveMockPaymentAction,
} from "@/server/billing/actions";
import { getMockPaymentConfirmationData } from "@/server/billing/service";

type MockPaymentConfirmationPageProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function MockPaymentConfirmationPage({
  params,
}: MockPaymentConfirmationPageProps) {
  const { paymentId } = await params;
  const payment = await getMockPaymentConfirmationData(paymentId);

  if (!payment) {
    return (
      <div className="app-shell page-section">
        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
          <p className="text-lg font-semibold text-black">Платёж не найден</p>
          <p className="mt-3 text-sm leading-7 text-black/56">
            Mock-провайдер не нашёл такой payment. Вернись в checkout и создай новый order.
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

  const returnHref = `/checkout/success?orderId=${encodeURIComponent(payment.orderId)}&state=pending`;
  const isResolved =
    payment.status === "SUCCEEDED" ||
    payment.status === "FAILED" ||
    payment.status === "REFUNDED" ||
    payment.status === "PARTIALLY_REFUNDED";

  return (
    <div className="app-shell page-section">
      <div className="mx-auto max-w-4xl">
        <PremiumCard
          padding="lg"
          className="rounded-[2.8rem] border-black/6 bg-white/94 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
        >
          <Badge variant="primary">Mock Payment Provider</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black">
            Подтверди исход оплаты
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-black/56">
            Это дев-сценарий для проверки идемпотентных вебхуков, `pending`-состояний и выдачи
            доступа только после серверного подтверждения.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <PremiumCard padding="lg" className="rounded-[2rem] bg-[#f7f8fb]">
              <p className="text-sm text-black/46">Заказ</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-black">
                {payment.order.course.title}
              </h2>
              <p className="mt-2 text-sm text-black/56">
                Payment ID: {payment.id}
              </p>
              <div className="mt-5 space-y-3 text-sm text-black/58">
                <div className="flex items-center justify-between gap-3">
                  <span>Статус payment</span>
                  <span className="font-medium text-black">{payment.status}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Сумма</span>
                  <span className="font-medium text-black">
                    {formatMinorCurrency(payment.amountMinor, payment.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Метод</span>
                  <span className="font-medium text-black">{payment.method}</span>
                </div>
              </div>
            </PremiumCard>

            <div className="space-y-4">
              {isResolved ? (
                <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
                  <p className="text-sm text-black/46">Статус уже зафиксирован</p>
                  <p className="mt-3 text-lg font-medium text-black">
                    Payment уже обработан. Можно вернуться на страницу статуса заказа.
                  </p>
                  <div className="mt-5">
                    <PremiumButton asChild className="h-12 px-5">
                      <Link href={returnHref}>Открыть статус заказа</Link>
                    </PremiumButton>
                  </div>
                </PremiumCard>
              ) : (
                <>
                  <form action={resolveMockPaymentAction}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="outcome" value="success" />
                    <PremiumButton type="submit" className="h-12 w-full px-5 text-base">
                      Успешная оплата
                    </PremiumButton>
                  </form>

                  <form action={resolveMockPaymentAction}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="outcome" value="fail" />
                    <PremiumButton
                      type="submit"
                      tone="secondary"
                      className="h-12 w-full px-5 text-base"
                    >
                      Отклонить платёж
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
