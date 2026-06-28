import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, RotateCcw, Sparkles } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CheckoutPendingRefresh } from "@/components/checkout/checkout-pending-refresh";
import { CheckoutSuccessRedirect } from "@/components/checkout/checkout-success-redirect";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import {
  type CheckoutReturnState,
  getCheckoutReturnState,
} from "@/server/billing/service";
import { getServerAuthSession } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const orderId = getParam(resolvedSearchParams.orderId);
  const courseId = getParam(resolvedSearchParams.courseId);
  const legacyState = getParam(resolvedSearchParams.state);
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  let data:
    | Awaited<ReturnType<typeof getCheckoutReturnState>>
    | {
        courseId: string;
        courseSlug: string;
        courseTitle: string;
        courseDescription: string;
        state: CheckoutReturnState;
        primaryHref: string;
        primaryLabel: string;
        secondaryHref: string;
        secondaryLabel: string;
        autoRedirectHref: string | null;
        orderId: string | null;
      }
    | null = null;

  if (orderId) {
    data = await getCheckoutReturnState(orderId).catch(() => null);
  } else if (
    courseId &&
    (legacyState === "paid" || legacyState === "already-owned")
  ) {
    const prisma = getPrismaClient();
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
      },
    });

    if (course) {
      data = {
        courseId: course.id,
        courseSlug: course.slug,
        courseTitle: course.title,
        courseDescription: course.description,
        state: legacyState,
        primaryHref: `/learn/${course.id}`,
        primaryLabel: "Перейти к обучению",
        secondaryHref: `/courses/${course.slug}`,
        secondaryLabel: "Вернуться к курсу",
        autoRedirectHref: `/learn/${course.id}`,
        orderId: null,
      };
    }
  }

  if (!data) {
    notFound();
  }

  const stateMeta: Record<
    CheckoutReturnState,
    {
      badge: string;
      title: string;
      description: string;
      icon: typeof CheckCircle2;
    }
  > = {
    paid: {
      badge: "Оплата подтверждена",
      title: "Всё прошло, доступ открыт",
      description:
        "Платёж подтверждён на сервере. Сейчас переведём тебя в следующий шаг: обучение или post-purchase часть воронки.",
      icon: CheckCircle2,
    },
    "already-owned": {
      badge: "Доступ уже был",
      title: "Повторная покупка не понадобилась",
      description:
        "Система увидела активный доступ и не создала лишний order. Можно сразу вернуться в обучение или продолжить воронку.",
      icon: CheckCircle2,
    },
    pending: {
      badge: "Ждём подтверждение",
      title: "Проверяем статус оплаты",
      description:
        "Order уже создан, но вебхук провайдера ещё не подтвердил оплату. Эта страница обновится сама, как только статус изменится.",
      icon: Clock3,
    },
    failed: {
      badge: "Оплата не прошла",
      title: "Платёж не подтвердился",
      description:
        "Провайдер вернул отказ или ошибка не дала завершить платёж. Можно вернуться в checkout и попробовать ещё раз.",
      icon: AlertCircle,
    },
    refunded: {
      badge: "Возврат выполнен",
      title: "Заказ переведён в возврат",
      description:
        "Мы зафиксировали полный или финализированный возврат и синхронизировали доступ с серверной стороной.",
      icon: RotateCcw,
    },
  };
  const meta = stateMeta[data.state];
  const StateIcon = meta.icon;
  const showAutoRedirect = Boolean(data.autoRedirectHref);

  return (
    <div className="app-shell page-section">
      <div className="mx-auto max-w-3xl">
        <PremiumCard
          padding="lg"
          className="overflow-hidden rounded-[2.8rem] border-black/6 bg-white/94 text-center shadow-[0_28px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl"
        >
          {showAutoRedirect && data.autoRedirectHref ? (
            <CheckoutSuccessRedirect href={data.autoRedirectHref} />
          ) : null}
          {data.state === "pending" ? <CheckoutPendingRefresh /> : null}

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(61,59,255,0.14),transparent_28%),radial-gradient(circle_at_bottom,rgba(71,183,255,0.1),transparent_30%)]" />

          <div className="relative">
            <div className="mx-auto flex size-16 items-center justify-center rounded-[1.6rem] bg-[#eef0ff] text-[#3d3bff]">
              <StateIcon className="size-8" />
            </div>

            <div className="mt-6 flex justify-center">
              <Badge variant={data.state === "failed" ? "subtle" : "primary"}>
                {meta.badge}
              </Badge>
            </div>

            <h1 className="mt-6 text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[0.96] tracking-tight text-black">
              {meta.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-black/58">
              {meta.description}
            </p>

            <PremiumCard
              padding="lg"
              className="mx-auto mt-8 max-w-2xl rounded-[2rem] border-black/6 bg-[#f7f8fb]"
            >
              <p className="text-sm text-black/46">
                {data.orderId ? `Order ${data.orderId}` : "Курс"}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-black">
                {data.courseTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/56">
                {data.courseDescription}
              </p>
            </PremiumCard>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <PremiumButton asChild className="h-14 px-7 text-base">
                <Link href={data.primaryHref}>{data.primaryLabel}</Link>
              </PremiumButton>
              <PremiumButton
                asChild
                tone="secondary"
                className="h-14 px-7 text-base"
              >
                <Link href={data.secondaryHref}>{data.secondaryLabel}</Link>
              </PremiumButton>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-4 py-3 text-sm text-white/72">
              <Sparkles className="size-4 text-[#77dbe7]" />
              <span>
                {showAutoRedirect
                  ? "Автопереход включен."
                  : data.state === "pending"
                    ? "Статус синхронизируется автоматически."
                    : "Серверная синхронизация уже выполнена."}
              </span>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
