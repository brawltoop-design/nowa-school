import { z } from "zod";
import { lessonMaterialsSchema } from "@/lib/lesson-materials";

export const courseCategoryOptions = [
  "AI",
  "Design",
  "Marketing",
  "Business",
  "Creator Economy",
] as const;

export const courseCurrencyOptions = ["USD", "RUB", "EUR"] as const;

export const courseLevelOptions = [
  "Beginner",
  "Advanced Beginner",
  "Intermediate",
  "Advanced",
] as const;

export const courseLanguageOptions = ["English", "Russian"] as const;

const optionalUrlSchema = z
  .union([z.literal(""), z.string().url("Укажи корректный URL.")])
  .transform((value) => value || undefined);

const optionalAssetUrlSchema = z
  .union([
    z.literal(""),
    z.string().url("Укажи корректный URL."),
    z
      .string()
      .regex(/^\/uploads\/[\w.\-]+$/i, "Используй storage URL или mock upload."),
  ])
  .transform((value) => value || undefined);

export const courseSlugSchema = z
  .string()
  .trim()
  .min(2, "Slug должен быть не короче 2 символов.")
  .max(80, "Slug слишком длинный.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Используй lowercase slug через дефисы.",
  );

export function slugifyCourseTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const courseFormSchema = z.object({
  title: z.string().trim().min(3, "Название должно быть длиннее."),
  slug: courseSlugSchema,
  description: z
    .string()
    .trim()
    .min(20, "Добавь более содержательное описание."),
  category: z.enum(courseCategoryOptions, {
    error: "Выбери категорию курса.",
  }),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной."),
  currency: z.enum(courseCurrencyOptions, {
    error: "Выбери валюту.",
  }),
  coverUrl: optionalUrlSchema,
  level: z.enum(courseLevelOptions, {
    error: "Выбери уровень.",
  }),
  language: z.enum(courseLanguageOptions, {
    error: "Выбери язык.",
  }),
});

export const courseOverviewSchema = courseFormSchema.extend({
  status: z.enum(["DRAFT", "PUBLISHED"], {
    error: "Статус может быть только DRAFT или PUBLISHED.",
  }),
});

export const moduleFormSchema = z.object({
  title: z.string().trim().min(3, "Название модуля слишком короткое."),
  description: z
    .string()
    .trim()
    .min(12, "Добавь короткое описание модуля."),
});

export const lessonFormSchema = z.object({
  title: z.string().trim().min(3, "Название урока слишком короткое."),
  description: z
    .string()
    .trim()
    .min(12, "Добавь короткое описание урока."),
  videoUrl: optionalAssetUrlSchema,
  contentText: z
    .string()
    .trim()
    .min(20, "Добавь содержательный текст урока."),
  transcript: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  materials: lessonMaterialsSchema.default([]),
  durationMinutes: z.coerce
    .number()
    .int("Нужны целые минуты.")
    .min(1, "Длительность должна быть больше нуля."),
});

export type CourseFormInput = z.infer<typeof courseFormSchema>;
export type CourseOverviewInput = z.infer<typeof courseOverviewSchema>;
export type ModuleFormInput = z.infer<typeof moduleFormSchema>;
export type LessonFormInput = z.infer<typeof lessonFormSchema>;

export type CourseFormValues = z.input<typeof courseFormSchema>;
export type CourseOverviewValues = z.input<typeof courseOverviewSchema>;
export type ModuleFormValues = z.input<typeof moduleFormSchema>;
export type LessonFormValues = z.input<typeof lessonFormSchema>;
