import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Bot, Plus, Send, TimerReset, Zap } from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createAutomation } from "@/server/automations/actions";
import { getAuthorAutomationsSummary } from "@/server/automations/queries";
import { requireUserRole } from "@/server/auth/session";

const statusLabel = {
  DRAFT: "Черновик",
  ACTIVE: "Активна",
  PAUSED: "Пауза",
  ARCHIVED: "Архив",
} as const;

const triggerLabel = {
  LEAD_CAPTURED: "Лид оставил форму",
  ABANDONED_CHECKOUT: "Брошенная оплата",
  WEBINAR_REGISTERED: "Регистрация на вебинар",
  COURSE_INACTIVE_DAYS: "Не открыл курс N дней",
  MODULE_COMPLETED: "Завершил модуль",
  DAYS_AFTER_EVENT: "Через N дней после события",
} as const;

export default async function AuthorAutomationsPage() {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/automations");
  const data = await getAuthorAutomationsSummary({
    userId: session.user.id,
    role: session.user.role,
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Авторский кабинет", href: "/author" },
          { label: "Автоматизации" },
        ]}
      />

      <PremiumCard padding="lg" className="rounded-[2.8rem] bg-white/92 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <Badge variant="primary">Automation Engine</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              Отложенные и триггерные коммуникации
            </h1>
            <p className="mt-4 text-sm leading-8 text-black/56">
              Собирай цепочки на событиях формы, checkout, покупки и активности в
              курсе. Все шаги идут через durable queue и не разваливаются после
              перезапуска сервера.
            </p>
          </div>

          <div className="grid min-w-[250px] gap-3 rounded-[2rem] bg-[#f7f8ff] p-4">
            <div className="rounded-[1.4rem] bg-white px-4 py-4">
              <p className="text-xs text-black/42">Всего автоматизаций</p>
              <p className="mt-2 text-2xl font-semibold text-black">
                {data.automations.length}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white px-4 py-4">
              <p className="text-xs text-black/42">Активных</p>
              <p className="mt-2 text-2xl font-semibold text-black">
                {data.automations.filter((item) => item.status === "ACTIVE").length}
              </p>
            </div>
          </div>
        </div>
      </PremiumCard>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section>
          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
            <SectionHeader
              eyebrow="Новая цепочка"
              title="Создать автоматизацию"
              description="Можно начать с брошенной оплаты, nurture-последовательности или реактивации учеников."
            />

            <form action={createAutomation} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Название</label>
                <Input
                  name="name"
                  required
                  className="h-12 rounded-2xl"
                  placeholder="Например: Брошенная оплата Creator Economy"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Триггер</label>
                <select
                  name="triggerType"
                  defaultValue="ABANDONED_CHECKOUT"
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                >
                  {Object.entries(triggerLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Курс</label>
                <select
                  name="courseId"
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                >
                  <option value="">Любой курс автора</option>
                  {data.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Описание</label>
                <Textarea
                  name="description"
                  className="min-h-[120px] rounded-[1.6rem]"
                  placeholder="Кого ловим, какой goal и какой тон коммуникации."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">
                    Delay до входа, минут
                  </label>
                  <Input
                    name="delayMinutes"
                    type="number"
                    min="0"
                    defaultValue="60"
                    className="h-12 rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black">
                    Goal
                  </label>
                  <select
                    name="goalType"
                    defaultValue="COURSE_PURCHASED"
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                  >
                    <option value="COURSE_PURCHASED">Покупка курса</option>
                    <option value="NONE">Без авто-выхода</option>
                  </select>
                </div>
              </div>

              <PremiumButton type="submit" className="h-12 w-full">
                <Plus className="mr-2 size-4" />
                Создать автоматизацию
              </PremiumButton>
            </form>
          </PremiumCard>
        </section>

        <section className="space-y-6">
          <SectionHeader
            eyebrow="Все цепочки"
            title="Автоматизации автора"
            description="Здесь видно, сколько контактов вошло в цепочку, сколько сообщений ушло и где еще остались активные раннеры."
          />

          {data.automations.length ? (
            <div className="grid gap-5">
              {data.automations.map((automation) => (
                <PremiumCard
                  key={automation.id}
                  padding="lg"
                  className="rounded-[2.2rem] border-black/8 bg-white/92"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            automation.status === "ACTIVE" ? "primary" : "subtle"
                          }
                        >
                          {statusLabel[automation.status]}
                        </Badge>
                        <Badge variant="subtle">
                          {triggerLabel[
                            automation.triggerType as keyof typeof triggerLabel
                          ] ?? automation.triggerType}
                        </Badge>
                        {automation.courseTitle ? (
                          <Badge variant="subtle">{automation.courseTitle}</Badge>
                        ) : null}
                      </div>

                      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                        {automation.name}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-black/56">
                        {automation.description ||
                          "Описание можно дописать уже в деталке, вместе с фильтрами, goal и шагами цепочки."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-sm text-black/48">
                        <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                          /author/automations/{automation.slug}
                        </span>
                        <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                          {automation.stepCount} шагов
                        </span>
                        <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                          обновлено{" "}
                          {format(automation.updatedAt, "d MMM, HH:mm", {
                            locale: ru,
                          })}
                        </span>
                      </div>
                    </div>

                    <PremiumButton asChild className="h-11 px-5">
                      <Link href={`/author/automations/${automation.id}`}>
                        Открыть
                      </Link>
                    </PremiumButton>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    <div className="rounded-[1.4rem] bg-[#f7f8ff] px-4 py-4">
                      <p className="text-xs text-black/42">Вошло</p>
                      <p className="mt-2 text-xl font-semibold text-black">
                        {automation.enteredCount}
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] bg-[#f7f8ff] px-4 py-4">
                      <p className="text-xs text-black/42">Активно сейчас</p>
                      <p className="mt-2 text-xl font-semibold text-black">
                        {automation.activeRuns}
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] bg-[#f7f8ff] px-4 py-4">
                      <p className="text-xs text-black/42">Goal met</p>
                      <p className="mt-2 text-xl font-semibold text-black">
                        {automation.goalMetCount}
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] bg-[#f7f8ff] px-4 py-4">
                      <p className="text-xs text-black/42">Сообщений</p>
                      <p className="mt-2 text-xl font-semibold text-black">
                        {automation.sentMessages}
                      </p>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          ) : (
            <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
              <EmptyState
                icon={Bot}
                title="Пока нет автоматизаций"
                description="Создай первую цепочку под брошенную оплату или реактивацию студентов, и система начнет класть шаги в очередь сама."
              />
            </PremiumCard>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
              <TimerReset className="size-5 text-[#3d3bff]" />
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-black">
                Durable queue
              </h3>
              <p className="mt-2 text-sm leading-7 text-black/56">
                Шаги лежат в Postgres и переживают рестарт приложения.
              </p>
            </PremiumCard>
            <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
              <Send className="size-5 text-[#3d3bff]" />
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-black">
                No duplicates
              </h3>
              <p className="mt-2 text-sm leading-7 text-black/56">
                Ретрай не отправит второе письмо или сообщение благодаря dedupe key.
              </p>
            </PremiumCard>
            <PremiumCard padding="lg" className="rounded-[2rem] bg-white/92">
              <Zap className="size-5 text-[#3d3bff]" />
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-black">
                Goal exit
              </h3>
              <p className="mt-2 text-sm leading-7 text-black/56">
                Как только человек купил, активный run останавливается сам.
              </p>
            </PremiumCard>
          </div>
        </section>
      </div>
    </div>
  );
}
