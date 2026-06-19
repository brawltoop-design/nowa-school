import { z } from "zod";

export type AiProviderName = "mock" | "openai" | "deepseek";
export type QuizDifficulty = "easy" | "medium" | "hard";
export type AuditPriority = "low" | "medium" | "high";

export const lessonSummarySchema = z.object({
  shortSummary: z.string(),
  keyIdeas: z.array(z.string()),
  studentOutcome: z.string(),
  importantTerms: z.array(z.string()),
});

export type LessonSummary = z.infer<typeof lessonSummarySchema>;

export const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctAnswerIndex: z.number().int().min(0),
  explanation: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const quizSchema = z.object({
  title: z.string(),
  questions: z.array(quizQuestionSchema).min(1),
});

export type Quiz = z.infer<typeof quizSchema>;

export const assignmentRubricItemSchema = z.object({
  criterion: z.string(),
  points: z.number().int().min(0),
});

export const assignmentSchema = z.object({
  title: z.string(),
  description: z.string(),
  rubric: z.array(assignmentRubricItemSchema).min(1),
});

export type Assignment = z.infer<typeof assignmentSchema>;

export const checklistItemSchema = z.object({
  text: z.string(),
  required: z.boolean(),
});

export const checklistSchema = z.object({
  items: z.array(checklistItemSchema).min(1),
});

export type Checklist = z.infer<typeof checklistSchema>;

export const questSchema = z.object({
  title: z.string(),
  description: z.string(),
  rewardPoints: z.number().int().min(0),
});

export type Quest = z.infer<typeof questSchema>;

export const badgeSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  condition: z.record(z.string(), z.unknown()),
});

export const badgesSchema = z.object({
  badges: z.array(badgeSchema).min(1),
});

export type Badges = z.infer<typeof badgesSchema>;

export const courseAuditRecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high"]),
});

export const courseAuditSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  recommendations: z.array(courseAuditRecommendationSchema).min(1),
  readinessScore: z.number().min(0).max(100),
});

export type CourseAudit = z.infer<typeof courseAuditSchema>;

export const courseAuditInputLessonSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  transcript: z.string().optional(),
});

export const courseAuditInputModuleSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  lessons: z.array(courseAuditInputLessonSchema).optional(),
});

export const courseAuditInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  language: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  modules: z.array(courseAuditInputModuleSchema).optional(),
});

export type CourseAuditInput = z.infer<typeof courseAuditInputSchema>;

export const studentQuestionAnswerInputSchema = z.object({
  courseContext: z.string().min(1),
  question: z.string().min(1),
});

export type StudentQuestionAnswerInput = z.infer<
  typeof studentQuestionAnswerInputSchema
>;

export const studentQuestionAnswerSchema = z.object({
  answer: z.string(),
});

export type StudentQuestionAnswer = z.infer<
  typeof studentQuestionAnswerSchema
>;

export interface AiProvider {
  name: AiProviderName;
  generateLessonSummary(transcript: string): Promise<LessonSummary>;
  generateQuiz(transcript: string): Promise<Quiz>;
  generateAssignment(transcript: string): Promise<Assignment>;
  generateChecklist(transcript: string): Promise<Checklist>;
  generateQuest(transcript: string): Promise<Quest>;
  generateBadges(transcript: string): Promise<Badges>;
  generateCourseAudit(courseData: CourseAuditInput): Promise<CourseAudit>;
  answerStudentQuestion(
    input: StudentQuestionAnswerInput,
  ): Promise<StudentQuestionAnswer>;
}
