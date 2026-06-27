import { z } from "zod";
import {
  courseCategoryOptions,
  courseLevelOptions,
} from "@/lib/validators/course";

export const creativeStudioCardStyleOptions = [
  "editorial",
  "spotlight",
  "compact",
] as const;

const optionalAssetUrlSchema = z
  .union([
    z.literal(""),
    z.string().url("Укажи корректный URL."),
    z
      .string()
      .regex(/^\/uploads\/[\w.\-]+$/i, "Используй storage URL или mock upload."),
  ])
  .transform((value) => value || undefined);

const optionalNumberSchema = z
  .union([z.literal(""), z.coerce.number().min(0, "Число не может быть отрицательным.")])
  .transform((value) => (value === "" ? undefined : value));

const optionalTextSchema = z
  .string()
  .trim()
  .max(200, "Поле слишком длинное.")
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

export const creativeStudioCourseCardSchema = z.object({
  title: z.string().trim().min(3, "Название должно быть длиннее."),
  shortDescription: z
    .string()
    .trim()
    .min(12, "Добавь короткое, но понятное описание карточки.")
    .max(220, "Описание карточки слишком длинное."),
  category: z.enum(courseCategoryOptions, {
    error: "Выбери категорию.",
  }),
  level: z.enum(courseLevelOptions, {
    error: "Выбери уровень.",
  }),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной."),
  oldPrice: optionalNumberSchema,
  coverUrl: optionalAssetUrlSchema,
  authorName: z.string().trim().min(2, "Добавь имя автора.").max(80),
  badges: z
    .array(z.string().trim().min(1, "Бейдж не может быть пустым.").max(32))
    .max(6, "Не больше 6 бейджей."),
  duration: z
    .string()
    .trim()
    .max(48, "Слишком длинный текст длительности.")
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  lessonsCount: z.coerce
    .number()
    .int("Нужны целые уроки.")
    .min(0, "Количество уроков не может быть отрицательным.")
    .max(9999, "Слишком много уроков."),
  accentColor: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Укажи HEX-цвет.")
    .or(z.literal("")),
  cardStyle: z.enum(creativeStudioCardStyleOptions),
});

export const creativeStudioFooterSocialsSchema = z.object({
  telegram: optionalTextSchema,
  instagram: optionalTextSchema,
  youtube: optionalTextSchema,
  tiktok: optionalTextSchema,
  vk: optionalTextSchema,
  website: optionalTextSchema,
  email: optionalTextSchema,
  community: optionalTextSchema,
});

export type CreativeStudioCourseCardInput = z.infer<
  typeof creativeStudioCourseCardSchema
>;

export type CreativeStudioFooterSocialsInput = z.infer<
  typeof creativeStudioFooterSocialsSchema
>;

export type CreativeStudioCourseCardValues = z.input<
  typeof creativeStudioCourseCardSchema
>;
