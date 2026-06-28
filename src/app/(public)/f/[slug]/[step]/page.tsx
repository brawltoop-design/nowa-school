import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  QrCode,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CourseSalesPageRenderer } from "@/components/sales-page/course-sales-page-renderer";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  buildFunnelStepHref,
  resolveNextStepKey,
} from "@/lib/funnels";
import {
  PUBLIC_FORM_HONEYPOT_FIELD,
  PUBLIC_FORM_STARTED_AT_FIELD,
} from "@/lib/public-form-security";
import { formatCurrency } from "@/lib/utils";
import { getServerAuthSession } from "@/server/auth/session";
import {
  completeFunnelCheckout,
  prepareFunnelStepRender,
  respondToFunnelOffer,
  startFunnelVisit,
  submitFunnelLeadCapture,
} from "@/server/funnels/actions";
import {
  findFunnelEntryStep,
  findFunnelStep,
  getRuntimeFunnelData,
} from "@/server/funnels/queries";

type FunnelStepPageProps = {
  params: Promise<{ slug: string; step: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function StepNote({
  eyebrow,
  note,
}: {
  eyebrow: string;
  note: string;
}) {
  if (!eyebrow && !note) {
    return null;
  }

  return (
    <PremiumCard
      padding="lg"
      className="mb-6 rounded-[2.3rem] border-black/6 bg-white/92 shadow-[0_18px_70px_rgba(15,23,42,0.06)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        {eyebrow ? <Badge variant="primary">{eyebrow}</Badge> : null}
        {note ? <p className="text-sm text-black/56">{note}</p> : null}
      </div>
    </PremiumCard>
  );
}

export default async function FunnelStepPage({
  params,
  searchParams,
}: FunnelStepPageProps) {
  const { slug, step: stepKey } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const visitId = getParam(resolvedSearchParams.visit);
  const preview = getParam(resolvedSearchParams.preview) === "1";
  const fromStepId = getParam(resolvedSearchParams.from);
  const fromVariant = getParam(resolvedSearchParams.fromVariant);
  const session = await getServerAuthSession();

  const runtime = await getRuntimeFunnelData({
    slug,
    preview,
    actor: session?.user
      ? {
          userId: session.user.id,
          role: session.user.role,
        }
      : null,
  });

  if (!runtime) {
    notFound();
  }

  const entryStep = findFunnelEntryStep(runtime.steps, runtime.funnel.entryStepId);
  const requestedStep = findFunnelStep(runtime.steps, stepKey);

  if (!entryStep || !requestedStep) {
    notFound();
  }

  if (!visitId) {
    if (requestedStep.id !== entryStep.id) {
      redirect(`/f/${slug}${preview ? "?preview=1" : ""}`);
    }

    const visit = await startFunnelVisit({
      funnelId: runtime.funnel.id,
      entryStepId: entryStep.id,
      userId: session?.user?.id ?? null,
    });

    redirect(
      buildFunnelStepHref(slug, entryStep.key, {
        visitId: visit.id,
        preview,
      }),
    );
  }

  const prepared = await prepareFunnelStepRender({
    funnelId: runtime.funnel.id,
    funnelSlug: runtime.funnel.slug,
    visitId,
    step: requestedStep,
    entryStep,
    steps: runtime.steps,
    preview,
    fromStepId,
    fromVariant,
    userId: session?.user?.id ?? null,
  });

  if (prepared.redirectTo) {
    redirect(prepared.redirectTo);
  }

  const nextDefaultKey =
    resolveNextStepKey(requestedStep.transitions, "default") ||
    resolveNextStepKey(requestedStep.transitions, "submit") ||
    resolveNextStepKey(requestedStep.transitions, "paid");
  const nextDefaultStep = runtime.steps.find((candidate) => candidate.key === nextDefaultKey) ?? null;

  if (requestedStep.type === "CHECKOUT" && !session?.user) {
    const callbackUrl = buildFunnelStepHref(slug, requestedStep.key, {
      visitId: prepared.visit.id,
      preview,
    });
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (requestedStep.type === "CHECKOUT" && session?.user.role === "AUTHOR") {
    redirect("/forbidden");
  }

  if (requestedStep.type === "LANDING") {
    return (
      <div className="pb-16">
        <div className="app-shell pt-8 sm:pt-10">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm font-medium text-black/48 transition duration-200 hover:text-black"
          >
            <ArrowLeft className="size-4" />
            Назад к каталогу
          </Link>
        </div>

        <div className="app-shell pt-6">
          <StepNote
            eyebrow={prepared.renderedConfig.eyebrow}
            note={prepared.renderedConfig.note}
          />

          <CourseSalesPageRenderer
            course={runtime.course}
            salesPage={runtime.salesPage}
            mode="public"
            primaryHref={
              nextDefaultStep
                ? buildFunnelStepHref(slug, nextDefaultStep.key, {
                    visitId: prepared.visit.id,
                    preview,
                    fromStepId: requestedStep.id,
                    fromVariant: prepared.variant,
                  })
                : `/courses/${runtime.course.slug}`
            }
            primaryLabel={prepared.renderedConfig.primaryLabel}
            secondaryHref={`/courses/${runtime.course.slug}`}
            secondaryLabel={
              prepared.renderedConfig.secondaryLabel || "Открыть страницу курса"
            }
          />
        </div>
      </div>
    );
  }

  if (requestedStep.type === "LEAD_CAPTURE") {
    return (
      <div className="app-shell page-section">
        <div className="mx-auto max-w-3xl">
          <PremiumCard padding="lg" className="rounded-[2.8rem] bg-white/92 backdrop-blur-xl">
            <Badge variant="primary">{prepared.renderedConfig.eyebrow}</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {prepared.renderedConfig.headline}
            </h1>
            <p className="mt-4 text-sm leading-8 text-black/56">
              {prepared.renderedConfig.description}
            </p>

            {prepared.renderedConfig.bullets.length ? (
              <div className="mt-6 space-y-3">
                {prepared.renderedConfig.bullets.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[1.5rem] bg-[#f7f8ff] px-4 py-4"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 text-[#3d3bff]" />
                    <p className="text-sm text-black/62">{item}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <form action={submitFunnelLeadCapture} className="mt-8 space-y-4">
              <input type="hidden" name="funnelId" value={runtime.funnel.id} />
              <input type="hidden" name="stepId" value={requestedStep.id} />
              <input type="hidden" name="visitId" value={prepared.visit.id} />
              <input type="hidden" name="variant" value={prepared.variant} />
              <input type="hidden" name="preview" value={preview ? "true" : ""} />
              <input type="hidden" name={PUBLIC_FORM_STARTED_AT_FIELD} value={String(Date.now())} />
              <input type="text" name={PUBLIC_FORM_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" className="hidden" />

              <Input
                name="fullName"
                placeholder="Имя и фамилия"
                defaultValue={prepared.visit.leadName ?? ""}
                className="h-12 rounded-2xl"
              />
              <Input
                name="email"
                required
                type="email"
                placeholder="Email"
                defaultValue={prepared.visit.leadEmail ?? ""}
                className="h-12 rounded-2xl"
              />
              <Input
                name="telegramUsername"
                placeholder="Telegram username"
                defaultValue={prepared.visit.telegramUsername ?? ""}
                className="h-12 rounded-2xl"
              />

              <div className="space-y-3 rounded-[1.6rem] border border-black/8 bg-[#f7f8ff] px-4 py-4 text-sm text-black/62">
                <label className="flex items-start gap-3">
                  <input
                    required
                    type="checkbox"
                    name="personalDataConsent"
                    defaultChecked={prepared.visit.personalDataConsentGranted}
                    className="mt-1 size-4 rounded border-black/20"
                  />
                  <span>
                    Согласен на обработку персональных данных для получения
                    материалов и ответа по заявке.
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="emailMarketingConsent"
                    defaultChecked={prepared.visit.emailConsentGranted}
                    className="mt-1 size-4 rounded border-black/20"
                  />
                  <span>Можно присылать follow-up письма на email.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="telegramMarketingConsent"
                    defaultChecked={prepared.visit.telegramConsentGranted}
                    className="mt-1 size-4 rounded border-black/20"
                  />
                  <span>Можно писать дожимы и напоминания в Telegram.</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <PremiumButton type="submit" className="h-12 px-6">
                  {prepared.renderedConfig.primaryLabel}
                  <ChevronRight className="ml-2 size-4" />
                </PremiumButton>
                <PremiumButton asChild tone="secondary" className="h-12 px-6">
                  <Link href={`/courses/${runtime.course.slug}`}>
                    Вернуться к курсу
                  </Link>
                </PremiumButton>
              </div>
            </form>
          </PremiumCard>
        </div>
      </div>
    );
  }

  if (requestedStep.type === "CHECKOUT") {
    const total =
      runtime.course.price +
      (prepared.renderedConfig.orderBumpEnabled
        ? prepared.renderedConfig.orderBumpAmount
        : 0);

    return (
      <div className="app-shell page-section">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <PremiumCard padding="lg" className="rounded-[2.8rem] bg-white/92 backdrop-blur-xl">
            <Badge variant="primary">{prepared.renderedConfig.eyebrow}</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {prepared.renderedConfig.headline}
            </h1>
            <p className="mt-4 text-sm leading-8 text-black/56">
              {prepared.renderedConfig.description}
            </p>

            <form action={completeFunnelCheckout} className="mt-8 space-y-4">
              <input type="hidden" name="funnelId" value={runtime.funnel.id} />
              <input type="hidden" name="stepId" value={requestedStep.id} />
              <input type="hidden" name="visitId" value={prepared.visit.id} />
              <input type="hidden" name="variant" value={prepared.variant} />
              <input type="hidden" name="preview" value={preview ? "true" : ""} />
              <input type="hidden" name={PUBLIC_FORM_STARTED_AT_FIELD} value={String(Date.now())} />
              <input type="text" name={PUBLIC_FORM_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" className="hidden" />

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    value: "CARD",
                    label: "Карта",
                    description: "Стандартная оплата",
                    icon: CreditCard,
                  },
                  {
                    value: "SBP",
                    label: "СБП",
                    description: "Через QR / банк",
                    icon: QrCode,
                  },
                  {
                    value: "INSTALLMENT",
                    label: "Рассрочка",
                    description: "Редирект в провайдера",
                    icon: WalletCards,
                  },
                ].map((option) => {
                  const Icon = option.icon;

                  return (
                    <label
                      key={option.value}
                      className="flex items-start gap-3 rounded-[1.6rem] border border-black/10 bg-[#fafbff] px-4 py-4"
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        defaultChecked={option.value === "CARD"}
                        className="mt-1 size-4 border-black/20"
                      />
                      <span>
                        <span className="flex items-center gap-2 text-sm font-medium text-black">
                          <Icon className="size-4 text-[#3d3bff]" />
                          {option.label}
                        </span>
                        <span className="mt-1 block text-sm text-black/56">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {prepared.renderedConfig.orderBumpEnabled ? (
                <label className="flex items-start gap-3 rounded-[1.6rem] border border-black/10 bg-[#f7f8ff] px-4 py-4">
                  <input
                    type="checkbox"
                    name="orderBumpSelected"
                    className="mt-1 size-4 rounded border-black/20"
                  />
                  <span>
                    <span className="block text-sm font-medium text-black">
                      {prepared.renderedConfig.orderBumpTitle}{" "}
                      {prepared.renderedConfig.orderBumpAmount > 0
                        ? `+${prepared.renderedConfig.orderBumpAmount} ${prepared.renderedConfig.orderBumpCurrency}`
                        : null}
                    </span>
                    <span className="mt-1 block text-sm text-black/56">
                      {prepared.renderedConfig.orderBumpDescription}
                    </span>
                  </span>
                </label>
              ) : null}

              <label className="flex items-start gap-3 rounded-[1.6rem] border border-black/10 bg-[#f7f8ff] px-4 py-4 text-sm text-black/62">
                <input
                  required
                  type="checkbox"
                  name="checkoutLegalConsent"
                  className="mt-1 size-4 rounded border-black/20"
                />
                <span>
                  Подтверждаю согласие с офертой и политикой возвратов для этого заказа.
                </span>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <PremiumButton type="submit" className="h-12 px-6">
                  <ShieldCheck className="mr-2 size-4" />
                  {prepared.renderedConfig.primaryLabel}
                </PremiumButton>
                <PremiumButton asChild tone="secondary" className="h-12 px-6">
                  <Link href={`/courses/${runtime.course.slug}`}>
                    Вернуться к курсу
                  </Link>
                </PremiumButton>
              </div>
            </form>
          </PremiumCard>

          <div className="space-y-4">
            <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
              <p className="text-sm text-black/48">Ваш заказ</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-black">
                {runtime.course.title}
              </h2>
              <p className="mt-2 text-sm text-black/56">
                {runtime.course.author.name} · {runtime.course.category} · {runtime.course.level}
              </p>

              <div className="mt-5 space-y-3 text-sm text-black/58">
                <div className="flex items-center justify-between gap-3">
                  <span>Курс</span>
                  <span>{formatCurrency(runtime.course.price, runtime.course.currency)}</span>
                </div>
                {prepared.renderedConfig.orderBumpEnabled ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Order bump</span>
                    <span>
                      +{formatCurrency(
                        prepared.renderedConfig.orderBumpAmount,
                        prepared.renderedConfig.orderBumpCurrency,
                      )}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3 border-t border-black/8 pt-3">
                  <span>Максимальный total</span>
                  <span className="font-semibold text-black">
                    {formatCurrency(total, runtime.course.currency)}
                  </span>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard padding="lg" className="rounded-[2.3rem] border-transparent bg-black text-white">
              <p className="text-sm text-white/56">Идемпотентность</p>
              <p className="mt-3 text-sm leading-7 text-white/72">
                Если пользователь обновит страницу или повторно отправит checkout,
                сервер использует тот же session key и не создаст второй заказ.
              </p>
            </PremiumCard>
          </div>
        </div>
      </div>
    );
  }

  if (requestedStep.type === "UPSELL" || requestedStep.type === "DOWNSELL") {
    return (
      <div className="app-shell page-section">
        <div className="mx-auto max-w-3xl">
          <PremiumCard padding="lg" className="rounded-[2.8rem] bg-white/92 backdrop-blur-xl">
            <Badge variant="primary">{prepared.renderedConfig.eyebrow}</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {prepared.renderedConfig.headline}
            </h1>
            <p className="mt-4 text-sm leading-8 text-black/56">
              {prepared.renderedConfig.description}
            </p>

            <div className="mt-6 rounded-[1.8rem] bg-[#f7f8ff] px-5 py-5">
              <p className="text-sm text-black/48">Оффер</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
                {prepared.renderedConfig.priceLabel || "Доп. предложение"}
              </p>
            </div>

            {prepared.renderedConfig.bullets.length ? (
              <div className="mt-6 space-y-3">
                {prepared.renderedConfig.bullets.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[1.5rem] bg-[#f7f8ff] px-4 py-4"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 text-[#3d3bff]" />
                    <p className="text-sm text-black/62">{item}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <form action={respondToFunnelOffer}>
                <input type="hidden" name="funnelId" value={runtime.funnel.id} />
                <input type="hidden" name="stepId" value={requestedStep.id} />
                <input type="hidden" name="visitId" value={prepared.visit.id} />
                <input type="hidden" name="variant" value={prepared.variant} />
                <input type="hidden" name="preview" value={preview ? "true" : ""} />
                <input type="hidden" name="decision" value="accept" />
                <PremiumButton type="submit" className="h-12 px-6">
                  {prepared.renderedConfig.primaryLabel}
                </PremiumButton>
              </form>

              <form action={respondToFunnelOffer}>
                <input type="hidden" name="funnelId" value={runtime.funnel.id} />
                <input type="hidden" name="stepId" value={requestedStep.id} />
                <input type="hidden" name="visitId" value={prepared.visit.id} />
                <input type="hidden" name="variant" value={prepared.variant} />
                <input type="hidden" name="preview" value={preview ? "true" : ""} />
                <input type="hidden" name="decision" value="decline" />
                <PremiumButton type="submit" tone="secondary" className="h-12 px-6">
                  {prepared.renderedConfig.secondaryLabel || "Пропустить"}
                </PremiumButton>
              </form>
            </div>
          </PremiumCard>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell page-section">
      <div className="mx-auto max-w-3xl">
        <PremiumCard padding="lg" className="rounded-[2.8rem] bg-white/92 backdrop-blur-xl">
          <Badge variant="primary">{prepared.renderedConfig.eyebrow}</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            {prepared.renderedConfig.headline}
          </h1>
          <p className="mt-4 text-sm leading-8 text-black/56">
            {prepared.renderedConfig.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <PremiumButton asChild className="h-12 px-6">
              <Link href={session?.user ? `/learn/${runtime.course.id}` : "/login"}>
                {prepared.renderedConfig.primaryLabel || "Перейти к обучению"}
              </Link>
            </PremiumButton>
            <PremiumButton asChild tone="secondary" className="h-12 px-6">
              <Link href="/courses">
                {prepared.renderedConfig.secondaryLabel || "К каталогу"}
              </Link>
            </PremiumButton>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
