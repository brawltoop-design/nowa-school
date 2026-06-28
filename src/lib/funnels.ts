import { createHash } from "crypto";
import { FunnelStepType, type Prisma } from "@prisma/client";

export const funnelStepTypeLabels: Record<FunnelStepType, string> = {
  LANDING: "Лендинг",
  LEAD_CAPTURE: "Форма захвата",
  CHECKOUT: "Checkout",
  UPSELL: "Upsell",
  DOWNSELL: "Downsell",
  THANK_YOU: "Спасибо / доступ",
};

export const funnelStepTypeOrder: FunnelStepType[] = [
  "LANDING",
  "LEAD_CAPTURE",
  "CHECKOUT",
  "UPSELL",
  "DOWNSELL",
  "THANK_YOU",
];

export type FunnelStepConfig = {
  eyebrow: string;
  headline: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  note: string;
  priceLabel: string;
  bullets: string[];
  orderBumpEnabled: boolean;
  orderBumpTitle: string;
  orderBumpDescription: string;
  orderBumpAmount: number;
  orderBumpCurrency: string;
};

export type FunnelStepVariantConfig = Partial<
  Pick<
    FunnelStepConfig,
    | "eyebrow"
    | "headline"
    | "description"
    | "primaryLabel"
    | "secondaryLabel"
    | "note"
    | "priceLabel"
  >
>;

export type FunnelStepTransitions = Partial<
  Record<"default" | "submit" | "paid" | "alreadyOwned" | "accept" | "decline", string>
>;

export type FunnelStepDraft = {
  id: string;
  key: string;
  name: string;
  type: FunnelStepType;
  order: number;
  config: FunnelStepConfig;
  transitions: FunnelStepTransitions;
  abTestEnabled: boolean;
  splitPercent: number;
  variantA: FunnelStepVariantConfig;
  variantB: FunnelStepVariantConfig;
  createdAt: string;
  updatedAt: string;
};

type CourseContext = {
  title: string;
  currency: string;
  price: number;
};

function toJsonObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function toString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true" || value === "on" || value === "1";
  }

  return fallback;
}

export function getDefaultFunnelStepConfig(
  type: FunnelStepType,
  course: CourseContext,
): FunnelStepConfig {
  switch (type) {
    case "LANDING":
      return {
        eyebrow: "Воронка",
        headline: `Прогрей интерес перед покупкой ${course.title}`,
        description:
          "Этот шаг использует твою существующую продающую страницу курса и ведет в следующий шаг воронки.",
        primaryLabel: "Получить программу",
        secondaryLabel: "Смотреть курс",
        note: "Первый экран работает как entry point в последовательность шагов.",
        priceLabel: "",
        bullets: [],
        orderBumpEnabled: false,
        orderBumpTitle: "",
        orderBumpDescription: "",
        orderBumpAmount: 0,
        orderBumpCurrency: course.currency,
      };
    case "LEAD_CAPTURE":
      return {
        eyebrow: "Лид-форма",
        headline: "Оставь email и Telegram перед оплатой",
        description:
          "Собери контакт до checkout, чтобы не терять трафик и видеть, где человек выпал из сценария.",
        primaryLabel: "Продолжить к оплате",
        secondaryLabel: "",
        note: "Контакт сохраняется внутри визита воронки и доступен для аналитики.",
        priceLabel: "",
        bullets: [
          "Email нужен для доступа и follow-up",
          "Telegram поможет дожать теплых лидов",
        ],
        orderBumpEnabled: false,
        orderBumpTitle: "",
        orderBumpDescription: "",
        orderBumpAmount: 0,
        orderBumpCurrency: course.currency,
      };
    case "CHECKOUT":
      return {
        eyebrow: "Checkout",
        headline: "Подтверди заказ и сразу открой доступ",
        description:
          "Checkout шаг считает конверсию, хранит idempotency key и не создает второй order при повторной отправке.",
        primaryLabel: "Купить курс",
        secondaryLabel: "",
        note: "Order bump считается внутри того же заказа и не создает двойное списание.",
        priceLabel: `${course.price} ${course.currency}`,
        bullets: [
          "Оплата ведет в post-purchase ветку",
          "Повторная отправка формы реиспользует тот же checkout session",
        ],
        orderBumpEnabled: true,
        orderBumpTitle: "Добавить экспресс-разбор",
        orderBumpDescription: "Небольшой доп-продукт прямо в checkout.",
        orderBumpAmount: 49,
        orderBumpCurrency: course.currency,
      };
    case "UPSELL":
      return {
        eyebrow: "Upsell",
        headline: "Добавь продвинутый модуль после оплаты",
        description:
          "Это post-payment шаг для допредложения с отдельной веткой отказа в downsell.",
        primaryLabel: "Добавить модуль",
        secondaryLabel: "Не сейчас",
        note: "Можно использовать как soft-offer без отдельного списания в MVP.",
        priceLabel: `+99 ${course.currency}`,
        bullets: [
          "Больше шаблонов и сценариев",
          "Продвинутые кейсы и доп. материалы",
        ],
        orderBumpEnabled: false,
        orderBumpTitle: "",
        orderBumpDescription: "",
        orderBumpAmount: 0,
        orderBumpCurrency: course.currency,
      };
    case "DOWNSELL":
      return {
        eyebrow: "Downsell",
        headline: "Окей, возьми облегченный вариант",
        description:
          "Если пользователь отказался от upsell, здесь можно дать более мягкое предложение перед выдачей доступа.",
        primaryLabel: "Добавить lite-версию",
        secondaryLabel: "Пропустить",
        note: "Хороший слой для снижения отвалов после upsell.",
        priceLabel: `+39 ${course.currency}`,
        bullets: [
          "Упрощенный пакет без перегруза",
          "Сохраняет часть дополнительной выручки",
        ],
        orderBumpEnabled: false,
        orderBumpTitle: "",
        orderBumpDescription: "",
        orderBumpAmount: 0,
        orderBumpCurrency: course.currency,
      };
    case "THANK_YOU":
      return {
        eyebrow: "Финал",
        headline: "Все готово, доступ уже внутри кабинета",
        description:
          "Финальный шаг завершает визит, фиксирует funnel_complete и ведет в обучение.",
        primaryLabel: "Перейти к обучению",
        secondaryLabel: "Вернуться в каталог",
        note: "Здесь можно добавить инструкцию по доступу и следующему действию.",
        priceLabel: "",
        bullets: [],
        orderBumpEnabled: false,
        orderBumpTitle: "",
        orderBumpDescription: "",
        orderBumpAmount: 0,
        orderBumpCurrency: course.currency,
      };
  }
}

export function coerceFunnelStepConfig(
  type: FunnelStepType,
  value: Prisma.JsonValue | null | undefined,
  course: CourseContext,
) {
  const defaults = getDefaultFunnelStepConfig(type, course);
  const data = toJsonObject(value);

  return {
    eyebrow: toString(data.eyebrow, defaults.eyebrow),
    headline: toString(data.headline, defaults.headline),
    description: toString(data.description, defaults.description),
    primaryLabel: toString(data.primaryLabel, defaults.primaryLabel),
    secondaryLabel: toString(data.secondaryLabel, defaults.secondaryLabel),
    note: toString(data.note, defaults.note),
    priceLabel: toString(data.priceLabel, defaults.priceLabel),
    bullets: toStringArray(data.bullets).length
      ? toStringArray(data.bullets)
      : defaults.bullets,
    orderBumpEnabled: toBoolean(data.orderBumpEnabled, defaults.orderBumpEnabled),
    orderBumpTitle: toString(data.orderBumpTitle, defaults.orderBumpTitle),
    orderBumpDescription: toString(
      data.orderBumpDescription,
      defaults.orderBumpDescription,
    ),
    orderBumpAmount: toNumber(data.orderBumpAmount, defaults.orderBumpAmount),
    orderBumpCurrency: toString(
      data.orderBumpCurrency,
      defaults.orderBumpCurrency,
    ),
  } satisfies FunnelStepConfig;
}

export function coerceFunnelStepVariant(
  value: Prisma.JsonValue | null | undefined,
) {
  const data = toJsonObject(value);

  return {
    eyebrow: toString(data.eyebrow),
    headline: toString(data.headline),
    description: toString(data.description),
    primaryLabel: toString(data.primaryLabel),
    secondaryLabel: toString(data.secondaryLabel),
    note: toString(data.note),
    priceLabel: toString(data.priceLabel),
  } satisfies FunnelStepVariantConfig;
}

export function coerceFunnelTransitions(
  value: Prisma.JsonValue | null | undefined,
) {
  const data = toJsonObject(value);

  return {
    default: toString(data.default),
    submit: toString(data.submit),
    paid: toString(data.paid),
    alreadyOwned: toString(data.alreadyOwned),
    accept: toString(data.accept),
    decline: toString(data.decline),
  } satisfies FunnelStepTransitions;
}

export function getAllowedTransitionKeys(type: FunnelStepType) {
  switch (type) {
    case "LANDING":
      return ["default"] as const;
    case "LEAD_CAPTURE":
      return ["submit"] as const;
    case "CHECKOUT":
      return ["paid", "alreadyOwned"] as const;
    case "UPSELL":
    case "DOWNSELL":
      return ["accept", "decline"] as const;
    case "THANK_YOU":
      return [] as const;
  }
}

export function buildDefaultFunnelSteps(course: CourseContext) {
  return [
    {
      key: "landing",
      name: "Лендинг",
      type: "LANDING" as const,
      order: 0,
      config: getDefaultFunnelStepConfig("LANDING", course),
      transitions: { default: "lead-capture" },
    },
    {
      key: "lead-capture",
      name: "Lead capture",
      type: "LEAD_CAPTURE" as const,
      order: 1,
      config: getDefaultFunnelStepConfig("LEAD_CAPTURE", course),
      transitions: { submit: "checkout" },
    },
    {
      key: "checkout",
      name: "Checkout",
      type: "CHECKOUT" as const,
      order: 2,
      config: getDefaultFunnelStepConfig("CHECKOUT", course),
      transitions: { paid: "upsell", alreadyOwned: "thank-you" },
    },
    {
      key: "upsell",
      name: "Upsell",
      type: "UPSELL" as const,
      order: 3,
      config: getDefaultFunnelStepConfig("UPSELL", course),
      transitions: { accept: "thank-you", decline: "downsell" },
    },
    {
      key: "downsell",
      name: "Downsell",
      type: "DOWNSELL" as const,
      order: 4,
      config: getDefaultFunnelStepConfig("DOWNSELL", course),
      transitions: { accept: "thank-you", decline: "thank-you" },
    },
    {
      key: "thank-you",
      name: "Спасибо",
      type: "THANK_YOU" as const,
      order: 5,
      config: getDefaultFunnelStepConfig("THANK_YOU", course),
      transitions: {},
    },
  ];
}

export function pickFunnelVariant(
  visitId: string,
  stepId: string,
  splitPercent: number,
): "A" | "B" {
  const hash = createHash("sha256")
    .update(`${visitId}:${stepId}`)
    .digest("hex")
    .slice(0, 8);
  const bucket = Number.parseInt(hash, 16) % 100;

  return bucket < Math.max(0, Math.min(100, splitPercent)) ? "A" : "B";
}

export function applyVariantConfig(
  config: FunnelStepConfig,
  variantA: FunnelStepVariantConfig,
  variantB: FunnelStepVariantConfig,
  variant: "A" | "B",
) {
  const override = variant === "A" ? variantA : variantB;

  return {
    ...config,
    ...Object.fromEntries(
      Object.entries(override).filter(([, value]) => typeof value === "string" && value.trim()),
    ),
  } satisfies FunnelStepConfig;
}

export function resolveNextStepKey(
  transitions: FunnelStepTransitions,
  outcome: keyof FunnelStepTransitions,
) {
  return transitions[outcome] || "";
}

export function parseBulletsInput(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function formatBulletsInput(items: string[]) {
  return items.join("\n");
}

export function buildFunnelStepHref(
  funnelSlug: string,
  stepKey: string,
  options?: {
    visitId?: string;
    preview?: boolean;
    fromStepId?: string;
    fromVariant?: string;
  },
) {
  const searchParams = new URLSearchParams();

  if (options?.visitId) {
    searchParams.set("visit", options.visitId);
  }

  if (options?.preview) {
    searchParams.set("preview", "1");
  }

  if (options?.fromStepId) {
    searchParams.set("from", options.fromStepId);
  }

  if (options?.fromVariant) {
    searchParams.set("fromVariant", options.fromVariant);
  }

  const query = searchParams.toString();
  return `/f/${funnelSlug}/${stepKey}${query ? `?${query}` : ""}`;
}

export function buildFunnelEntryHref(
  funnelSlug: string,
  preview = false,
) {
  return `/f/${funnelSlug}${preview ? "?preview=1" : ""}`;
}
