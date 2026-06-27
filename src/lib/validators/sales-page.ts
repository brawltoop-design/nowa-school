import { z } from "zod";

export const salesPageTemplateSchema = z.enum([
  "practical-skill",
  "creator-blogging",
  "tech-vibe-coding",
]);

export const salesPageThemeSchema = z.object({
  accent: z.string().min(1),
  accentSoft: z.string().min(1),
  background: z.string().min(1),
  surface: z.string().min(1),
  text: z.string().min(1),
  courseCard: z
    .object({
      shortDescription: z.string().optional(),
      oldPrice: z.number().nullable().optional(),
      authorName: z.string().optional(),
      badges: z.array(z.string()).optional(),
      duration: z.string().optional(),
      lessonsCount: z.number().nullable().optional(),
      accentColor: z.string().optional(),
      cardStyle: z.enum(["editorial", "spotlight", "compact"]).optional(),
    })
    .optional(),
  footerSocials: z
    .object({
      telegram: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      tiktok: z.string().optional(),
      vk: z.string().optional(),
      website: z.string().optional(),
      email: z.string().optional(),
      community: z.string().optional(),
    })
    .optional(),
});

export const salesPageMetaSchema = z.object({
  title: z.string().trim().min(3, "Title is too short."),
  metaTitle: z.string().trim().max(120).optional().or(z.literal("")),
  metaDescription: z.string().trim().max(240).optional().or(z.literal("")),
  ogImage: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) =>
        !value ||
        /^https?:\/\//i.test(value) ||
        /^\/uploads\/[\w.\-]+$/i.test(value),
      "Use a valid image URL or mock upload path.",
    ),
  theme: salesPageThemeSchema,
});

export const salesPageBlockUpdateSchema = z.object({
  title: z.string().trim().optional().nullable(),
  subtitle: z.string().trim().optional().nullable(),
  content: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()).default({}),
  isVisible: z.boolean().default(true),
});

export const moderationSubmissionSchema = z.object({
  message: z.string().trim().max(500).optional().or(z.literal("")),
});

export const adminModerationDecisionSchema = z.object({
  adminComment: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const salesPageAnalyticsEventSchema = z.object({
  salesPageId: z.string().min(1),
  courseId: z.string().min(1),
  type: z.enum([
    "PAGE_VIEW",
    "CTA_CLICK",
    "CHECKOUT_CLICK",
    "PURCHASE",
    "SCROLL_25",
    "SCROLL_50",
    "SCROLL_75",
    "SCROLL_100",
    "FAQ_OPEN",
    "VIDEO_PLAY",
  ]),
  visitorId: z.string().trim().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SalesPageTemplateInput = z.infer<typeof salesPageTemplateSchema>;
export type SalesPageMetaInput = z.infer<typeof salesPageMetaSchema>;
export type SalesPageBlockUpdateInput = z.infer<
  typeof salesPageBlockUpdateSchema
>;
export type ModerationSubmissionInput = z.infer<
  typeof moderationSubmissionSchema
>;
export type AdminModerationDecisionInput = z.infer<
  typeof adminModerationDecisionSchema
>;
export type SalesPageAnalyticsEventInput = z.infer<
  typeof salesPageAnalyticsEventSchema
>;
