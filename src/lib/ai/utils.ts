import OpenAI from "openai";
import { z } from "zod";
import type {
  AiProvider,
  AiProviderName,
  Assignment,
  Badges,
  Checklist,
  CourseAudit,
  CourseAuditInput,
  LessonSummary,
  Quest,
  Quiz,
  StudentQuestionAnswer,
  StudentQuestionAnswerInput,
} from "@/lib/ai/types";
import {
  assignmentSchema,
  badgesSchema,
  checklistSchema,
  courseAuditInputSchema,
  courseAuditSchema,
  lessonSummarySchema,
  questSchema,
  quizSchema,
  studentQuestionAnswerInputSchema,
  studentQuestionAnswerSchema,
} from "@/lib/ai/types";

const MAX_TRANSCRIPT_CHARS = 14000;
const MAX_COURSE_CONTEXT_CHARS = 18000;
const contextStopWords = new Set([
  "about",
  "also",
  "been",
  "from",
  "have",
  "into",
  "just",
  "that",
  "this",
  "what",
  "when",
  "where",
  "which",
  "would",
  "your",
  "курс",
  "курса",
  "материалах",
  "материалов",
  "можно",
  "нужно",
  "урок",
  "урока",
  "уроке",
  "этого",
  "этот",
  "этой",
]);

export const MISSING_COURSE_ANSWER = "В материалах курса этого нет.";

type StructuredJsonRequest<T> = {
  schema: z.ZodSchema<T>;
  label: string;
  outputContract: string;
  prompt: string;
  systemPrompt?: string;
};

type OpenAiCompatibleProviderOptions = {
  name: AiProviderName;
  apiKey: string;
  model: string;
  baseURL?: string;
};

export class AiJsonParseError extends Error {
  constructor(message: string, readonly rawResponse: string) {
    super(message);
    this.name = "AiJsonParseError";
  }
}

export function safeParseStructuredJson<T>(
  rawResponse: string,
  schema: z.ZodSchema<T>,
  label: string,
): T {
  const candidates = Array.from(
    new Set(
      [
        rawResponse.trim(),
        stripMarkdownCodeFence(rawResponse),
        extractJsonCandidate(rawResponse),
        extractJsonCandidate(stripMarkdownCodeFence(rawResponse)),
      ].filter((value): value is string => Boolean(value && value.trim())),
    ),
  );

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return schema.parse(parsed);
    } catch {
      continue;
    }
  }

  throw new AiJsonParseError(
    `AI returned invalid JSON for ${label}.`,
    rawResponse,
  );
}

export function createOpenAiCompatibleProvider(
  options: OpenAiCompatibleProviderOptions,
): AiProvider {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
  });

  async function requestStructuredJson<T>({
    schema,
    label,
    outputContract,
    prompt,
    systemPrompt,
  }: StructuredJsonRequest<T>): Promise<T> {
    const completion = await client.chat.completions.create({
      model: options.model,
      temperature: 0.4,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: systemPrompt ?? buildSystemPrompt(outputContract),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawResponse = completion.choices[0]?.message?.content;

    if (!rawResponse) {
      throw new Error(
        `AI provider ${options.name} returned an empty response for ${label}.`,
      );
    }

    return safeParseStructuredJson(
      rawResponse,
      schema,
      `${options.name}:${label}`,
    );
  }

  return {
    name: options.name,
    generateLessonSummary(transcript: string) {
      return requestStructuredJson<LessonSummary>({
        schema: lessonSummarySchema,
        label: "generateLessonSummary",
        outputContract: lessonSummaryContract,
        prompt: buildTranscriptPrompt(
          "Create a concise student-friendly lesson summary.",
          transcript,
        ),
      });
    },
    generateQuiz(transcript: string) {
      return requestStructuredJson<Quiz>({
        schema: quizSchema,
        label: "generateQuiz",
        outputContract: quizContract,
        prompt: buildTranscriptPrompt(
          "Create a practical quiz that checks understanding of the lesson.",
          transcript,
        ),
      });
    },
    generateAssignment(transcript: string) {
      return requestStructuredJson<Assignment>({
        schema: assignmentSchema,
        label: "generateAssignment",
        outputContract: assignmentContract,
        prompt: buildTranscriptPrompt(
          "Create one applied assignment for the student based on the lesson.",
          transcript,
        ),
      });
    },
    generateChecklist(transcript: string) {
      return requestStructuredJson<Checklist>({
        schema: checklistSchema,
        label: "generateChecklist",
        outputContract: checklistContract,
        prompt: buildTranscriptPrompt(
          "Create a checklist the student can follow after the lesson.",
          transcript,
        ),
      });
    },
    generateQuest(transcript: string) {
      return requestStructuredJson<Quest>({
        schema: questSchema,
        label: "generateQuest",
        outputContract: questContract,
        prompt: buildTranscriptPrompt(
          "Create one gamified quest that motivates the student to act.",
          transcript,
        ),
      });
    },
    generateBadges(transcript: string) {
      return requestStructuredJson<Badges>({
        schema: badgesSchema,
        label: "generateBadges",
        outputContract: badgesContract,
        prompt: buildTranscriptPrompt(
          "Create several realistic badges that reward progress in this lesson.",
          transcript,
        ),
      });
    },
    generateCourseAudit(courseData: CourseAuditInput) {
      return requestStructuredJson<CourseAudit>({
        schema: courseAuditSchema,
        label: "generateCourseAudit",
        outputContract: courseAuditContract,
        prompt: buildCourseAuditPrompt(courseData),
      });
    },
    answerStudentQuestion(input: StudentQuestionAnswerInput) {
      return requestStructuredJson<StudentQuestionAnswer>({
        schema: studentQuestionAnswerSchema,
        label: "answerStudentQuestion",
        outputContract: studentQuestionAnswerContract,
        prompt: buildStudentQuestionPrompt(input),
        systemPrompt: buildStudentAssistantSystemPrompt(),
      });
    },
  };
}

function buildSystemPrompt(outputContract: string) {
  return [
    "You are an AI learning product assistant for a premium AI-LMS platform.",
    "Return only valid JSON.",
    "Do not use markdown fences.",
    "Do not add explanations outside JSON.",
    "Match this contract exactly:",
    outputContract,
  ].join("\n");
}

function buildStudentAssistantSystemPrompt() {
  return [
    "Ты AI-наставник внутри онлайн-курса.",
    "Отвечай только на основе материалов курса, которые тебе передали.",
    "Не выдумывай факты.",
    `Если ответа нет в материалах курса, скажи: '${MISSING_COURSE_ANSWER}'`,
    "Отвечай понятно, кратко и полезно.",
    "Верни только валидный JSON без markdown fences и без текста вне JSON.",
    "Строго соблюдай контракт ответа:",
    studentQuestionAnswerContract,
  ].join("\n");
}

function buildTranscriptPrompt(instruction: string, transcript: string) {
  return [
    instruction,
    "Use a confident premium educational tone.",
    "Keep the content concrete, realistic, and useful for a paid online course.",
    "Transcript:",
    truncateText(transcript),
  ].join("\n\n");
}

function buildCourseAuditPrompt(courseData: CourseAuditInput) {
  const parsed = courseAuditInputSchema.parse(courseData);

  return [
    "Audit this course as a premium AI-LMS product reviewer.",
    "Look for strengths, risks, and next improvements before publishing.",
    "Course data:",
    JSON.stringify(parsed, null, 2),
  ].join("\n\n");
}

function buildStudentQuestionPrompt(input: StudentQuestionAnswerInput) {
  const parsed = studentQuestionAnswerInputSchema.parse(input);

  return [
    "Материалы курса:",
    truncateCourseContext(parsed.courseContext),
    "",
    "Вопрос ученика:",
    parsed.question.trim(),
    "",
    `Если ответа нет в материалах курса, верни answer со значением "${MISSING_COURSE_ANSWER}".`,
  ].join("\n");
}

function truncateText(value: string) {
  const normalized = value.trim();

  if (normalized.length <= MAX_TRANSCRIPT_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_TRANSCRIPT_CHARS)}...`;
}

function truncateCourseContext(value: string) {
  const normalized = value.trim();

  if (normalized.length <= MAX_COURSE_CONTEXT_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_COURSE_CONTEXT_CHARS)}...`;
}

function stripMarkdownCodeFence(value: string) {
  const match = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? value.trim();
}

function extractJsonCandidate(value: string) {
  const trimmed = value.trim();
  const startIndex = [trimmed.indexOf("{"), trimmed.indexOf("[")]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (startIndex === undefined) {
    return null;
  }

  const openingChar = trimmed[startIndex];
  const closingChar = openingChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === openingChar) {
      depth += 1;
    }

    if (char === closingChar) {
      depth -= 1;

      if (depth === 0) {
        return trimmed.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function extractQuestionKeywords(question: string) {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^a-zа-я0-9\s-]/gi, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 4 &&
            !contextStopWords.has(token) &&
            !/^\d+$/.test(token),
        ),
    ),
  );
}

export function isAnswerLikelyMissingFromContext(
  courseContext: string,
  question: string,
) {
  const keywords = extractQuestionKeywords(question);

  if (!keywords.length) {
    return false;
  }

  const normalizedContext = courseContext.toLowerCase();

  return !keywords.some((keyword) => normalizedContext.includes(keyword));
}

const lessonSummaryContract = JSON.stringify(
  {
    shortSummary: "string",
    keyIdeas: ["string"],
    studentOutcome: "string",
    importantTerms: ["string"],
  },
  null,
  2,
);

const quizContract = JSON.stringify(
  {
    title: "string",
    questions: [
      {
        question: "string",
        options: ["string", "string", "string", "string"],
        correctAnswerIndex: 0,
        explanation: "string",
        difficulty: "easy",
      },
    ],
  },
  null,
  2,
);

const assignmentContract = JSON.stringify(
  {
    title: "string",
    description: "string",
    rubric: [
      {
        criterion: "string",
        points: 10,
      },
    ],
  },
  null,
  2,
);

const checklistContract = JSON.stringify(
  {
    items: [
      {
        text: "string",
        required: true,
      },
    ],
  },
  null,
  2,
);

const questContract = JSON.stringify(
  {
    title: "string",
    description: "string",
    rewardPoints: 120,
  },
  null,
  2,
);

const badgesContract = JSON.stringify(
  {
    badges: [
      {
        title: "string",
        description: "string",
        icon: "string",
        condition: {
          type: "string",
        },
      },
    ],
  },
  null,
  2,
);

const courseAuditContract = JSON.stringify(
  {
    summary: "string",
    strengths: ["string"],
    risks: ["string"],
    recommendations: [
      {
        title: "string",
        description: "string",
        priority: "medium",
      },
    ],
    readinessScore: 82,
  },
  null,
  2,
);

const studentQuestionAnswerContract = JSON.stringify(
  {
    answer: "string",
  },
  null,
  2,
);
