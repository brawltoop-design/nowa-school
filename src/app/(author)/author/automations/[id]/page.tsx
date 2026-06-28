import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { notFound, redirect } from "next/navigation";
import { Play, Plus, PauseCircle, Archive, ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  coerceAutomationActionConfig,
  coerceAutomationConditions,
  coerceAutomationGoal,
  coerceAutomationTriggerConfig,
} from "@/lib/automations";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addAutomationStep,
  deleteAutomationStep,
  moveAutomationStep,
  setAutomationStatus,
  updateAutomation,
  updateAutomationStep,
} from "@/server/automations/actions";
import { getAuthorAutomationDetail } from "@/server/automations/queries";
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

export default async function AuthorAutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author/automations");
  const { id } = await params;
  const result = await getAuthorAutomationDetail(id, {
    userId: session.user.id,
    role: session.user.role,
  });

  if (result.status === "forbidden") {
    redirect("/forbidden");
  }

  if (result.status === "not_found") {
    notFound();
  }

  const data = result.data;
  const conditions = coerceAutomationConditions(data.conditions);
  const goal = coerceAutomationGoal(data.goal, data.courseId);
  const triggerConfig = coerceAutomationTriggerConfig(
    data.triggerType as never,
    data.triggerConfig,
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Авторский кабинет", href: "/author" },
          { label: "Автоматизации", href: "/author/automations" },
          { label: data.name },
        ]}
      />

      <PremiumCard padding="lg" className="rounded-[2.8rem] bg-white/92 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={data.status === "ACTIVE" ? "primary" : "subtle"}>
                {statusLabel[data.status]}
              </Badge>
              <Badge variant="subtle">
                {triggerLabel[data.triggerType as keyof typeof triggerLabel] ??
                  data.triggerType}
              </Badge>
              {data.courseTitle ? (
                <Badge variant="subtle">{data.courseTitle}</Badge>
              ) : null}
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {data.name}
            </h1>
            <p className="mt-4 text-sm leading-8 text-black/56">
              {data.description ||
                "Настрой trigger, filters, goal и последовательность шагов. Здесь же видны свежие run и как цепочка ведет себя вживую."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <form action={setAutomationStatus}>
              <input type="hidden" name="automationId" value={data.id} />
              <input type="hidden" name="status" value="ACTIVE" />
              <PremiumButton type="submit" className="h-11 px-5">
                <Play className="mr-2 size-4" />
                Активировать
              </PremiumButton>
            </form>
            <form action={setAutomationStatus}>
              <input type="hidden" name="automationId" value={data.id} />
              <input type="hidden" name="status" value="PAUSED" />
              <PremiumButton type="submit" tone="secondary" className="h-11 px-5">
                <PauseCircle className="mr-2 size-4" />
                Пауза
              </PremiumButton>
            </form>
            <form action={setAutomationStatus}>
              <input type="hidden" name="automationId" value={data.id} />
              <input type="hidden" name="status" value="ARCHIVED" />
              <PremiumButton type="submit" tone="secondary" className="h-11 px-5">
                <Archive className="mr-2 size-4" />
                Архив
              </PremiumButton>
            </form>
          </div>
        </div>
      </PremiumCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
          <SectionHeader
            eyebrow="Trigger + filters"
            title="Общие настройки"
            description="В этом блоке живут сам trigger, условия входа и правило выхода из цепочки."
          />

          <form action={updateAutomation} className="mt-6 space-y-4">
            <input type="hidden" name="automationId" value={data.id} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Название</label>
                <Input
                  name="name"
                  defaultValue={data.name}
                  className="h-12 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Slug</label>
                <Input
                  name="slug"
                  defaultValue={data.slug}
                  className="h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Описание</label>
              <Textarea
                name="description"
                defaultValue={data.description ?? ""}
                className="min-h-[120px] rounded-[1.6rem]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Триггер</label>
                <select
                  name="triggerType"
                  defaultValue={data.triggerType}
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
                  defaultValue={data.courseId ?? ""}
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
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Delay до входа, минут
                </label>
                <Input
                  name="delayMinutes"
                  type="number"
                  min="0"
                  defaultValue={String(triggerConfig.delayMinutes ?? 60)}
                  className="h-12 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Inactive days
                </label>
                <Input
                  name="inactiveDays"
                  type="number"
                  min="1"
                  defaultValue={String(triggerConfig.inactiveDays ?? 7)}
                  className="h-12 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Days after event
                </label>
                <Input
                  name="daysAfter"
                  type="number"
                  min="1"
                  defaultValue={String(triggerConfig.daysAfter ?? 3)}
                  className="h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Event type</label>
                <select
                  name="eventType"
                  defaultValue={triggerConfig.eventType ?? "LEAD_CAPTURED"}
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                >
                  <option value="LEAD_CAPTURED">Lead captured</option>
                  <option value="CHECKOUT_STARTED">Checkout started</option>
                  <option value="COURSE_PURCHASED">Course purchased</option>
                  <option value="WEBINAR_REGISTERED">Webinar registered</option>
                  <option value="COURSE_VIEWED">Course viewed</option>
                  <option value="MODULE_COMPLETED">Module completed</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Segment key</label>
                <Input
                  name="segmentKey"
                  defaultValue={conditions.segmentKey ?? ""}
                  className="h-12 rounded-2xl"
                  placeholder="например: abandoned-payment"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Tag slugs</label>
                <Input
                  name="tagSlugs"
                  defaultValue={(conditions.tagSlugs ?? []).join(", ")}
                  className="h-12 rounded-2xl"
                  placeholder="vip, hot-lead"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Sources</label>
                <Input
                  name="sources"
                  defaultValue={(conditions.sources ?? []).join(", ")}
                  className="h-12 rounded-2xl"
                  placeholder="utm, webinar, funnel"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Must have bought course IDs
                </label>
                <Input
                  name="purchasedCourseIds"
                  defaultValue={(conditions.purchasedCourseIds ?? []).join(", ")}
                  className="h-12 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Must not have bought course IDs
                </label>
                <Input
                  name="excludedPurchasedCourseIds"
                  defaultValue={(conditions.excludedPurchasedCourseIds ?? []).join(", ")}
                  className="h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Goal type</label>
                <select
                  name="goalType"
                  defaultValue={goal.type}
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                >
                  <option value="COURSE_PURCHASED">Покупка курса</option>
                  <option value="NONE">Без авто-выхода</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Goal course ID
                </label>
                <Input
                  name="goalCourseId"
                  defaultValue={goal.type === "COURSE_PURCHASED" ? goal.courseId ?? "" : ""}
                  className="h-12 rounded-2xl"
                />
              </div>
            </div>

            <PremiumButton type="submit" className="h-12 px-5">
              Сохранить настройки
            </PremiumButton>
          </form>
        </PremiumCard>

        <div className="space-y-4">
          {[
            { label: "Вошло", value: data.stats.entered },
            { label: "Активные run", value: data.stats.activeRuns },
            { label: "Завершились", value: data.stats.completed },
            { label: "Goal met", value: data.stats.goalMet },
            { label: "Сообщений", value: data.stats.messagesSent },
            { label: "Открытий", value: data.stats.messagesOpened },
          ].map((item) => (
            <PremiumCard
              key={item.label}
              padding="lg"
              className="rounded-[2rem] bg-white/92"
            >
              <p className="text-xs text-black/42">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-black">
                {item.value}
              </p>
            </PremiumCard>
          ))}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader
            eyebrow="Шаги цепочки"
            title="Automation steps"
            description="Каждый шаг получает свою задержку, экшен и отдельную идемпотентность."
          />

          <form action={addAutomationStep}>
            <input type="hidden" name="automationId" value={data.id} />
            <PremiumButton type="submit" className="h-11 px-5">
              <Plus className="mr-2 size-4" />
              Добавить шаг
            </PremiumButton>
          </form>
        </div>

        <div className="grid gap-5">
          {data.steps.map((step) => {
            const config = coerceAutomationActionConfig(
              step.actionType as never,
              step.actionConfig,
            ) as Record<string, string | number | null | undefined>;

            return (
              <PremiumCard
                key={step.id}
                padding="lg"
                className="rounded-[2.2rem] border-black/8 bg-white/92"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="subtle">#{step.order + 1}</Badge>
                      <Badge variant="subtle">{step.actionType}</Badge>
                      <Badge variant="subtle">
                        +{step.delayAmount} {step.delayUnit.toLowerCase()}
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-black">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-black/56">
                      {step.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={moveAutomationStep}>
                      <input type="hidden" name="stepId" value={step.id} />
                      <input type="hidden" name="direction" value="up" />
                      <PremiumButton type="submit" tone="secondary" className="h-10 px-4">
                        <ArrowUp className="size-4" />
                      </PremiumButton>
                    </form>
                    <form action={moveAutomationStep}>
                      <input type="hidden" name="stepId" value={step.id} />
                      <input type="hidden" name="direction" value="down" />
                      <PremiumButton type="submit" tone="secondary" className="h-10 px-4">
                        <ArrowDown className="size-4" />
                      </PremiumButton>
                    </form>
                    <form action={deleteAutomationStep}>
                      <input type="hidden" name="stepId" value={step.id} />
                      <PremiumButton type="submit" tone="secondary" className="h-10 px-4">
                        <Trash2 className="size-4" />
                      </PremiumButton>
                    </form>
                  </div>
                </div>

                <form action={updateAutomationStep} className="mt-6 space-y-4">
                  <input type="hidden" name="stepId" value={step.id} />

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium text-black">Название</label>
                      <Input
                        name="title"
                        defaultValue={step.title}
                        className="h-12 rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">Delay</label>
                      <Input
                        name="delayAmount"
                        type="number"
                        min="0"
                        defaultValue={String(step.delayAmount)}
                        className="h-12 rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">Unit</label>
                      <select
                        name="delayUnit"
                        defaultValue={step.delayUnit}
                        className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                      >
                        <option value="MINUTES">Minutes</option>
                        <option value="HOURS">Hours</option>
                        <option value="DAYS">Days</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Action</label>
                    <select
                      name="actionType"
                      defaultValue={step.actionType}
                      className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                    >
                      <option value="SEND_MESSAGE">Send message</option>
                      <option value="APPLY_TAG">Apply tag</option>
                      <option value="CHANGE_DEAL_STAGE">Change deal stage</option>
                      <option value="ISSUE_PROMO_CODE">Issue promo code</option>
                      <option value="CREATE_FOLLOW_UP">Create follow-up</option>
                    </select>
                  </div>

                  {step.actionType === "SEND_MESSAGE" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Channel
                          </label>
                          <select
                            name="messageChannel"
                            defaultValue={(config.channel as string | undefined) ?? "TELEGRAM"}
                            className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                          >
                            <option value="TELEGRAM">Telegram</option>
                            <option value="EMAIL">Email</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">
                            Subject
                          </label>
                          <Input
                            name="messageSubject"
                            defaultValue={(config.subject as string | undefined) ?? ""}
                            className="h-12 rounded-2xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Message text
                        </label>
                        <Textarea
                            name="messageText"
                            defaultValue={(config.text as string | undefined) ?? ""}
                          className="min-h-[120px] rounded-[1.6rem]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          HTML override
                        </label>
                        <Textarea
                            name="messageHtml"
                            defaultValue={(config.html as string | undefined) ?? ""}
                          className="min-h-[120px] rounded-[1.6rem]"
                        />
                      </div>
                    </div>
                  ) : null}

                  {step.actionType === "APPLY_TAG" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Tag name
                        </label>
                        <Input
                          name="tagName"
                          defaultValue={(config.tagName as string | undefined) ?? ""}
                          className="h-12 rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Color
                        </label>
                        <Input
                          name="tagColor"
                          defaultValue={(config.color as string | undefined) ?? ""}
                          className="h-12 rounded-2xl"
                        />
                      </div>
                    </div>
                  ) : null}

                  {step.actionType === "CHANGE_DEAL_STAGE" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Deal stage
                        </label>
                        <select
                          name="dealStage"
                          defaultValue={(config.stage as string | undefined) ?? "INTERESTED"}
                          className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                        >
                          <option value="NEW_LEAD">New</option>
                          <option value="INTERESTED">Interested</option>
                          <option value="CHECKOUT_STARTED">Checkout started</option>
                          <option value="PAID">Paid</option>
                          <option value="LOST">Lost</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Course ID override
                        </label>
                        <Input
                          name="dealCourseId"
                          defaultValue={(config.courseId as string | undefined) ?? ""}
                          className="h-12 rounded-2xl"
                        />
                      </div>
                    </div>
                  ) : null}

                  {step.actionType === "ISSUE_PROMO_CODE" ? (
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Percent off
                        </label>
                        <Input
                          name="percentOff"
                          type="number"
                          min="0"
                          defaultValue={
                            typeof config.percentOff === "number"
                              ? String(config.percentOff)
                              : ""
                          }
                          className="h-12 rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Amount off
                        </label>
                        <Input
                          name="amountOff"
                          type="number"
                          min="0"
                          defaultValue={
                            typeof config.amountOff === "number"
                              ? String(config.amountOff)
                              : ""
                          }
                          className="h-12 rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Currency
                        </label>
                        <Input
                          name="promoCurrency"
                          defaultValue={(config.currency as string | undefined) ?? ""}
                          className="h-12 rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Expires in days
                        </label>
                        <Input
                          name="expiresInDays"
                          type="number"
                          min="1"
                          defaultValue={
                            typeof config.expiresInDays === "number"
                              ? String(config.expiresInDays)
                              : ""
                          }
                          className="h-12 rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium text-black">
                          Promo prefix
                        </label>
                        <Input
                          name="promoPrefix"
                          defaultValue={(config.prefix as string | undefined) ?? ""}
                          className="h-12 rounded-2xl"
                        />
                      </div>
                    </div>
                  ) : null}

                  {step.actionType === "CREATE_FOLLOW_UP" ? (
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Follow-up title
                        </label>
                        <Input
                          name="followUpTitle"
                          defaultValue={(config.title as string | undefined) ?? ""}
                          className="h-12 rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">
                          Note
                        </label>
                        <Textarea
                          name="followUpNote"
                          defaultValue={(config.note as string | undefined) ?? ""}
                          className="min-h-[100px] rounded-[1.6rem]"
                        />
                      </div>
                    </div>
                  ) : null}

                  <PremiumButton type="submit" className="h-11 px-5">
                    Сохранить шаг
                  </PremiumButton>
                </form>
              </PremiumCard>
            );
          })}
        </div>
      </section>

      <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
        <SectionHeader
          eyebrow="Свежие run"
          title="Последние контакты в цепочке"
          description="Полезно смотреть, кто уже внутри, на каком шаге застрял и когда был вход."
        />

        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-black/10">
          <table className="w-full text-left">
            <thead className="bg-[#f4f4f4] text-xs text-black/44">
              <tr>
                <th className="px-5 py-4 font-medium">Контакт</th>
                <th className="px-5 py-4 font-medium">Статус</th>
                <th className="px-5 py-4 font-medium">Шаг</th>
                <th className="px-5 py-4 font-medium">Вход</th>
                <th className="px-5 py-4 font-medium">Выход</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRuns.length ? (
                data.recentRuns.map((run) => (
                  <tr key={run.id} className="border-t border-black/10 bg-white text-sm">
                    <td className="px-5 py-4">
                      <p className="font-medium text-black">
                        {run.contact.fullName || "Без имени"}
                      </p>
                      <p className="text-black/46">
                        {run.contact.email ||
                          run.contact.telegramUsername ||
                          run.contact.id}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-black">{run.status}</td>
                    <td className="px-5 py-4 text-black/56">
                      {run.currentStepOrder == null ? "-" : `#${run.currentStepOrder + 1}`}
                    </td>
                    <td className="px-5 py-4 text-black/46">
                      {format(run.enteredAt, "d MMM, HH:mm", { locale: ru })}
                    </td>
                    <td className="px-5 py-4 text-black/46">
                      {run.exitedAt
                        ? format(run.exitedAt, "d MMM, HH:mm", { locale: ru })
                        : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-black/10 bg-white text-sm">
                  <td className="px-5 py-6 text-black/46" colSpan={5}>
                    Пока никто не вошел в цепочку.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>
    </div>
  );
}
