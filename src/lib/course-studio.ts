export const courseStudioSections = [
  {
    key: "overview",
    label: "Обзор",
    description: "Статус курса, упаковка и базовые настройки продукта.",
  },
  {
    key: "creative-site",
    label: "Конструктор продающей страницы",
    description: "Мини-Tilda для контента публичной страницы курса.",
  },
  {
    key: "curriculum",
    label: "Конструктор программы",
    description: "Архитектура модулей и логика учебного пути.",
  },
  {
    key: "lessons",
    label: "Конструктор уроков",
    description: "Видео, транскрипт, контент урока и данные для AI.",
  },
  {
    key: "practice",
    label: "Практика",
    description: "Тесты, задания, чеклисты и квесты для модулей и уроков.",
  },
  {
    key: "files-materials",
    label: "Файлы и материалы",
    description: "Видео, загрузки транскриптов, PDF, шаблоны и дополнительные ресурсы.",
  },
  {
    key: "ai-studio",
    label: "AI-методолог",
    description: "Готовность курса к AI, методология и пробелы в контенте.",
  },
  {
    key: "analytics",
    label: "Аналитика",
    description: "Трафик, конверсия и доход по продающей странице.",
  },
  {
    key: "settings",
    label: "Настройки",
    description: "Публикация, маршруты и системные параметры курса.",
  },
] as const;

export type CourseStudioSectionKey =
  (typeof courseStudioSections)[number]["key"];

const legacyTabMap: Record<string, CourseStudioSectionKey> = {
  overview: "overview",
  "creative-site": "creative-site",
  "sales-page": "creative-site",
  curriculum: "curriculum",
  lessons: "lessons",
  assignments: "practice",
  practice: "practice",
  "files-materials": "files-materials",
  files: "files-materials",
  materials: "files-materials",
  "ai-methodologist": "ai-studio",
  "ai-studio": "ai-studio",
  analytics: "analytics",
  settings: "settings",
};

export function normalizeCourseStudioSection(
  value: string | null | undefined,
): CourseStudioSectionKey | null {
  if (!value) {
    return null;
  }

  return legacyTabMap[value] ?? null;
}

export function getCourseStudioPath(
  courseId: string,
  section: CourseStudioSectionKey,
) {
  return `/author/courses/${courseId}/studio/${section}`;
}

export function getCourseStudioSectionMeta(section: CourseStudioSectionKey) {
  return courseStudioSections.find((item) => item.key === section)!;
}

export function getAllCourseStudioPaths(courseId: string) {
  return courseStudioSections.map((section) =>
    getCourseStudioPath(courseId, section.key),
  );
}
