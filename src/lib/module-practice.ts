import { z } from "zod";

export const modulePracticeTypeOptions = [
  "PROJECT",
  "CASE_STUDY",
  "WORKSHEET",
  "PRESENTATION",
  "AUDIT",
  "CUSTOM",
] as const;

export type ModulePracticeType = (typeof modulePracticeTypeOptions)[number];

export const modulePracticeTypeMeta: Record<
  ModulePracticeType,
  { label: string; description: string }
> = {
  PROJECT: {
    label: "Проект",
    description: "Итоговая сборка артефакта или рабочей системы.",
  },
  CASE_STUDY: {
    label: "Кейс",
    description: "Разбор, стратегия или практическое решение по сценарию.",
  },
  WORKSHEET: {
    label: "Рабочий шаблон",
    description: "Заполняемый шаблон, карта решений или фреймворк.",
  },
  PRESENTATION: {
    label: "Презентация",
    description: "Слайды, питч, защита концепции или демо.",
  },
  AUDIT: {
    label: "Audit",
    description: "Аудит текущего состояния с выводами и следующими шагами.",
  },
  CUSTOM: {
    label: "Свой формат",
    description: "Свободный формат под логику конкретного модуля.",
  },
};

export const modulePracticeDeliverableSchema = z.object({
  text: z.string().trim().min(1, "Добавь ожидаемый результат."),
  required: z.boolean(),
});

export const modulePracticeChecklistItemSchema = z.object({
  text: z.string().trim().min(1, "Добавь шаг."),
  required: z.boolean(),
});

export const modulePracticeSchema = z.object({
  type: z.enum(modulePracticeTypeOptions, {
    error: "Выбери формат модульного задания.",
  }),
  title: z.string().trim().min(3, "Добавь название модульного задания."),
  summary: z
    .string()
    .trim()
    .min(12, "Кратко опиши, что именно должен сделать студент."),
  outcome: z
    .string()
    .trim()
    .min(8, "Опиши ожидаемый результат по модулю."),
  submissionLabel: z
    .string()
    .trim()
    .min(2, "Укажи формат сдачи.")
    .max(80, "Слишком длинный формат сдачи."),
  deliverables: z
    .array(modulePracticeDeliverableSchema)
    .min(1, "Добавь хотя бы один ожидаемый результат."),
  checklist: z.array(modulePracticeChecklistItemSchema).min(1, "Добавь хотя бы один чекпоинт."),
});

export type ModulePracticeInput = z.infer<typeof modulePracticeSchema>;
export type ModulePracticeDeliverable = z.infer<
  typeof modulePracticeDeliverableSchema
>;
export type ModulePracticeChecklistItem = z.infer<
  typeof modulePracticeChecklistItemSchema
>;

export function createDefaultModulePractice(
  moduleTitle: string,
): ModulePracticeInput {
  return {
    type: "PROJECT",
    title: `Итог модуля: ${moduleTitle}`,
    summary:
      "Собери практический результат по модулю так, чтобы его можно было показать как завершенный шаг обучения.",
    outcome: "Готовый артефакт, который подтверждает освоение модуля.",
    submissionLabel: "Ссылка на Notion, Figma, Loom, PDF или репозиторий",
    deliverables: [
      {
        text: "Финальный артефакт по модулю",
        required: true,
      },
      {
        text: "Короткое объяснение решений",
        required: true,
      },
    ],
    checklist: [
      {
        text: "Пройти все уроки модуля",
        required: true,
      },
      {
        text: "Собрать результат в одном месте",
        required: true,
      },
      {
        text: "Подготовить материал к проверке или публикации",
        required: false,
      },
    ],
  };
}

export function coerceModulePractice(
  value: unknown,
  moduleTitle: string,
): ModulePracticeInput {
  const parsed = modulePracticeSchema.safeParse(value);
  return parsed.success ? parsed.data : createDefaultModulePractice(moduleTitle);
}
