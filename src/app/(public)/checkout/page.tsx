import { randomUUID } from "crypto";
import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import {
  PUBLIC_FORM_HONEYPOT_FIELD,
  PUBLIC_FORM_STARTED_AT_FIELD,
} from "@/lib/public-form-security";
import { formatMinorCurrency } from "@/lib/utils";
import { startPublicCheckoutAction } from "@/server/billing/actions";
import { getCheckoutPageData } from "@/server/billing/service";
import { getServerAuthSession } from "@/server/auth/session";

type CheckoutPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

const trackingKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
] as const;

const paymentOptions = [
  {
    value: "CARD",
    title: "Карта",
    description: "Обычная оплата картой через PaymentProvider.",
    icon: CreditCard,
  },
  {
    value: "SBP",
    title: "СБП",
    description: "Быстрый перевод по QR или банковскому приложению.",
    icon: QrCode,
  },
  {
    value: "INSTALLMENT",
    title: "Рассрочка",
    description: "Редирект в InstallmentProvider, доступ после подтверждения вебхуком.",
    icon: WalletCards,
  },
] as const;

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const courseSlug = getParam(resolvedSearchParams.course);
  const session = await getServerAuthSession();

  if (!courseSlug) {
    notFound();
  }

  if (!session?.user) {
    const callbackQuery = new URLSearchParams();
    callbackQuery.set("course", courseSlug);

    for (const key of trackingKeys) {
      const value = getParam(resolvedSearchParams[key]);

      if (value) {
        callbackQuery.set(key, value);
      }
    }

    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout?${callbackQuery.toString()}`)}`);
  }

  if (session.user.role === "AUTHOR") {
    redirect("/forbidden");
  }

  const checkout = await getCheckoutPageData(courseSlug, session.user.id);

  if (!checkout) {
    notFound();
  }

  const checkoutSessionKey = randomUUID();
  const defaultTariff =
    checkout.course.tariffs.find((tariff) => tariff.isDefault) ??
    checkout.course.tariffs[0];
  const learnHref = `/learn/${checkout.course.id}`;

  return (
    <div className="app-shell page-section">
      <div className="mx-auto max-w-6xl">
        <PremiumCard
          padding="lg"
          className="overflow-hidden rounded-[2.8rem] border-black/6 bg-white/94 shadow-[0_28px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.1),transparent_30%),radial-gradient(circle_at_top_right,rgba(71,183,255,0.08),transparent_28%)]" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <Badge variant="primary">Checkout</Badge>
              <h1 className="mt-5 text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.96] tracking-tight text-black">
                {checkout.course.viewer.isEnrolled
                  ? "Доступ уже активен"
                  : `Оформи ${checkout.course.title}`}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-black/58">
                {checkout.course.viewer.isEnrolled
                  ? "Курс уже есть в твоём доступе. Второй order не создадим, можно просто вернуться в обучение."
                  : "Checkout идёт через provider abstraction: мы создаём pending order, ждём подтверждение провайдера и выдаём доступ только после подтверждённого статуса."}
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Цена фиксируется внутри Order и не меняется, даже если курс подорожает позже.",
                  "Повторный submit не плодит второй order: работает idempotency/reuse pending checkout.",
                  "Фискальный чек и платёжные данные карт остаются на стороне провайдера.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[1.5rem] bg-[#f5f7fb] px-4 py-4"
                  >
                    <CheckCircle2 className="size-5 text-[#3d3bff]" />
                    <p className="text-sm font-medium text-black">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <div className="rounded-full border border-black/6 bg-white/82 px-4 py-3 text-sm font-medium text-black/62 backdrop-blur-xl">
                  {checkout.course.category}
                </div>
                <div className="rounded-full border border-black/6 bg-white/82 px-4 py-3 text-sm font-medium text-black/62 backdrop-blur-xl">
                  {checkout.course.level}
                </div>
                <div className="rounded-full border border-black/6 bg-white/82 px-4 py-3 text-sm font-medium text-black/62 backdrop-blur-xl">
                  Автор: {checkout.course.authorName}
                </div>
              </div>

              {checkout.course.viewer.isEnrolled ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <PremiumButton asChild className="h-14 px-7 text-base">
                    <Link href={learnHref}>Перейти к обучению</Link>
                  </PremiumButton>
                  <PremiumButton
                    asChild
                    tone="secondary"
                    className="h-14 px-7 text-base"
                  >
                    <Link href={`/courses/${checkout.course.slug}`}>Вернуться к курсу</Link>
                  </PremiumButton>
                </div>
              ) : (
                <form action={startPublicCheckoutAction} className="mt-8 space-y-6">
                  <input type="hidden" name="courseId" value={checkout.course.id} />
                  <input
                    type="hidden"
                    name="checkoutSessionKey"
                    value={checkoutSessionKey}
                  />
                  <input
                    type="hidden"
                    name={PUBLIC_FORM_STARTED_AT_FIELD}
                    value={String(Date.now())}
                  />
                  <input
                    type="text"
                    name={PUBLIC_FORM_HONEYPOT_FIELD}
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                  />

                  {trackingKeys.map((key) => {
                    const value = getParam(resolvedSearchParams[key]);
                    return value ? (
                      <input key={key} type="hidden" name={key} value={value} />
                    ) : null;
                  })}

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-black">ФИО для заказа</span>
                      <input
                        name="billingFullName"
                        defaultValue={session.user.name ?? ""}
                        className="h-[54px] w-full rounded-[1.2rem] border border-black/10 bg-[#f8f8f8] px-4 text-sm outline-none transition duration-200 focus:border-[#3d3bff]/35 focus:bg-white"
                        placeholder="Как в договоре / счёте"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-black">Email</span>
                      <input
                        name="billingEmail"
                        defaultValue={session.user.email ?? ""}
                        className="h-[54px] w-full rounded-[1.2rem] border border-black/10 bg-[#f8f8f8] px-4 text-sm outline-none transition duration-200 focus:border-[#3d3bff]/35 focus:bg-white"
                        placeholder="email@example.com"
                        type="email"
                      />
                    </label>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-black">Тариф</p>
                    <div className="mt-3 grid gap-3">
                      {checkout.course.tariffs.map((tariff) => (
                        <label
                          key={tariff.id ?? tariff.title}
                          className="flex cursor-pointer items-start gap-3 rounded-[1.6rem] border border-black/10 bg-[#fafbff] px-4 py-4 transition duration-200 hover:border-[#3d3bff]/20 hover:bg-white"
                        >
                          <input
                            type="radio"
                            name="tariffId"
                            value={tariff.id ?? ""}
                            defaultChecked={defaultTariff?.id === tariff.id}
                            className="mt-1 size-4 border-black/20"
                          />
                          <span className="block flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-black">
                                {tariff.title}
                              </span>
                              {tariff.isDefault ? (
                                <Badge variant="subtle">По умолчанию</Badge>
                              ) : null}
                              {tariff.isFallback ? (
                                <Badge variant="subtle">Fallback</Badge>
                              ) : null}
                            </span>
                            {tariff.description ? (
                              <span className="mt-1 block text-sm text-black/56">
                                {tariff.description}
                              </span>
                            ) : null}
                            {tariff.features.length ? (
                              <span className="mt-3 block text-sm text-black/52">
                                {tariff.features.join(" · ")}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-sm font-semibold text-black">
                            {formatMinorCurrency(tariff.priceMinor, tariff.currency)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {paymentOptions.map((option) => {
                      const Icon = option.icon;

                      return (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-start gap-3 rounded-[1.6rem] border border-black/10 bg-[#fafbff] px-4 py-4 transition duration-200 hover:border-[#3d3bff]/20 hover:bg-white"
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={option.value}
                            defaultChecked={option.value === "CARD"}
                            className="mt-1 size-4 border-black/20"
                          />
                          <span className="block">
                            <span className="flex items-center gap-2 text-sm font-medium text-black">
                              <Icon className="size-4 text-[#3d3bff]" />
                              {option.title}
                            </span>
                            <span className="mt-1 block text-sm text-black/56">
                              {option.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-black">Промокод</span>
                    <input
                      name="promoCode"
                      className="h-[54px] w-full rounded-[1.2rem] border border-black/10 bg-[#f8f8f8] px-4 text-sm uppercase outline-none transition duration-200 focus:border-[#3d3bff]/35 focus:bg-white"
                      placeholder="Например: NOWA10"
                    />
                  </label>

                  <label className="flex items-start gap-3 rounded-[1.6rem] border border-black/10 bg-[#f7f8ff] px-4 py-4 text-sm text-black/62">
                    <input
                      required
                      type="checkbox"
                      name="checkoutLegalConsent"
                      className="mt-1 size-4 rounded border-black/20"
                    />
                    <span>
                      Подтверждаю согласие с публичной офертой и политикой возвратов
                      для этого заказа.
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <PremiumButton type="submit" className="h-14 px-7 text-base">
                      <ShieldCheck className="mr-2 size-4" />
                      Перейти к оплате
                    </PremiumButton>
                    <PremiumButton asChild tone="secondary" className="h-14 px-7 text-base">
                      <Link href={`/courses/${checkout.course.slug}`}>Вернуться к курсу</Link>
                    </PremiumButton>
                  </div>
                </form>
              )}
            </div>

            <div className="space-y-4">
              <PremiumCard
                padding="lg"
                className="rounded-[2.3rem] border-black/6 bg-white/86 backdrop-blur-xl"
              >
                <p className="text-sm text-black/48">В заказе</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-black">
                  {checkout.course.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-black/56">
                  {checkout.course.description}
                </p>

                <div className="mt-6 space-y-3">
                  {checkout.course.tariffs.map((tariff) => (
                    <div
                      key={`summary-${tariff.id ?? tariff.title}`}
                      className="flex items-center justify-between gap-3 rounded-[1.4rem] bg-[#f7f8fb] px-4 py-4 text-sm"
                    >
                      <div>
                        <p className="font-medium text-black">{tariff.title}</p>
                        <p className="text-black/46">{tariff.currency}</p>
                      </div>
                      <p className="font-semibold text-black">
                        {formatMinorCurrency(tariff.priceMinor, tariff.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </PremiumCard>

              <PremiumCard
                padding="lg"
                className="rounded-[2.3rem] border-transparent bg-black text-white"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                    {checkout.course.viewer.isEnrolled ? (
                      <ShieldCheck className="size-5" />
                    ) : (
                      <LockKeyhole className="size-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-white/56">
                      {checkout.course.viewer.isEnrolled ? "Статус" : "Безопасность"}
                    </p>
                    <p className="mt-2 text-lg font-medium leading-7 text-white">
                      {checkout.course.viewer.isEnrolled
                        ? "Курс уже в доступе. При повторном заходе checkout не создаст лишний платёж."
                        : "Доступ выдаётся только на сервере после подтверждённой оплаты или подтверждённой рассрочки."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm text-white/68">
                  <Sparkles className="size-4 text-[#77dbe7]" />
                  <span>Провайдеры подключаются через интерфейсы и mock/live-адаптеры.</span>
                </div>
              </PremiumCard>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
