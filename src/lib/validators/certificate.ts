import { z } from "zod";

const optionalUrlSchema = z
  .string()
  .trim()
  .url("Укажи корректную ссылку.")
  .optional()
  .or(z.literal(""));

export const certificateSubmissionSchema = z.object({
  projectTitle: z.string().trim().min(3, "Название проекта слишком короткое."),
  projectDescription: z
    .string()
    .trim()
    .min(20, "Опиши проект чуть подробнее."),
  projectUrl: z.string().trim().url("Укажи ссылку на проект."),
  demoVideoUrl: optionalUrlSchema,
  repositoryUrl: optionalUrlSchema,
  files: z.string().trim().optional(),
});

export const certificateReviewSchema = z.object({
  score: z.coerce.number().int().min(0).max(100),
  feedback: z.string().trim().min(10, "Обратная связь должна быть полезной."),
});

export type CertificateSubmissionInput = z.infer<
  typeof certificateSubmissionSchema
>;
