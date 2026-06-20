import { z } from "zod";
import {
  assignmentSchema,
  checklistSchema,
  questSchema,
  quizSchema,
} from "@/lib/ai/types";

export const authorLessonPracticeSchema = z.object({
  quiz: quizSchema.nullable(),
  assignment: assignmentSchema.nullable(),
  checklist: checklistSchema.nullable(),
  quest: questSchema.nullable(),
});

export type AuthorLessonPracticeInput = z.infer<
  typeof authorLessonPracticeSchema
>;
