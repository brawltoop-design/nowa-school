import Link from "next/link";
import {
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { MockCheckoutSubmitButton } from "@/components/checkout/mock-checkout-submit-button";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import {
  calculateAuthorRevenue,
  calculatePlatformFee,
} from "@/lib/payments";
import { formatCurrency } from "@/lib/utils";
import { completeMockCheckout } from "@/server/checkout/actions";
import { getServerAuthSession } from "@/server/auth/session";
import { getPublishedCourseBySlug } from "@/server/public-courses";

type MockCheckoutPageProps = {
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

export default async function MockCheckoutPage({
  searchParams,
}: MockCheckoutPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const courseSlug = getParam(resolvedSearchParams.course);
  const session = await getServerAuthSession();

  if (!session?.user) {
    const callbackUrl = `/checkout/mock?course=${encodeURIComponent(courseSlug)}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (session.user.role === "AUTHOR") {
    redirect("/forbidden");
  }

  if (!courseSlug) {
    notFound();
  }

  const course = await getPublishedCourseBySlug(courseSlug, session.user.id);

  if (!course) {
    notFound();
  }

  const platformFee = calculatePlatformFee(course.price);
  const authorRevenue = calculateAuthorRevenue(course.price);
  const learnHref = `/learn/${course.id}`;

  return (
    <div className="app-shell page-section">
      <div className="mx-auto max-w-5xl">
        <PremiumCard
          padding="lg"
          className="overflow-hidden rounded-[2.8rem] border-black/6 bg-white/94 shadow-[0_28px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.1),transparent_30%),radial-gradient(circle_at_top_right,rgba(71,183,255,0.08),transparent_28%)]" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <Badge variant="primary">Безопасная демо-оплата</Badge>
              <h1 className="mt-5 text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.96] tracking-tight text-black">
                {course.viewer.isEnrolled
                  ? "Доступ уже открыт"
                  : "Подтверди покупку курса"}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-black/58">
                {course.viewer.isEnrolled
                  ? "Повторная покупка не создается. Курс уже в твоем кабинете, можно сразу продолжать обучение."
                  : "Сейчас это локальная демо-оплата без реального платежного шлюза. Мы создадим заказ, доступ к курсу и сразу откроем обучение."}
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Заказ создается со статусом PAID",
                  "Доступ к курсу открывается сразу после подтверждения",
                  "Комиссия платформы и доход автора считаются автоматически",
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
                  {course.category}
                </div>
                <div className="rounded-full border border-black/6 bg-white/82 px-4 py-3 text-sm font-medium text-black/62 backdrop-blur-xl">
                  {course.level}
                </div>
                <div className="rounded-full border border-black/6 bg-white/82 px-4 py-3 text-sm font-medium text-black/62 backdrop-blur-xl">
                  {course.metrics.lessonCount} уроков
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {course.viewer.isEnrolled ? (
                  <>
                    <PremiumButton asChild className="h-14 px-7 text-base">
                      <Link href={learnHref}>Перейти к обучению</Link>
                    </PremiumButton>
                    <PremiumButton
                      asChild
                      tone="secondary"
                      className="h-14 px-7 text-base"
                    >
                      <Link href={`/courses/${course.slug}`}>Вернуться к курсу</Link>
                    </PremiumButton>
                  </>
                ) : (
                  <form action={completeMockCheckout.bind(null, course.id)}>
                    {trackingKeys.map((key) => {
                      const value = getParam(resolvedSearchParams[key]);
                      return value ? (
                        <input key={key} type="hidden" name={key} value={value} />
                      ) : null;
                    })}
                    <MockCheckoutSubmitButton className="h-14 px-7 text-base" />
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <PremiumCard
                padding="lg"
                className="rounded-[2.3rem] border-black/6 bg-white/86 backdrop-blur-xl"
              >
                <p className="text-sm text-black/48">Ваш заказ</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-black">
                  {course.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-black/56">
                  {course.author.name} · {course.category} · {course.level}
                </p>

                <div className="mt-6 rounded-[1.8rem] bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.12),transparent_34%),linear-gradient(135deg,#f6f7fa_0%,#eef1ff_100%)] px-5 py-5">
                  <p className="text-sm text-black/48">Итого</p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight text-black">
                    {formatCurrency(course.price, course.currency)}
                  </p>
                </div>

                <div className="mt-5 space-y-3 text-sm text-black/58">
                  <div className="flex items-center justify-between gap-3">
                    <span>Платформа 15%</span>
                    <span>{formatCurrency(platformFee, course.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Автор 85%</span>
                    <span>{formatCurrency(authorRevenue, course.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>AI-усилен</span>
                    <span>{course.aiEnhanced ? "Да" : "Нет"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Отзывы</span>
                    <span>{course.metrics.reviewCount}</span>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard
                padding="lg"
                className="rounded-[2.3rem] border-transparent bg-black text-white"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                    {course.viewer.isEnrolled ? (
                      <ShieldCheck className="size-5" />
                    ) : (
                      <LockKeyhole className="size-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-white/56">
                      {course.viewer.isEnrolled ? "Статус" : "Надежность"}
                    </p>
                    <p className="mt-2 text-lg font-medium leading-7 text-white">
                      {course.viewer.isEnrolled
                        ? "Покупка уже есть, поэтому второй order не появится."
                        : "После подтверждения мы сразу откроем курс в кабинете ученика."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm text-white/68">
                  <Sparkles className="size-4 text-[#77dbe7]" />
                  <span>Сценарий без реального списания, но с настоящей бизнес-логикой MVP.</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-white/68">
                  <Wallet className="size-4 text-[#77dbe7]" />
                  <span>Деньги делятся на платформенную комиссию и доход автора автоматически.</span>
                </div>
              </PremiumCard>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
