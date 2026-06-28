import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowUpRight,
  Filter,
  GitBranch,
  Plus,
  Rocket,
  Target,
} from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { createFunnel } from "@/server/funnels/actions";
import { getAuthorFunnelsSummary } from "@/server/funnels/queries";
import { requireUserRole } from "@/server/auth/session";

const funnelStatusLabel = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликована",
  ARCHIVED: "Архив",
} as const;

export default async function AuthorFunnelsPage() {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/funnels");
  const data = await getAuthorFunnelsSummary({
    userId: session.user.id,
    role: session.user.role,
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Авторский кабинет", href: "/author" },
          { label: "Воронки" },
        ]}
      />

      <PremiumCard padding="lg" className="rounded-[2.8rem] bg-white/92 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <Badge variant="primary">Funnel Builder</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              Конструктор продающих воронок
            </h1>
            <p className="mt-4 text-sm leading-8 text-black/56">
              Собирай последовательность шагов поверх текущих sales pages:
              лид-форма, checkout, order bump, upsell/downsell и финальная
              выдача доступа с аналитикой по каждому переходу.
            </p>
          </div>

          <div className="grid min-w-[240px] gap-3 rounded-[2rem] bg-[#f7f8ff] p-4">
            <div className="rounded-[1.4rem] bg-white px-4 py-4">
              <p className="text-xs text-black/42">Всего воронок</p>
              <p className="mt-2 text-2xl font-semibold text-black">
                {data.funnels.length}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white px-4 py-4">
              <p className="text-xs text-black/42">Публичных</p>
              <p className="mt-2 text-2xl font-semibold text-black">
                {data.funnels.filter((funnel) => funnel.status === "PUBLISHED").length}
              </p>
            </div>
          </div>
        </div>
      </PremiumCard>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section>
          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
            <SectionHeader
              eyebrow="Новая воронка"
              title="Создать сценарий"
              description="Берем курс, поднимаем базовый шаблон и дальше редактируем шаги уже в деталке."
            />

            <form action={createFunnel} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Курс</label>
                <select
                  name="courseId"
                  required
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                >
                  <option value="">Выбери курс</option>
                  {data.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Название воронки</label>
                <Input
                  name="name"
                  required
                  placeholder="Например: Creative Studio AI funnel"
                  className="h-12 rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Slug</label>
                <Input
                  name="slug"
                  placeholder="creative-studio-ai"
                  className="h-12 rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Описание</label>
                <Textarea
                  name="description"
                  placeholder="Коротко: для какого оффера и трафика эта воронка."
                  className="min-h-[120px] rounded-[1.6rem]"
                />
              </div>

              <PremiumButton type="submit" className="h-12 w-full">
                <Plus className="mr-2 size-4" />
                Создать воронку
              </PremiumButton>
            </form>
          </PremiumCard>
        </section>

        <section className="space-y-6">
          <SectionHeader
            eyebrow="Мои сценарии"
            title="Все воронки автора"
            description="Здесь видно, сколько шагов в каждой воронке, сколько визитов она уже собрала и сколько денег провела."
          />

          {data.funnels.length ? (
            <div className="grid gap-5">
              {data.funnels.map((funnel) => (
                <PremiumCard
                  key={funnel.id}
                  padding="lg"
                  className="rounded-[2.2rem] border-black/8 bg-white/92"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={funnel.status === "PUBLISHED" ? "primary" : "subtle"}>
                          {funnelStatusLabel[funnel.status]}
                        </Badge>
                        <Badge variant="subtle">{funnel.course.title}</Badge>
                      </div>

                      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                        {funnel.name}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-black/56">
                        {funnel.description || "Без описания пока, но структура воронки уже готова к редактированию."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-sm text-black/48">
                        <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                          /f/{funnel.slug}
                        </span>
                        <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                          {funnel.stepCount} шагов
                        </span>
                        <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                          обновлено {format(new Date(funnel.updatedAt), "d MMM, HH:mm", { locale: ru })}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <PremiumButton asChild tone="secondary" className="h-11 px-5">
                        <Link href={`/author/funnels/${funnel.id}`}>
                          Открыть builder
                        </Link>
                      </PremiumButton>
                      <PremiumButton asChild className="h-11 px-5">
                        <Link href={funnel.status === "PUBLISHED" ? `/f/${funnel.slug}` : `/f/${funnel.slug}?preview=1`}>
                          Предпросмотр
                          <ArrowUpRight className="ml-2 size-4" />
                        </Link>
                      </PremiumButton>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    <div className="rounded-[1.4rem] bg-[#f7f8ff] px-4 py-4">
                      <p className="text-xs text-black/42">Визиты</p>
                      <p className="mt-2 text-xl font-semibold text-black">
                        {funnel.visitCount}
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] bg-[#f7f8ff] px-4 py-4">
                      <p className="text-xs text-black/42">Завершено</p>
                      <p className="mt-2 text-xl font-semibold text-black">
                        {funnel.completionCount}
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] bg-[#f7f8ff] px-4 py-4">
                      <p className="text-xs text-black/42">Оплат</p>
                      <p className="mt-2 text-xl font-semibold text-black">
                        {funnel.paidOrders}
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] bg-[#f7f8ff] px-4 py-4">
                      <p className="text-xs text-black/42">Выручка</p>
                      <p className="mt-2 text-xl font-semibold text-black">
                        {formatCurrency(funnel.revenue, "USD")}
                      </p>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          ) : (
            <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
              <EmptyState
                icon={GitBranch}
                title="Пока нет воронок"
                description="Создай первую, чтобы начать вести трафик не просто на страницу курса, а по управляемому сценарию шаг за шагом."
              />
            </PremiumCard>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Детерминированные переходы",
                text: "Каждый следующий шаг задается явно и логируется по визиту.",
              },
              {
                icon: Filter,
                title: "A/B и winrate",
                text: "Шаги умеют делить трафик пополам и показывать, какой вариант тянет лучше.",
              },
              {
                icon: Rocket,
                title: "Checkout без дублей",
                text: "Повторная отправка формы checkout не создает второй заказ благодаря idempotency key.",
              },
            ].map((item) => (
              <PremiumCard key={item.title} padding="lg" className="rounded-[2rem] bg-white/90">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                  <item.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-black">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-black/56">{item.text}</p>
              </PremiumCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
