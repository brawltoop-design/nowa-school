import type {
  AiProvider,
  AiProviderName,
  CourseAudit,
  CourseAuditInput,
  LessonSummary,
  Quiz,
  Assignment,
  Checklist,
  Quest,
  Badges,
  StudentQuestionAnswer,
  StudentQuestionAnswerInput,
} from "@/lib/ai/types";
import { getDeepSeekProvider } from "@/lib/ai/providers/deepseek";
import { mockAiProvider } from "@/lib/ai/providers/mock";
import { getOpenAiProvider } from "@/lib/ai/providers/openai";
import {
  MISSING_COURSE_ANSWER,
  isAnswerLikelyMissingFromContext,
} from "@/lib/ai/utils";

function normalizeProviderName(value: string | undefined): AiProviderName {
  switch (value?.toLowerCase()) {
    case "openai":
      return "openai";
    case "deepseek":
      return "deepseek";
    default:
      return "mock";
  }
}

export function getActiveAiProviderName(): AiProviderName {
  const configuredProvider = normalizeProviderName(process.env.AI_PROVIDER);

  if (configuredProvider === "openai" && process.env.OPENAI_API_KEY) {
    return "openai";
  }

  if (configuredProvider === "deepseek" && process.env.DEEPSEEK_API_KEY) {
    return "deepseek";
  }

  return "mock";
}

export function getAiProvider(): AiProvider {
  switch (getActiveAiProviderName()) {
    case "openai":
      return getOpenAiProvider();
    case "deepseek":
      return getDeepSeekProvider();
    default:
      return mockAiProvider;
  }
}

export async function generateLessonSummary(
  transcript: string,
): Promise<LessonSummary> {
  return getAiProvider().generateLessonSummary(transcript);
}

export async function generateQuiz(transcript: string): Promise<Quiz> {
  return getAiProvider().generateQuiz(transcript);
}

export async function generateAssignment(
  transcript: string,
): Promise<Assignment> {
  return getAiProvider().generateAssignment(transcript);
}

export async function generateChecklist(
  transcript: string,
): Promise<Checklist> {
  return getAiProvider().generateChecklist(transcript);
}

export async function generateQuest(transcript: string): Promise<Quest> {
  return getAiProvider().generateQuest(transcript);
}

export async function generateBadges(transcript: string): Promise<Badges> {
  return getAiProvider().generateBadges(transcript);
}

export async function generateCourseAudit(
  courseData: CourseAuditInput,
): Promise<CourseAudit> {
  return getAiProvider().generateCourseAudit(courseData);
}

export async function answerStudentQuestion(
  input: StudentQuestionAnswerInput,
): Promise<StudentQuestionAnswer> {
  if (isAnswerLikelyMissingFromContext(input.courseContext, input.question)) {
    return {
      answer: MISSING_COURSE_ANSWER,
    };
  }

  return getAiProvider().answerStudentQuestion(input);
}

export * from "@/lib/ai/types";
export { AiJsonParseError, safeParseStructuredJson } from "@/lib/ai/utils";
