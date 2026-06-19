import type {
  ModerationIssueSeverity,
  ModerationIssueType,
} from "@prisma/client";
import { flattenSalesPageText } from "@/lib/sales-page";

export type ModerationIssueResult = {
  type: ModerationIssueType;
  severity: ModerationIssueSeverity;
  message: string;
  fieldPath?: string;
};

export type ModerationCheckResult = {
  passed: boolean;
  issues: ModerationIssueResult[];
  suggestions: string[];
};

const profanityPatterns = [
  /\bбля(?:д|т|ть)?\b/i,
  /\bхуй(?:ня|ню|ли|)\b/i,
  /\bпизд(?:а|ец|еть)\b/i,
  /\bсука\b/i,
  /\bеба(?:ть|л|н)\b/i,
];

const misleadingClaims: Array<{
  pattern: RegExp;
  type: ModerationIssueType;
  severity: ModerationIssueSeverity;
  message: string;
}> = [
  {
    pattern: /гарант(ированн|ируем).{0,24}(доход|заработок|прибыл)/i,
    type: "GUARANTEED_INCOME",
    severity: "HIGH",
    message: "Нельзя обещать гарантированный доход или заработок.",
  },
  {
    pattern: /заработаешь.{0,32}(руб|₽|usd|\$|доллар|тысяч|миллион)/i,
    type: "GUARANTEED_INCOME",
    severity: "HIGH",
    message: "Убери обещание конкретного заработка.",
  },
  {
    pattern: /трудоустройств.{0,24}гарант/i,
    type: "GUARANTEED_EMPLOYMENT",
    severity: "HIGH",
    message: "Нельзя обещать гарантированное трудоустройство.",
  },
  {
    pattern: /государственн.{0,20}диплом/i,
    type: "MISLEADING_CLAIM",
    severity: "HIGH",
    message: "Не используй формулировку про государственный диплом без лицензии.",
  },
  {
    pattern: /100%\s*(результат|успех|гарант)/i,
    type: "MISLEADING_CLAIM",
    severity: "HIGH",
    message: "Убери обещание 100% результата.",
  },
  {
    pattern: /легк(ие|ие)\s+деньги|без усилий|быстрые деньги/i,
    type: "MISLEADING_CLAIM",
    severity: "HIGH",
    message: "Убери формулировки про легкие деньги или результат без усилий.",
  },
  {
    pattern: /курс в подарок/i,
    type: "BAD_CONTENT",
    severity: "MEDIUM",
    message: "Не используй фразу “курс в подарок”, если нет реального бонуса.",
  },
];

export function runSalesPageModerationCheck(input: {
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  blocks: Array<{
    title?: string | null;
    subtitle?: string | null;
    content: unknown;
  }>;
}) {
  const text = flattenSalesPageText(input);
  const issues: ModerationIssueResult[] = [];
  const suggestions = [
    "Пиши честно: чему научится человек, какой проект соберет и какие материалы получит.",
    "Избегай обещаний про гарантированный доход, трудоустройство или результат без усилий.",
  ];

  for (const pattern of profanityPatterns) {
    if (pattern.test(text)) {
      issues.push({
        type: "PROFANITY",
        severity: "HIGH",
        message: "На странице найден мат или грубая лексика.",
      });
      break;
    }
  }

  for (const claim of misleadingClaims) {
    if (claim.pattern.test(text)) {
      issues.push({
        type: claim.type,
        severity: claim.severity,
        message: claim.message,
      });
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    suggestions,
  } satisfies ModerationCheckResult;
}
