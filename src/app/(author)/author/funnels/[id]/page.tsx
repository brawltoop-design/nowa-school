import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronsUpDown,
  Eye,
  GitBranch,
  MoveDown,
  MoveUp,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  formatBulletsInput,
  getAllowedTransitionKeys,
  type FunnelStepDraft,
} from "@/lib/funnels";
import { formatCurrency } from "@/lib/utils";
import { requireUserRole } from "@/server/auth/session";
import {
  addFunnelStep,
  deleteFunnelStep,
  moveFunnelStep,
  setFunnelEntryStep,
  setFunnelStatus,
  updateFunnelSettings,
  updateFunnelStep,
} from "@/server/funnels/actions";
import { getAuthorFunnelDetail } from "@/server/funnels/queries";

type FunnelDetailPageProps = {
  params: Promise<{ id: string }>;
};

const funnelStatusLabel = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликована",
  ARCHIVED: "Архив",
} as const;

const stepTypeOptions = [
  { value: "LANDING", label: "Лендинг" },
  { value: "LEAD_CAPTURE", label: "Lead capture" },
  { value: "CHECKOUT", label: "Checkout" },
  { value: "UPSELL", label: "Upsell" },
  { value: "DOWNSELL", label: "Downsell" },
  { value: "THANK_YOU", label: "Спасибо" },
] as const;

const transitionLabels: Record<string, string> = {
  default: "Основной переход",
  submit: "После отправки формы",
  paid: "После оплаты",
  alreadyOwned: "Если курс уже куплен",
  accept: "Если согласился",
  decline: "Если отказался",
};

function StepAnalytics({ step, stats }: { step: FunnelStepDraft; stats?: {
  views: number;
  progressed: number;
  dropOff: number;
  conversionRate: number;
  variantStats: Array<{
    variant: "A" | "B";
    views: number;
    progressed: number;
    winRate: number;
  }>;
} }) {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="rounded-[1.4rem] bg-[#f6f7fb] px-4 py-4">
        <p className="text-xs text-black/42">Просмотры шага</p>
        <p className="mt-2 text-xl font-semibold text-black">{stats.views}</p>
      </div>
      <div className="rounded-[1.4rem] bg-[#f6f7fb] px-4 py-4">
        <p className="text-xs text-black/42">Перешли дальше</p>
        <p className="mt-2 text-xl font-semibold text-black">{stats.progressed}</p>
      </div>
      <div className="rounded-[1.4rem] bg-[#f6f7fb] px-4 py-4">
        <p className="text-xs text-black/42">Drop-off</p>
        <p className="mt-2 text-xl font-semibold text-black">{stats.dropOff}</p>
      </div>
      <div className="rounded-[1.4rem] bg-[#f6f7fb] px-4 py-4">
        <p className="text-xs text-black/42">Конверсия</p>
        <p className="mt-2 text-xl font-semibold text-black">{stats.conversionRate}%</p>
      </div>

      {step.abTestEnabled && stats.variantStats.length ? (
        <div className="md:col-span-4 grid gap-3 md:grid-cols-2">
          {stats.variantStats.map((variant) => (
            <div key={variant.variant} className="rounded-[1.4rem] border border-black/10 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-black">
                  Вариант {variant.variant}
                </p>
                <Badge variant="subtle">{variant.winRate}% winrate</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-black/56">
                <div>
                  <p className="text-xs text-black/42">Views</p>
                  <p className="mt-1 font-semibold text-black">{variant.views}</p>
                </div>
                <div>
                  <p className="text-xs text-black/42">Progressed</p>
                  <p className="mt-1 font-semibold text-black">{variant.progressed}</p>
                </div>
                <div>
                  <p className="text-xs text-black/42">Winrate</p>
                  <p className="mt-1 font-semibold text-black">{variant.winRate}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default async function FunnelDetailPage({ params }: FunnelDetailPageProps) {
  const { id } = await params;
  const session = await requireUserRole(["AUTHOR", "ADMIN"], `/author/funnels/${id}`);
  const result = await getAuthorFunnelDetail(id, {
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

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumbs
        items={[
          { label: "Авторский кабинет", href: "/author" },
          { label: "Воронки", href: "/author/funnels" },
          { label: data.funnel.name },
        ]}
      />

      <PremiumCard padding="lg" className="rounded-[2.8rem] bg-white/92 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={data.funnel.status === "PUBLISHED" ? "primary" : "subtle"}>
                {funnelStatusLabel[data.funnel.status]}
              </Badge>
              <Badge variant="subtle">{data.funnel.course.title}</Badge>
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {data.funnel.name}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-black/56">
              {data.funnel.description ||
                "Собери шаги, переходы, order bump и post-purchase ветку. Ниже можно править конфиг каждого шага и сразу видеть, где воронка течет."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm text-black/54">
              <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                /f/{data.funnel.slug}
              </span>
              <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                {data.steps.length} шагов
              </span>
              <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                {data.analytics.totalVisits} визитов
              </span>
              <span className="rounded-full bg-[#f4f5fb] px-4 py-2">
                {data.analytics.paidOrders} оплат
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <PremiumButton asChild tone="secondary" className="h-12 px-5">
              <Link href={data.funnel.previewHref}>
                <Eye className="mr-2 size-4" />
                Preview
              </Link>
            </PremiumButton>
            <PremiumButton asChild className="h-12 px-5">
              <Link href={data.funnel.publicHref}>
                Открыть public
                <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </PremiumButton>
          </div>
        </div>
      </PremiumCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
            <SectionHeader
              eyebrow="Общие настройки"
              title="Meta и публикация"
              description="Здесь можно сменить курс, slug, описание и статус публикации без похода в код."
            />

            <form action={updateFunnelSettings} className="mt-6 grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="funnelId" value={data.funnel.id} />

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Название</label>
                <Input
                  name="name"
                  defaultValue={data.funnel.name}
                  className="h-12 rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Slug</label>
                <Input
                  name="slug"
                  defaultValue={data.funnel.slug}
                  className="h-12 rounded-2xl"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium text-black">Курс</label>
                <select
                  name="courseId"
                  defaultValue={data.funnel.course.id}
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                >
                  {data.courseOptions.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium text-black">Описание</label>
                <Textarea
                  name="description"
                  defaultValue={data.funnel.description ?? ""}
                  className="min-h-[120px] rounded-[1.6rem]"
                />
              </div>

              <div className="lg:col-span-2 flex flex-wrap gap-3">
                <PremiumButton type="submit" className="h-12 px-6">
                  <Save className="mr-2 size-4" />
                  Сохранить настройки
                </PremiumButton>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <form action={setFunnelStatus}>
                <input type="hidden" name="funnelId" value={data.funnel.id} />
                <input type="hidden" name="status" value="DRAFT" />
                <PremiumButton type="submit" tone="secondary" className="h-11 px-5">
                  В черновик
                </PremiumButton>
              </form>
              <form action={setFunnelStatus}>
                <input type="hidden" name="funnelId" value={data.funnel.id} />
                <input type="hidden" name="status" value="PUBLISHED" />
                <PremiumButton type="submit" className="h-11 px-5">
                  <CheckCircle2 className="mr-2 size-4" />
                  Опубликовать
                </PremiumButton>
              </form>
              <form action={setFunnelStatus}>
                <input type="hidden" name="funnelId" value={data.funnel.id} />
                <input type="hidden" name="status" value="ARCHIVED" />
                <PremiumButton type="submit" tone="secondary" className="h-11 px-5">
                  В архив
                </PremiumButton>
              </form>
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
            <SectionHeader
              eyebrow="Шаги"
              title="Редактор последовательности"
              description="Каждый блок ниже — реальный шаг воронки. Меняй порядок, тип, контент, переходы и A/B-конфиг."
            />

            <form action={addFunnelStep} className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <input type="hidden" name="funnelId" value={data.funnel.id} />
              <Input
                name="name"
                placeholder="Название шага"
                className="h-12 rounded-2xl"
              />
              <Input
                name="key"
                placeholder="step-key"
                className="h-12 rounded-2xl"
              />
              <select
                name="type"
                defaultValue="LEAD_CAPTURE"
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
              >
                {stepTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <PremiumButton type="submit" className="h-12 px-5">
                <Plus className="mr-2 size-4" />
                Добавить
              </PremiumButton>
            </form>

            <div className="mt-8 space-y-5">
              {data.steps.map((step, index) => {
                const stats = data.analytics.stepStats[step.id];

                return (
                  <div
                    key={step.id}
                    className="rounded-[2rem] border border-black/10 bg-[#fbfbfd] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="subtle">#{index + 1}</Badge>
                          <Badge variant="subtle">{step.type}</Badge>
                          <Badge variant={data.funnel.entryStepId === step.id ? "primary" : "subtle"}>
                            {data.funnel.entryStepId === step.id ? "Старт" : step.key}
                          </Badge>
                        </div>
                        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                          {step.name}
                        </h3>
                        <p className="mt-2 text-sm text-black/48">
                          Шаг живет по адресу `/f/{data.funnel.slug}/{step.key}`
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={setFunnelEntryStep}>
                          <input type="hidden" name="funnelId" value={data.funnel.id} />
                          <input type="hidden" name="stepId" value={step.id} />
                          <PremiumButton type="submit" tone="secondary" className="h-10 px-4">
                            Стартовый шаг
                          </PremiumButton>
                        </form>
                        <form action={moveFunnelStep}>
                          <input type="hidden" name="stepId" value={step.id} />
                          <input type="hidden" name="direction" value="up" />
                          <PremiumButton type="submit" tone="secondary" className="h-10 px-4">
                            <MoveUp className="size-4" />
                          </PremiumButton>
                        </form>
                        <form action={moveFunnelStep}>
                          <input type="hidden" name="stepId" value={step.id} />
                          <input type="hidden" name="direction" value="down" />
                          <PremiumButton type="submit" tone="secondary" className="h-10 px-4">
                            <MoveDown className="size-4" />
                          </PremiumButton>
                        </form>
                        <form action={deleteFunnelStep}>
                          <input type="hidden" name="stepId" value={step.id} />
                          <PremiumButton type="submit" tone="secondary" className="h-10 px-4">
                            <Trash2 className="size-4" />
                          </PremiumButton>
                        </form>
                      </div>
                    </div>

                    <div className="mt-5">
                      <StepAnalytics step={step} stats={stats} />
                    </div>

                    <form action={updateFunnelStep} className="mt-6 space-y-6">
                      <input type="hidden" name="stepId" value={step.id} />

                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">Название</label>
                          <Input
                            name="name"
                            defaultValue={step.name}
                            className="h-12 rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">Key</label>
                          <Input
                            name="key"
                            defaultValue={step.key}
                            className="h-12 rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">Тип шага</label>
                          <select
                            name="type"
                            defaultValue={step.type}
                            className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                          >
                            {stepTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">Eyebrow</label>
                          <Input
                            name="eyebrow"
                            defaultValue={step.config.eyebrow}
                            className="h-12 rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">Цена / label</label>
                          <Input
                            name="priceLabel"
                            defaultValue={step.config.priceLabel}
                            className="h-12 rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                          <label className="text-sm font-medium text-black">Заголовок</label>
                          <Input
                            name="headline"
                            defaultValue={step.config.headline}
                            className="h-12 rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                          <label className="text-sm font-medium text-black">Описание</label>
                          <Textarea
                            name="description"
                            defaultValue={step.config.description}
                            className="min-h-[120px] rounded-[1.6rem]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">Основная кнопка</label>
                          <Input
                            name="primaryLabel"
                            defaultValue={step.config.primaryLabel}
                            className="h-12 rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-black">Вторая кнопка</label>
                          <Input
                            name="secondaryLabel"
                            defaultValue={step.config.secondaryLabel}
                            className="h-12 rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                          <label className="text-sm font-medium text-black">Короткая заметка</label>
                          <Textarea
                            name="note"
                            defaultValue={step.config.note}
                            className="min-h-[90px] rounded-[1.6rem]"
                          />
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                          <label className="text-sm font-medium text-black">Пункты / bullets</label>
                          <Textarea
                            name="bullets"
                            defaultValue={formatBulletsInput(step.config.bullets)}
                            className="min-h-[120px] rounded-[1.6rem]"
                          />
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] border border-black/10 bg-white px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-black">Order bump</p>
                            <p className="mt-1 text-sm text-black/48">
                              Используется в checkout. Если шаг не checkout, поля просто сохраняются в конфиге на будущее.
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-2 text-sm font-medium text-black">
                            <input
                              type="checkbox"
                              name="orderBumpEnabled"
                              defaultChecked={step.config.orderBumpEnabled}
                              className="size-4 rounded border-black/20"
                            />
                            Включен
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                          <Input
                            name="orderBumpTitle"
                            defaultValue={step.config.orderBumpTitle}
                            placeholder="Название order bump"
                            className="h-12 rounded-2xl"
                          />
                          <Input
                            name="orderBumpAmount"
                            defaultValue={String(step.config.orderBumpAmount)}
                            placeholder="Сумма"
                            className="h-12 rounded-2xl"
                          />
                          <Input
                            name="orderBumpCurrency"
                            defaultValue={step.config.orderBumpCurrency}
                            placeholder="Валюта"
                            className="h-12 rounded-2xl"
                          />
                          <div className="lg:col-span-3">
                            <Textarea
                              name="orderBumpDescription"
                              defaultValue={step.config.orderBumpDescription}
                              placeholder="Короткое описание доп. предложения"
                              className="min-h-[90px] rounded-[1.6rem]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] border border-black/10 bg-white px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-black">
                          <GitBranch className="size-4" />
                          Переходы
                        </div>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          {getAllowedTransitionKeys(step.type).length ? (
                            getAllowedTransitionKeys(step.type).map((transitionKey) => (
                              <div key={transitionKey} className="space-y-2">
                                <label className="text-sm font-medium text-black">
                                  {transitionLabels[transitionKey]}
                                </label>
                                <select
                                  name={`transition_${transitionKey}`}
                                  defaultValue={step.transitions[transitionKey] ?? ""}
                                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                                >
                                  <option value="">Не задан</option>
                                  {data.steps
                                    .filter((candidate) => candidate.id !== step.id)
                                    .map((candidate) => (
                                      <option key={candidate.id} value={candidate.key}>
                                        {candidate.name} ({candidate.key})
                                      </option>
                                    ))}
                                </select>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-black/48">
                              Для этого шага переходы не задаются. Это финальная точка воронки.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] border border-black/10 bg-white px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-black">
                              <ChevronsUpDown className="size-4" />
                              A/B-тест
                            </div>
                            <p className="mt-1 text-sm text-black/48">
                              Два варианта копирайта для шага с 50/50 или другим сплитом. Аналитика ниже покажет views и winrate.
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-2 text-sm font-medium text-black">
                            <input
                              type="checkbox"
                              name="abTestEnabled"
                              defaultChecked={step.abTestEnabled}
                              className="size-4 rounded border-black/20"
                            />
                            Включить
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-black">Split A (%)</label>
                            <Input
                              name="splitPercent"
                              defaultValue={String(step.splitPercent)}
                              className="h-12 rounded-2xl"
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 xl:grid-cols-2">
                          {(["variantA", "variantB"] as const).map((prefix, variantIndex) => (
                            <div key={prefix} className="rounded-[1.4rem] bg-[#f7f8ff] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-black">
                                  Вариант {variantIndex === 0 ? "A" : "B"}
                                </p>
                                <Badge variant="subtle">
                                  {variantIndex === 0
                                    ? `${step.splitPercent}% трафика`
                                    : `${100 - step.splitPercent}% трафика`}
                                </Badge>
                              </div>

                              <div className="mt-4 space-y-3">
                                <Input
                                  name={`${prefix}_eyebrow`}
                                  defaultValue={step[prefix].eyebrow ?? ""}
                                  placeholder="Eyebrow override"
                                  className="h-11 rounded-2xl"
                                />
                                <Input
                                  name={`${prefix}_headline`}
                                  defaultValue={step[prefix].headline ?? ""}
                                  placeholder="Headline override"
                                  className="h-11 rounded-2xl"
                                />
                                <Textarea
                                  name={`${prefix}_description`}
                                  defaultValue={step[prefix].description ?? ""}
                                  placeholder="Description override"
                                  className="min-h-[90px] rounded-[1.4rem]"
                                />
                                <Input
                                  name={`${prefix}_primaryLabel`}
                                  defaultValue={step[prefix].primaryLabel ?? ""}
                                  placeholder="Primary CTA override"
                                  className="h-11 rounded-2xl"
                                />
                                <Input
                                  name={`${prefix}_secondaryLabel`}
                                  defaultValue={step[prefix].secondaryLabel ?? ""}
                                  placeholder="Secondary CTA override"
                                  className="h-11 rounded-2xl"
                                />
                                <Input
                                  name={`${prefix}_priceLabel`}
                                  defaultValue={step[prefix].priceLabel ?? ""}
                                  placeholder="Price label override"
                                  className="h-11 rounded-2xl"
                                />
                                <Textarea
                                  name={`${prefix}_note`}
                                  defaultValue={step[prefix].note ?? ""}
                                  placeholder="Note override"
                                  className="min-h-[80px] rounded-[1.4rem]"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <PremiumButton type="submit" className="h-12 px-6">
                        <Save className="mr-2 size-4" />
                        Сохранить шаг
                      </PremiumButton>
                    </form>
                  </div>
                );
              })}
            </div>
          </PremiumCard>
        </section>

        <aside className="space-y-6">
          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
            <SectionHeader
              eyebrow="Сводка"
              title="Funnel health"
              description="Главные метрики по воронке без шума."
            />

            <div className="mt-6 space-y-3">
              <div className="rounded-[1.5rem] bg-[#f7f8ff] px-4 py-4">
                <p className="text-xs text-black/42">Всего визитов</p>
                <p className="mt-2 text-3xl font-semibold text-black">
                  {data.analytics.totalVisits}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[#f7f8ff] px-4 py-4">
                <p className="text-xs text-black/42">Завершили воронку</p>
                <p className="mt-2 text-3xl font-semibold text-black">
                  {data.analytics.completedVisits}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[#f7f8ff] px-4 py-4">
                <p className="text-xs text-black/42">Оплаты</p>
                <p className="mt-2 text-3xl font-semibold text-black">
                  {data.analytics.paidOrders}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[#f7f8ff] px-4 py-4">
                <p className="text-xs text-black/42">Выручка</p>
                <p className="mt-2 text-3xl font-semibold text-black">
                  {formatCurrency(
                    data.analytics.revenue,
                    data.funnel.course.currency,
                  )}
                </p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92 backdrop-blur-xl">
            <SectionHeader
              eyebrow="Логика"
              title="Что уже работает"
              description="Короткая проверка по критериям приемки."
            />

            <div className="mt-6 space-y-3 text-sm leading-7 text-black/62">
              {[
                "Переходы между шагами заданы явно через конфиг step -> next step.",
                "Checkout использует idempotency key на visit + checkout step.",
                "Order bump попадает в тот же order, а не создает второй.",
                "A/B шаги делят трафик детерминированно и показывают winrate.",
                "Старые step-links редиректят на актуальный current step визита.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[1.4rem] bg-[#f7f8ff] px-4 py-4"
                >
                  <CheckCircle2 className="mt-0.5 size-4 text-[#3d3bff]" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </PremiumCard>
        </aside>
      </div>
    </div>
  );
}
