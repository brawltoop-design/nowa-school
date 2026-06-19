import type {
  AiProvider,
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
  MISSING_COURSE_ANSWER,
  isAnswerLikelyMissingFromContext,
} from "@/lib/ai/utils";

const stopWords = new Set([
  "about",
  "after",
  "also",
  "and",
  "because",
  "break",
  "cover",
  "course",
  "down",
  "expert",
  "from",
  "into",
  "keep",
  "moving",
  "online",
  "premium",
  "program",
  "students",
  "student",
  "that",
  "their",
  "there",
  "this",
  "through",
  "turn",
  "what",
  "which",
  "with",
  "your",
  "когда",
  "можно",
  "нужно",
  "после",
  "потому",
  "через",
  "этого",
]);

function normalizeTranscript(transcript: string) {
  const cleaned = transcript.replace(/\s+/g, " ").trim();
  const normalizedTokens = cleaned
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s-]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const words = normalizedTokens.filter(
    (word) =>
      word.length > 3 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word),
  );
  const phrases = cleaned
    .split(/,|\band\b/gi)
    .map((segment) =>
      segment
        .toLowerCase()
        .replace(/[^a-zа-я0-9\s-]/gi, " ")
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 3 &&
            !stopWords.has(word) &&
            !/^\d+$/.test(word),
        ),
    )
    .map((segmentWords) => {
      if (segmentWords.length >= 2) {
        return segmentWords.slice(-2).join(" ");
      }

      return segmentWords[0];
    })
    .filter((value): value is string => Boolean(value));

  return {
    cleaned,
    sentences,
    uniquePhrases: Array.from(new Set(phrases)).slice(0, 8),
    uniqueTerms: Array.from(new Set(words)).slice(0, 10),
  };
}

function titleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTerms(transcript: string, fallback: string[]) {
  const { uniquePhrases, uniqueTerms } = normalizeTranscript(transcript);
  const primaryTerms = uniquePhrases.length
    ? uniquePhrases
    : uniqueTerms.length
      ? uniqueTerms
      : fallback;

  return primaryTerms
    .slice(0, 4)
    .map(titleCase);
}

function getShortSummary(transcript: string) {
  const { sentences } = normalizeTranscript(transcript);

  return (
    sentences[0] ??
    "Этот урок объясняет ключевую тему, показывает практический подход и подводит студента к следующему действию."
  );
}

function getKeyIdeas(transcript: string) {
  const baseTerms = getTerms(transcript, [
    "outcome design",
    "lesson architecture",
    "assignment design",
    "student progress",
  ]);

  return baseTerms.map(
    (term) =>
      `Понять, как ${term} влияет на итоговое качество результата.`,
  );
}

function buildQuizQuestions(transcript: string): Quiz["questions"] {
  const terms = getTerms(transcript, [
    "framework",
    "workflow",
    "insight",
    "execution",
  ]);

  return terms.map((term, index) => ({
    question: `Какую роль играет ${term} в логике этого урока?`,
    options: [
      `${term} задает структуру принятия решений`,
      `${term} нужен только на этапе дизайна`,
      `${term} используется только для аналитики после запуска`,
      `${term} не влияет на результат студента`,
    ],
    correctAnswerIndex: 0,
    explanation:
      `В уроке ${term} используется как часть основной рабочей логики, а не как второстепенный элемент.`,
    difficulty: (index === 0
      ? "easy"
      : index === terms.length - 1
        ? "hard"
        : "medium") as "easy" | "medium" | "hard",
  }));
}

function buildAssignment(transcript: string): Assignment {
  const terms = getTerms(transcript, [
    "student flow",
    "course structure",
    "offer",
    "review",
  ]);

  return {
    title: "Практика: собрать решение на основе урока",
    description:
      `Подготовь собственный мини-проект, в котором применишь ${terms.join(", ")} и покажешь, как эти элементы работают вместе в реальном сценарии.`,
    rubric: [
      {
        criterion: "Логика и структура решения",
        points: 40,
      },
      {
        criterion: "Применение идей урока на практике",
        points: 35,
      },
      {
        criterion: "Четкость аргументации и выводов",
        points: 25,
      },
    ],
  };
}

function buildChecklist(transcript: string): Checklist {
  const terms = getTerms(transcript, [
    "goal",
    "structure",
    "execution",
    "review",
  ]);

  return {
    items: [
      {
        text: "Зафиксировать цель урока и ожидаемый результат студента.",
        required: true,
      },
      {
        text: `Проверить, как ${terms[0]} встроен в итоговую структуру.`,
        required: true,
      },
      {
        text: "Собрать один практический артефакт по мотивам урока.",
        required: true,
      },
      {
        text: "Сделать короткую самооценку по качеству выполнения.",
        required: false,
      },
      {
        text: "Подготовить вопрос или гипотезу для следующего модуля.",
        required: false,
      },
    ],
  };
}

function buildQuest(transcript: string): Quest {
  const terms = getTerms(transcript, [
    "workflow",
    "system",
    "practice",
    "feedback",
  ]);

  return {
    title: `Квест: применить ${terms[0]} в реальном кейсе`,
    description:
      `Возьми одну рабочую задачу из своей практики и перестрой ее через ${terms.slice(0, 2).join(" и ")}. Покажи до/после и опиши, что изменилось в результате.`,
    rewardPoints: 180,
  };
}

function buildBadges(transcript: string): Badges {
  const terms = getTerms(transcript, [
    "foundation",
    "execution",
    "clarity",
  ]);

  return {
    badges: [
      {
        title: "Fast Starter",
        description:
          "Выдается за быстрое прохождение урока и фиксацию ключевых идей.",
        icon: "sparkles",
        condition: {
          type: "lesson_completion",
          threshold: 1,
        },
      },
      {
        title: `${terms[0]} Builder`,
        description:
          "Выдается за практическое применение главной идеи урока.",
        icon: "target",
        condition: {
          type: "assignment_submitted",
          threshold: 1,
        },
      },
      {
        title: "Consistency Badge",
        description:
          "Выдается за последовательное выполнение чеклиста и квеста.",
        icon: "badge-check",
        condition: {
          type: "quest_and_checklist_completed",
          threshold: 1,
        },
      },
    ],
  };
}

function buildCourseAudit(courseData: CourseAuditInput): CourseAudit {
  const moduleCount = courseData.modules?.length ?? 0;
  const lessonCount =
    courseData.modules?.reduce(
      (sum, module) => sum + (module.lessons?.length ?? 0),
      0,
    ) ?? 0;

  return {
    summary:
      `Курс "${courseData.title}" уже выглядит как сильная база для premium AI-LMS продукта, но перед масштабным запуском его стоит усилить по структуре и упаковке.`,
    strengths: [
      "Есть четкая тема и понятная продуктовая рамка.",
      "Материал можно быстро развернуть в summary, задания и learner journey.",
      "Структура подходит для публикации в premium marketplace.",
    ],
    risks: [
      moduleCount < 2
        ? "Пока мало модулей для ощущения полноценной программы."
        : "Нужно проверить, чтобы каждый модуль вел к конкретному промежуточному результату.",
      lessonCount < 4
        ? "Количество уроков пока выглядит слишком компактным для paid-продукта."
        : "Важно удержать одинаковое качество и глубину между уроками.",
      "Перед публикацией стоит усилить social proof и четче сформулировать итоговый outcome.",
    ],
    recommendations: [
      {
        title: "Усилить трансформацию курса",
        description:
          "Сделай обещание результата более конкретным: что студент сможет сделать после прохождения.",
        priority: "high",
      },
      {
        title: "Добавить практический слой",
        description:
          "Для каждого модуля добавь одно измеримое действие: assignment, checklist или quest.",
        priority: "medium",
      },
      {
        title: "Подчистить витрину перед релизом",
        description:
          "Проверь title, cover, описание и первый экран курса как продающий продуктовый блок.",
        priority: "medium",
      },
    ],
    readinessScore: Math.max(
      56,
      Math.min(92, 62 + moduleCount * 8 + lessonCount * 2),
    ),
  };
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
            !stopWords.has(token) &&
            !/^\d+$/.test(token),
        ),
    ),
  );
}

function cleanContextLine(line: string) {
  return line
    .replace(
      /^(описание курса|описание модуля|описание урока|материал урока|транскрипт|ai summary|модуль \d+|урок \d+\.\d+|курс):\s*/i,
      "",
    )
    .trim();
}

function buildStudentAnswer(
  input: StudentQuestionAnswerInput,
): StudentQuestionAnswer {
  if (isAnswerLikelyMissingFromContext(input.courseContext, input.question)) {
    return {
      answer: MISSING_COURSE_ANSWER,
    };
  }

  const keywords = extractQuestionKeywords(input.question);
  const relevantFragments = input.courseContext
    .split(/\n+/)
    .map((line) => cleanContextLine(line))
    .filter(Boolean)
    .filter((line) =>
      keywords.length
        ? keywords.some((keyword) => line.toLowerCase().includes(keyword))
        : true,
    )
    .slice(0, 3);

  if (!relevantFragments.length) {
    return {
      answer: MISSING_COURSE_ANSWER,
    };
  }

  const answer = relevantFragments.join(" ").replace(/\s+/g, " ").trim();

  return {
    answer:
      answer.length > 420
        ? `${answer.slice(0, 417).trimEnd()}...`
        : answer,
  };
}

export const mockAiProvider: AiProvider = {
  name: "mock",
  async generateLessonSummary(transcript: string): Promise<LessonSummary> {
    const terms = getTerms(transcript, [
      "student flow",
      "offer",
      "positioning",
      "result",
    ]);

    return {
      shortSummary: getShortSummary(transcript),
      keyIdeas: getKeyIdeas(transcript),
      studentOutcome:
        `После урока студент сможет применить ${terms.slice(0, 2).join(" и ")} в собственной практике и лучше понимать, как доводить задачу до результата.`,
      importantTerms: terms,
    };
  },
  async generateQuiz(transcript: string): Promise<Quiz> {
    return {
      title: "Проверка понимания урока",
      questions: buildQuizQuestions(transcript),
    };
  },
  async generateAssignment(transcript: string): Promise<Assignment> {
    return buildAssignment(transcript);
  },
  async generateChecklist(transcript: string): Promise<Checklist> {
    return buildChecklist(transcript);
  },
  async generateQuest(transcript: string): Promise<Quest> {
    return buildQuest(transcript);
  },
  async generateBadges(transcript: string): Promise<Badges> {
    return buildBadges(transcript);
  },
  async generateCourseAudit(courseData: CourseAuditInput): Promise<CourseAudit> {
    return buildCourseAudit(courseData);
  },
  async answerStudentQuestion(
    input: StudentQuestionAnswerInput,
  ): Promise<StudentQuestionAnswer> {
    return buildStudentAnswer(input);
  },
};
