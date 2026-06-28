import type {
  AutomationActionType,
  AutomationDelayUnit,
  AutomationTriggerType,
  ContactEventType,
  DealStage,
  MessageChannel,
} from "@prisma/client";

type JsonRecord = Record<string, unknown>;

export type AutomationConditions = {
  segmentKey?: string | null;
  tagSlugs?: string[];
  sources?: string[];
  purchasedCourseIds?: string[];
  excludedPurchasedCourseIds?: string[];
};

export type AutomationGoal =
  | {
      type: "COURSE_PURCHASED";
      courseId?: string | null;
    }
  | {
      type: "NONE";
    };

export type AutomationTriggerConfig = {
  delayMinutes?: number;
  inactiveDays?: number;
  daysAfter?: number;
  eventType?: ContactEventType | null;
};

export type SendMessageActionConfig = {
  channel: MessageChannel;
  subject?: string | null;
  text: string;
  html?: string | null;
};

export type ApplyTagActionConfig = {
  tagName: string;
  color?: string | null;
};

export type ChangeDealStageActionConfig = {
  stage: DealStage;
  courseId?: string | null;
};

export type IssuePromoCodeActionConfig = {
  percentOff?: number | null;
  amountOff?: number | null;
  currency?: string | null;
  expiresInDays?: number | null;
  prefix?: string | null;
};

export type CreateFollowUpActionConfig = {
  title: string;
  note?: string | null;
};

export type AutomationActionConfig =
  | SendMessageActionConfig
  | ApplyTagActionConfig
  | ChangeDealStageActionConfig
  | IssuePromoCodeActionConfig
  | CreateFollowUpActionConfig;

function asObject(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toNumber(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

export function normalizeTelegramUsername(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function parseListInput(value: string | null | undefined) {
  return toStringList(value);
}

export function coerceAutomationConditions(
  value: unknown,
): AutomationConditions {
  const data = asObject(value);

  return {
    segmentKey: toNullableString(data.segmentKey),
    tagSlugs: toStringList(data.tagSlugs),
    sources: toStringList(data.sources),
    purchasedCourseIds: toStringList(data.purchasedCourseIds),
    excludedPurchasedCourseIds: toStringList(data.excludedPurchasedCourseIds),
  };
}

export function coerceAutomationGoal(
  value: unknown,
  fallbackCourseId?: string | null,
): AutomationGoal {
  const data = asObject(value);
  const type = typeof data.type === "string" ? data.type : "COURSE_PURCHASED";

  if (type === "NONE") {
    return { type: "NONE" };
  }

  return {
    type: "COURSE_PURCHASED",
    courseId: toNullableString(data.courseId) ?? fallbackCourseId ?? null,
  };
}

export function coerceAutomationTriggerConfig(
  triggerType: AutomationTriggerType,
  value: unknown,
): AutomationTriggerConfig {
  const data = asObject(value);

  switch (triggerType) {
    case "ABANDONED_CHECKOUT":
      return {
        delayMinutes: Math.max(0, toNumber(data.delayMinutes, 60)),
      };
    case "COURSE_INACTIVE_DAYS":
      return {
        inactiveDays: Math.max(1, toNumber(data.inactiveDays, 7)),
      };
    case "DAYS_AFTER_EVENT":
      return {
        daysAfter: Math.max(1, toNumber(data.daysAfter, 3)),
        eventType:
          typeof data.eventType === "string"
            ? (data.eventType as ContactEventType)
            : "LEAD_CAPTURED",
      };
    default:
      return {};
  }
}

export function coerceAutomationActionConfig(
  actionType: AutomationActionType,
  value: unknown,
): AutomationActionConfig {
  const data = asObject(value);

  switch (actionType) {
    case "APPLY_TAG":
      return {
        tagName: toNullableString(data.tagName) ?? "Новый тег",
        color: toNullableString(data.color),
      };
    case "CHANGE_DEAL_STAGE":
      return {
        stage:
          typeof data.stage === "string"
            ? (data.stage as DealStage)
            : "INTERESTED",
        courseId: toNullableString(data.courseId),
      };
    case "ISSUE_PROMO_CODE":
      return {
        percentOff: data.percentOff == null ? null : toNumber(data.percentOff),
        amountOff: data.amountOff == null ? null : toNumber(data.amountOff),
        currency: toNullableString(data.currency),
        expiresInDays:
          data.expiresInDays == null ? null : Math.max(1, toNumber(data.expiresInDays)),
        prefix: toNullableString(data.prefix),
      };
    case "CREATE_FOLLOW_UP":
      return {
        title: toNullableString(data.title) ?? "Follow-up",
        note: toNullableString(data.note),
      };
    case "SEND_MESSAGE":
    default:
      return {
        channel:
          typeof data.channel === "string"
            ? (data.channel as MessageChannel)
            : "TELEGRAM",
        subject: toNullableString(data.subject),
        text: toNullableString(data.text) ?? "Привет! Возвращаю тебя в воронку Nowa School.",
        html: toNullableString(data.html),
      };
  }
}

export function getAutomationDelayMs(
  amount: number,
  unit: AutomationDelayUnit,
) {
  const safeAmount = Math.max(0, amount);

  switch (unit) {
    case "MINUTES":
      return safeAmount * 60_000;
    case "HOURS":
      return safeAmount * 60 * 60_000;
    case "DAYS":
      return safeAmount * 24 * 60 * 60_000;
    default:
      return 0;
  }
}

export function interpolateAutomationTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value == null ? "" : String(value);
  });
}
