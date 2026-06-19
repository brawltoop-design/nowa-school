import { z } from "zod";

export const lessonMaterialKindSchema = z.enum(["transcript", "resource"]);

export const lessonMaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  mimeType: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  kind: lessonMaterialKindSchema,
});

export const lessonMaterialsSchema = z.array(lessonMaterialSchema);

export type LessonMaterial = z.infer<typeof lessonMaterialSchema>;
export type LessonMaterialKind = z.infer<typeof lessonMaterialKindSchema>;

export function parseLessonMaterials(value: unknown): LessonMaterial[] {
  const parsed = lessonMaterialsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function createMockUploadUrl(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const safeName = normalized || `file-${Date.now()}`;
  return `/uploads/${safeName}`;
}

export function formatUploadSize(size?: number) {
  if (!size) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
