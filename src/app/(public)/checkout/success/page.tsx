import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CheckoutSuccessRedirect } from "@/components/checkout/checkout-success-redirect";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
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
  const courseId = getParam(resolvedSearchParams.courseId);
  const state = getParam(resolvedSearchParams.state);
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!courseId || (state !== "paid" && state !== "already-owned")) {
    notFound();
  }

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

  if (!course) {
    notFound();
  }

  const learnHref = `/learn/${course.id}`;
  const title =
    state === "paid" ? "Покупка подтверждена" : "Доступ уже был активен";
  const description =
    state === "paid"
      ? "Курс добавлен в learner-кабинет. Через пару секунд откроем обучение автоматически."
      : "Новый order не создавался, потому что этот курс уже есть в твоем доступе.";

  return (
    <div className="app-shell page-section">
      <div className="mx-auto max-w-3xl">
        <PremiumCard
          padding="lg"
          className="overflow-hidden rounded-[2.8rem] border-black/6 bg-white/94 text-center shadow-[0_28px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl"
        >
          <CheckoutSuccessRedirect href={learnHref} />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(61,59,255,0.14),transparent_28%),radial-gradient(circle_at_bottom,rgba(71,183,255,0.1),transparent_30%)]" />

          <div className="relative">
            <div className="mx-auto flex size-16 items-center justify-center rounded-[1.6rem] bg-[#eef0ff] text-[#3d3bff]">
              <CheckCircle2 className="size-8" />
            </div>

            <div className="mt-6 flex justify-center">
              <Badge variant="primary">
                {state === "paid" ? "Order paid" : "Already enrolled"}
              </Badge>
            </div>

            <h1 className="mt-6 text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[0.96] tracking-tight text-black">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-black/58">
              {description}
            </p>

            <PremiumCard
              padding="lg"
              className="mx-auto mt-8 max-w-2xl rounded-[2rem] border-black/6 bg-[#f7f8fb]"
            >
              <p className="text-sm text-black/46">Курс</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-black">
                {course.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/56">
                {course.description}
              </p>
            </PremiumCard>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
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
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-4 py-3 text-sm text-white/72">
              <Sparkles className="size-4 text-[#77dbe7]" />
              <span>Автопереход в обучение включен.</span>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
