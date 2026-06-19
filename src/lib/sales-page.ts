import type { SalesPageBlockType, SalesPageStatus } from "@prisma/client";

export type SalesPageTemplateKey =
  | "practical-skill"
  | "creator-blogging"
  | "tech-vibe-coding";

export type SalesPageDeviceMode = "desktop" | "mobile";

export type SalesPageTheme = {
  accent: string;
  accentSoft: string;
  background: string;
  surface: string;
  text: string;
};

export type SalesPageBlockItem = {
  title: string;
  description?: string;
  icon?: string;
  value?: string;
};

export type SalesPageFaqItem = {
  question: string;
  answer: string;
};

export type SalesPageLinkItem = {
  label: string;
  url: string;
};

export type SalesPageBlockContent = Record<string, unknown> & {
  headline?: string;
  subheadline?: string;
  body?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  coverImage?: string;
  badges?: string[];
  items?: SalesPageBlockItem[];
  faqs?: SalesPageFaqItem[];
  links?: SalesPageLinkItem[];
  deliverables?: string[];
  screenshots?: string[];
  oldPrice?: string;
  included?: string[];
  comparisonItems?: Array<{
    label: string;
    ordinaryCourse: string;
    nowaSchoolCourse: string;
  }>;
};

export type SalesPageBlockSettings = Record<string, unknown> & {
  variant?: string;
  showModules?: boolean;
  showLessonCount?: boolean;
  backgroundStyle?: string;
};

export type SalesPageBlockDraft = {
  id: string;
  type: SalesPageBlockType;
  order: number;
  title: string | null;
  subtitle: string | null;
  content: SalesPageBlockContent;
  settings: SalesPageBlockSettings;
  isVisible: boolean;
};

export type SalesPageDraft = {
  id: string;
  courseId: string;
  slug: string;
  status: SalesPageStatus;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  theme: SalesPageTheme;
  publishedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  blocks: SalesPageBlockDraft[];
};

export type SalesPageCourseContext = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  language: string;
  price: number;
  currency: string;
  coverUrl: string | null;
  aiEnhanced: boolean;
  author: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
  modules: Array<{
    id: string;
    title: string;
    description: string;
    lessons: Array<{
      id: string;
      title: string;
      description: string;
      durationMinutes?: number;
    }>;
  }>;
  badges?: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
  }>;
};

export const salesPageTemplateOptions: Array<{
  key: SalesPageTemplateKey;
  title: string;
  description: string;
}> = [
  {
    key: "practical-skill",
    title: "Practical Skill Course",
    description:
      "Для курсов навыков и прикладного результата: понятный оффер, программа, файлы и финальный CTA.",
  },
  {
    key: "creator-blogging",
    title: "Creator / Blogging Course",
    description:
      "Для авторов, блогеров и контентных программ с сильным сообществом и серией практических вызовов.",
  },
  {
    key: "tech-vibe-coding",
    title: "Tech / Vibe Coding Course",
    description:
      "Для технических курсов, где важны проекты, репозитории, AI-слой и сертификат навыка.",
  },
];

export const salesPageStatusMeta: Record<
  SalesPageStatus,
  { label: string; tone: "default" | "primary" | "subtle" }
> = {
  DRAFT: { label: "Draft", tone: "subtle" },
  PENDING_REVIEW: { label: "Pending review", tone: "default" },
  APPROVED: { label: "Approved", tone: "primary" },
  PUBLISHED: { label: "Published", tone: "primary" },
  REJECTED: { label: "Rejected", tone: "default" },
  UNPUBLISHED: { label: "Unpublished", tone: "subtle" },
};

export const salesPageBlockCatalog: Array<{
  type: SalesPageBlockType;
  title: string;
  description: string;
}> = [
  { type: "HERO", title: "Hero", description: "Первый экран с оффером и CTA." },
  { type: "OUTCOMES", title: "Outcomes", description: "Что человек сможет после курса." },
  { type: "WHO_IS_THIS_FOR", title: "Who is this for", description: "Для кого курс и с какой готовностью входить." },
  { type: "WHAT_YOU_WILL_BUILD", title: "What you will build", description: "Что ученик соберет или получит руками." },
  { type: "CURRICULUM", title: "Curriculum", description: "Программа курса и логика модулей." },
  { type: "AUTHOR", title: "Author", description: "Блок доверия об авторе и его экспертизе." },
  { type: "FEATURES", title: "Features", description: "Фишки формата: AI, задания, практика, проверка." },
  { type: "BONUSES", title: "Bonuses", description: "Дополнительные бонусы без громких обещаний." },
  { type: "FILES_INCLUDED", title: "Files included", description: "Шаблоны, репозитории, таблицы и промты." },
  { type: "TESTIMONIALS", title: "Testimonials", description: "Отзывы и короткие proof points." },
  { type: "FAQ", title: "FAQ", description: "Вопросы, возражения и ответы." },
  { type: "PRICING", title: "Pricing", description: "Цена, что входит, варианты оплаты." },
  { type: "CTA", title: "CTA", description: "Финальный блок с призывом к действию." },
  { type: "COMPARISON", title: "Comparison", description: "Сравнение обычного курса и нового опыта." },
  { type: "PROCESS", title: "Process", description: "Как проходит обучение по шагам." },
  { type: "CERTIFICATE", title: "Certificate", description: "Verified skills и публичная верификация." },
  { type: "COMMUNITY", title: "Community", description: "Сообщество, созвоны, апдейты и разборы." },
  { type: "CUSTOM_TEXT", title: "Custom text", description: "Гибкий текстовый блок." },
  { type: "IMAGE_TEXT", title: "Image + text", description: "Экран с изображением, подписью и копирайтом." },
  { type: "ICON_GRID", title: "Icon grid", description: "Сетка иконок с короткими ценностными тезисами." },
];

export function getDefaultSalesPageTheme(): SalesPageTheme {
  return {
    accent: "#3d3bff",
    accentSoft: "rgba(61,59,255,0.12)",
    background: "#f6f7fb",
    surface: "#ffffff",
    text: "#05070b",
  };
}

export function coerceSalesPageTheme(value: unknown): SalesPageTheme {
  if (!value || typeof value !== "object") {
    return getDefaultSalesPageTheme();
  }

  const theme = value as Partial<SalesPageTheme>;

  return {
    accent: typeof theme.accent === "string" ? theme.accent : "#3d3bff",
    accentSoft:
      typeof theme.accentSoft === "string"
        ? theme.accentSoft
        : "rgba(61,59,255,0.12)",
    background:
      typeof theme.background === "string" ? theme.background : "#f6f7fb",
    surface: typeof theme.surface === "string" ? theme.surface : "#ffffff",
    text: typeof theme.text === "string" ? theme.text : "#05070b",
  };
}

export function coerceSalesPageObject<T extends Record<string, unknown>>(
  value: unknown,
): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as T;
  }

  return value as T;
}

export function getSalesPageBlockLabel(type: SalesPageBlockType) {
  return salesPageBlockCatalog.find((block) => block.type === type)?.title ?? type;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function firstModuleTitle(course: SalesPageCourseContext) {
  return course.modules[0]?.title ?? "Структурированный модуль";
}

function totalLessonCount(course: SalesPageCourseContext) {
  return course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
}

export function createDefaultBlockContent(
  type: SalesPageBlockType,
  course: SalesPageCourseContext,
): SalesPageBlockContent {
  const lessonCount = totalLessonCount(course);

  switch (type) {
    case "HERO":
      return {
        headline: `${course.title} без ощущения старой LMS`,
        subheadline:
          course.description ||
          `Собери понятный результат в категории ${course.category} и двигайся по программе с AI-помощником, практикой и premium подачей.`,
        primaryCtaText: "Купить курс",
        secondaryCtaText: "Смотреть программу",
        coverImage: course.coverUrl ?? "",
        badges: uniqueStrings([
          course.category,
          course.level,
          `${lessonCount} уроков`,
          course.aiEnhanced ? "AI-enhanced" : "",
        ]),
      };
    case "OUTCOMES":
      return {
        items: [
          {
            title: "Поймешь рабочую систему",
            description:
              "Разберешь, как выглядит цельный курс и из каких шагов собирается результат.",
            icon: "sparkles",
          },
          {
            title: "Соберешь практический результат",
            description:
              "Курс ведет не к просмотру видео, а к ощутимому deliverable внутри своей сферы.",
            icon: "target",
          },
          {
            title: "Сможешь применить в реальной работе",
            description:
              "Все модули идут от идеи к конкретному действию, а не к абстрактной теории.",
            icon: "briefcase",
          },
        ],
      };
    case "WHO_IS_THIS_FOR":
      return {
        items: [
          {
            title: "Специалисту, который хочет усилить навык",
            description:
              "Подойдет тем, кто хочет не просто посмотреть материалы, а внедрить их в работу.",
            icon: "users",
          },
          {
            title: "Новичку с мотивацией пройти путь руками",
            description:
              `Уровень ${course.level} и структура модулей помогают идти спокойно и без хаоса.`,
            icon: "sparkles",
          },
          {
            title: "Тем, кому важен не шум, а понятный результат",
            description:
              "Вместо агрессивных обещаний здесь честная упаковка, логика и сильные материалы.",
            icon: "shield",
          },
        ],
      };
    case "WHAT_YOU_WILL_BUILD":
      return {
        headline: "Что ты соберешь руками",
        body:
          `По итогу программы у тебя будет не просто понимание темы, а конкретный практический артефакт в контексте курса ${course.title}.`,
        deliverables: [
          "Финальный рабочий проект",
          "Структурированный набор решений и шаблонов",
          `Применимая система из ${course.modules.length} модулей`,
        ],
        screenshots: course.coverUrl ? [course.coverUrl] : [],
      };
    case "CURRICULUM":
      return {
        body:
          `Программа состоит из ${course.modules.length} модулей и ${lessonCount} уроков и выстроена от базовой логики к прикладному результату.`,
      };
    case "AUTHOR":
      return {
        headline: course.author.name,
        body:
          "Автор курса собрал программу так, чтобы студент видел не только теорию, но и логику внедрения навыка в реальный сценарий.",
        items: [
          {
            title: "Почему учиться у меня",
            description:
              `Этот курс в категории ${course.category} собран как продукт: понятный оффер, структура и рабочий путь к результату.`,
          },
        ],
        links: [],
      };
    case "FEATURES":
      return {
        items: [
          {
            title: "AI-помощник внутри курса",
            description:
              "Можно быстро уточнить важные моменты по материалам и не выпадать из обучения.",
            icon: "bot",
          },
          {
            title: "Практика и задания",
            description:
              "Не только теория, но и прикладные шаги, домашки и чеклисты по ходу.",
            icon: "check",
          },
          {
            title: "Сильная упаковка",
            description:
              "Каждый модуль и урок поданы так, чтобы обучение ощущалось как premium продукт.",
            icon: "sparkles",
          },
        ],
      };
    case "BONUSES":
      return {
        items: [
          {
            title: "Дополнительные шаблоны",
            description: "Материалы, которые ускоряют старт и закрепляют результат.",
          },
          {
            title: "Опорные заметки",
            description: "Быстрые выжимки и вспомогательные материалы внутри курса.",
          },
        ],
      };
    case "FILES_INCLUDED":
      return {
        items: [
          { title: "Промты", description: "Готовые prompt-подсказки для ускорения работы." },
          { title: "Шаблоны", description: "Скелеты документов, структур и рабочих процессов." },
          { title: "Файлы и материалы", description: "Дополнительные ресурсы к каждому этапу." },
        ],
      };
    case "TESTIMONIALS":
      return {
        items: [
          {
            title: "Курс ощущается как продукт, а не набор видео",
            description: "Placeholder review. Добавь реальные отзывы, когда они появятся.",
          },
          {
            title: "Наконец стало понятно, что делать после урока",
            description: "Placeholder review. Можно заменить своими кейсами и цитатами.",
          },
        ],
      };
    case "FAQ":
      return {
        faqs: [
          {
            question: "Нужно ли иметь опыт до старта?",
            answer:
              `Стартовый порог зависит от уровня ${course.level}, но курс построен так, чтобы вести по программе без ощущения перегруза.`,
          },
          {
            question: "Что будет внутри кроме видео?",
            answer:
              "Внутри есть структура, материалы, задания, AI-помощник и практические ориентиры по ходу обучения.",
          },
          {
            question: "Это просто просмотр уроков?",
            answer:
              "Нет. Смысл страницы и программы в том, чтобы студент получил конкретный навык и результат, а не просто контент.",
          },
        ],
      };
    case "PRICING":
      return {
        headline: "Что входит в стоимость",
        oldPrice: "",
        included: [
          `${lessonCount} уроков`,
          `${course.modules.length} модулей`,
          "AI-enhanced материалы",
          "Практика и рабочие материалы",
        ],
        primaryCtaText: "Купить курс",
      };
    case "CTA":
      return {
        headline: "Готов войти в курс без шума и хаоса?",
        subheadline:
          "Открой программу, посмотри логику обучения и начни двигаться к практическому результату.",
        primaryCtaText: "Купить курс",
      };
    case "COMPARISON":
      return {
        comparisonItems: [
          {
            label: "Подача",
            ordinaryCourse: "Набор видео без акцента на путь",
            nowaSchoolCourse: "Премиальная упаковка и ясная структура",
          },
          {
            label: "Результат",
            ordinaryCourse: "Нечетко понятен до покупки",
            nowaSchoolCourse: "Сразу видно, что соберешь и чему научишься",
          },
        ],
      };
    case "PROCESS":
      return {
        items: [
          {
            title: "Смотришь модуль",
            description: `Стартуешь с ${firstModuleTitle(course)} и понимаешь базовую логику.`,
          },
          {
            title: "Делаешь практику",
            description: "Закрепляешь материал через задания, чеклисты и шаги.",
          },
          {
            title: "Собираешь итоговый результат",
            description: "Доводишь навык до конкретного результата, а не останавливаешься на теории.",
          },
        ],
      };
    case "CERTIFICATE":
      return {
        headline: "Verified skill certificate",
        body:
          "После прохождения и практического результата можно получить публично проверяемый сертификат навыка без ложных обещаний о госдипломе.",
      };
    case "COMMUNITY":
      return {
        headline: "Community access",
        body:
          "Если для курса включено сообщество, здесь можно дать доступ к вопросам, апдейтам и разборам.",
      };
    case "IMAGE_TEXT":
      return {
        headline: course.title,
        body:
          "Добавь визуал, скриншот результата или пример интерфейса, чтобы показать практическую ценность курса.",
        coverImage: course.coverUrl ?? "",
      };
    case "ICON_GRID":
      return {
        items: [
          { title: "AI", description: "Усиленный learner experience", icon: "bot" },
          { title: "Practice", description: "Задания и проектный результат", icon: "sparkles" },
          { title: "Files", description: "Материалы и шаблоны внутри", icon: "folder" },
          { title: "Flow", description: "Понятная логика прохождения", icon: "layers" },
        ],
      };
    case "CUSTOM_TEXT":
    default:
      return {
        headline: "Новый блок",
        body:
          "Добавь сюда важное объяснение, кейс, дополнительное возражение или сильную подводку к покупке.",
      };
  }
}

function createTemplateBlock(
  type: SalesPageBlockType,
  order: number,
  course: SalesPageCourseContext,
  overrides?: Partial<SalesPageBlockDraft>,
): SalesPageBlockDraft {
  return {
    id: `template-${type.toLowerCase()}-${order}`,
    type,
    order,
    title:
      overrides?.title ??
      (type === "AUTHOR" ? "Об авторе" : getSalesPageBlockLabel(type)),
    subtitle: overrides?.subtitle ?? null,
    content: {
      ...createDefaultBlockContent(type, course),
      ...(overrides?.content ?? {}),
    },
    settings: {
      variant: "default",
      showModules: true,
      showLessonCount: true,
      backgroundStyle: "glass",
      ...(overrides?.settings ?? {}),
    },
    isVisible: overrides?.isVisible ?? true,
  };
}

export function createSalesPageTemplateBlocks(
  template: SalesPageTemplateKey,
  course: SalesPageCourseContext,
): SalesPageBlockDraft[] {
  const typesByTemplate: Record<SalesPageTemplateKey, SalesPageBlockType[]> = {
    "practical-skill": [
      "HERO",
      "OUTCOMES",
      "WHAT_YOU_WILL_BUILD",
      "CURRICULUM",
      "FILES_INCLUDED",
      "AUTHOR",
      "FAQ",
      "PRICING",
      "CTA",
    ],
    "creator-blogging": [
      "HERO",
      "WHO_IS_THIS_FOR",
      "PROCESS",
      "CUSTOM_TEXT",
      "AUTHOR",
      "COMMUNITY",
      "FAQ",
      "PRICING",
      "CTA",
    ],
    "tech-vibe-coding": [
      "HERO",
      "WHAT_YOU_WILL_BUILD",
      "FEATURES",
      "CURRICULUM",
      "FILES_INCLUDED",
      "CERTIFICATE",
      "FAQ",
      "PRICING",
      "CTA",
    ],
  };

  return typesByTemplate[template].map((type, index) =>
    createTemplateBlock(type, index + 1, course, {
      title:
        type === "CUSTOM_TEXT" && template === "creator-blogging"
          ? "Практические вызовы"
          : undefined,
      subtitle:
        type === "CUSTOM_TEXT" && template === "creator-blogging"
          ? "Курс можно объяснить через реальные mini-challenges и прогресс по шагам."
          : undefined,
    }),
  );
}

export function createInitialSalesPage(
  course: SalesPageCourseContext,
  template: SalesPageTemplateKey = "practical-skill",
): Omit<SalesPageDraft, "id" | "createdAt" | "updatedAt"> {
  return {
    courseId: course.id,
    slug: course.slug,
    status: "DRAFT",
    title: course.title,
    metaTitle: `${course.title} | nowa school`,
    metaDescription: course.description,
    ogImage: course.coverUrl ?? null,
    theme: getDefaultSalesPageTheme(),
    publishedAt: null,
    submittedAt: null,
    reviewedAt: null,
    reviewedById: null,
    rejectionReason: null,
    blocks: createSalesPageTemplateBlocks(template, course),
  };
}

export function extractSalesPageHero(blocks: SalesPageBlockDraft[]) {
  const hero = blocks.find((block) => block.type === "HERO");
  const content = coerceSalesPageObject<SalesPageBlockContent>(hero?.content);

  return {
    headline:
      typeof content.headline === "string" && content.headline.trim()
        ? content.headline.trim()
        : null,
    subheadline:
      typeof content.subheadline === "string" && content.subheadline.trim()
        ? content.subheadline.trim()
        : null,
    coverImage:
      typeof content.coverImage === "string" && content.coverImage.trim()
        ? content.coverImage.trim()
        : null,
    badges: Array.isArray(content.badges)
      ? content.badges.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function flattenSalesPageText(page: {
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  blocks: Array<{
    title?: string | null;
    subtitle?: string | null;
    content: unknown;
  }>;
}) {
  const parts = [page.title, page.metaTitle ?? "", page.metaDescription ?? ""];

  for (const block of page.blocks) {
    parts.push(block.title ?? "", block.subtitle ?? "");
    parts.push(JSON.stringify(block.content));
  }

  return parts
    .join(" ")
    .replace(/[{}[\]"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
