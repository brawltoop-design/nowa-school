import type { SalesPageBlockType, SalesPageStatus } from "@prisma/client";

export type SalesPageTemplateKey =
  | "practical-skill"
  | "creator-blogging"
  | "tech-vibe-coding";

export type SalesPageDeviceMode = "desktop" | "tablet" | "mobile";

export type SalesPageBackgroundStyle =
  | "glass"
  | "soft"
  | "accent"
  | "gradient"
  | "midnight"
  | "outline"
  | "solid";

export type SalesPageSectionStyle = Exclude<
  SalesPageBackgroundStyle,
  "solid"
>;

export type SalesPageTextAlign = "left" | "center";
export type SalesPagePaddingSize = "sm" | "md" | "lg" | "xl";
export type SalesPageItemStyle = "card" | "pill" | "minimal";
export type SalesPageIconStyle = "soft" | "solid" | "outline";
export type SalesPageDesignStyle =
  | "cards"
  | "editorial"
  | "numbered"
  | "media";
export type SalesPageGridColumns = 2 | 3 | 4;
export type SalesPageMediaFit = "cover" | "contain";
export type SalesPageBlockStylePreset =
  | "default"
  | "soft"
  | "accent"
  | "gradient"
  | "midnight"
  | "graphite"
  | "cyan";

export type SalesPageTheme = {
  accent: string;
  accentSoft: string;
  background: string;
  surface: string;
  text: string;
  courseCard?: CourseCardSettings;
  footerSocials?: FooterSocialLinks;
};

export type CourseCardStyle = "editorial" | "spotlight" | "compact";

export type CourseCardSettings = {
  shortDescription?: string;
  oldPrice?: number | null;
  authorName?: string;
  badges?: string[];
  duration?: string;
  lessonsCount?: number | null;
  accentColor?: string;
  cardStyle?: CourseCardStyle;
};

export type FooterSocialLinks = {
  telegram?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  vk?: string;
  website?: string;
  email?: string;
  community?: string;
};

export type SalesPageBlockItem = {
  title: string;
  description?: string;
  icon?: string;
  value?: string;
  image?: string;
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
  variant?: SalesPageBlockStylePreset;
  showModules?: boolean;
  showLessonCount?: boolean;
  backgroundStyle?: SalesPageBackgroundStyle;
  accentColor?: string;
  surfaceColor?: string;
  textColor?: string;
  borderColor?: string;
  align?: SalesPageTextAlign;
  padding?: SalesPagePaddingSize;
  itemStyle?: SalesPageItemStyle;
  iconStyle?: SalesPageIconStyle;
  designStyle?: SalesPageDesignStyle;
  gridColumns?: SalesPageGridColumns;
  mediaFit?: SalesPageMediaFit;
  layout?: "split" | "stacked";
  sectionId?: string;
  sectionLabel?: string;
  sectionStyle?: SalesPageSectionStyle;
  sectionAccentColor?: string;
  sectionSurfaceColor?: string;
  sectionTextColor?: string;
  sectionBorderColor?: string;
};

export type SalesPageSectionSettings = {
  id: string;
  label: string;
  style: SalesPageSectionStyle;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  borderColor: string;
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

export const salesPageIconCatalog = [
  { key: "sparkles", label: "Искры" },
  { key: "bot", label: "AI-бот" },
  { key: "shield", label: "Щит" },
  { key: "check", label: "Проверка" },
  { key: "folder", label: "Папка" },
  { key: "layers", label: "Слои" },
  { key: "trophy", label: "Трофей" },
  { key: "user", label: "Пользователь" },
  { key: "briefcase", label: "Портфель" },
  { key: "users", label: "Люди" },
  { key: "target", label: "Цель" },
  { key: "palette", label: "Палитра" },
  { key: "rocket", label: "Ракета" },
  { key: "book", label: "Книга" },
  { key: "monitor", label: "Экран" },
  { key: "message", label: "Сообщение" },
  { key: "wand", label: "Палочка" },
  { key: "certificate", label: "Сертификат" },
] as const;

export const salesPageThemePresets: Array<{
  key: string;
  label: string;
  theme: SalesPageTheme;
}> = [
  {
    key: "default",
    label: "Базовая",
    theme: {
      accent: "#3d3bff",
      accentSoft: "rgba(61,59,255,0.12)",
      background: "#f6f7fb",
      surface: "#ffffff",
      text: "#05070b",
    },
  },
  {
    key: "graphite",
    label: "Графит",
    theme: {
      accent: "#111827",
      accentSoft: "rgba(17,24,39,0.12)",
      background: "#f3f4f6",
      surface: "#ffffff",
      text: "#030712",
    },
  },
  {
    key: "electric",
    label: "Электрик",
    theme: {
      accent: "#2563eb",
      accentSoft: "rgba(37,99,235,0.14)",
      background: "#f5f9ff",
      surface: "#ffffff",
      text: "#08111f",
    },
  },
  {
    key: "cyan",
    label: "Циан",
    theme: {
      accent: "#0891b2",
      accentSoft: "rgba(8,145,178,0.15)",
      background: "#f3fbfd",
      surface: "#ffffff",
      text: "#06222a",
    },
  },
];

export const salesPageBlockStylePresets: Array<{
  key: SalesPageBlockStylePreset;
  label: string;
  settings: Partial<SalesPageBlockSettings>;
}> = [
  {
    key: "default",
    label: "Базовый",
    settings: {
      variant: "default",
      backgroundStyle: "glass",
      align: "left",
      padding: "lg",
      itemStyle: "card",
      iconStyle: "soft",
      layout: "split",
    },
  },
  {
    key: "soft",
    label: "Мягкий",
    settings: {
      variant: "soft",
      backgroundStyle: "soft",
      align: "left",
      padding: "lg",
      itemStyle: "card",
      iconStyle: "soft",
      layout: "split",
    },
  },
  {
    key: "accent",
    label: "Акцент",
    settings: {
      variant: "accent",
      backgroundStyle: "accent",
      align: "left",
      padding: "lg",
      itemStyle: "card",
      iconStyle: "solid",
      layout: "split",
    },
  },
  {
    key: "gradient",
    label: "Градиент",
    settings: {
      variant: "gradient",
      backgroundStyle: "gradient",
      align: "left",
      padding: "xl",
      itemStyle: "card",
      iconStyle: "soft",
      layout: "split",
    },
  },
  {
    key: "midnight",
    label: "Полночь",
    settings: {
      variant: "midnight",
      backgroundStyle: "midnight",
      align: "left",
      padding: "xl",
      itemStyle: "card",
      iconStyle: "outline",
      layout: "split",
    },
  },
  {
    key: "graphite",
    label: "Графит",
    settings: {
      variant: "graphite",
      backgroundStyle: "solid",
      surfaceColor: "#f3f4f6",
      textColor: "#0f172a",
      borderColor: "rgba(15,23,42,0.10)",
      align: "left",
      padding: "lg",
      itemStyle: "minimal",
      iconStyle: "soft",
      layout: "split",
    },
  },
  {
    key: "cyan",
    label: "Циан",
    settings: {
      variant: "cyan",
      backgroundStyle: "gradient",
      accentColor: "#0891b2",
      align: "left",
      padding: "lg",
      itemStyle: "card",
      iconStyle: "soft",
      layout: "split",
    },
  },
];

export const salesPageTemplateOptions: Array<{
  key: SalesPageTemplateKey;
  title: string;
  description: string;
}> = [
  {
    key: "practical-skill",
    title: "Курс практического навыка",
    description:
      "Для курсов навыков и прикладного результата: понятный оффер, программа, файлы и финальный CTA.",
  },
  {
    key: "creator-blogging",
    title: "Курс для автора / блогера",
    description:
      "Для авторов, блогеров и контентных программ с сильным сообществом и серией практических вызовов.",
  },
  {
    key: "tech-vibe-coding",
    title: "Технический / vibe coding курс",
    description:
      "Для технических курсов, где важны проекты, репозитории, AI-слой и сертификат навыка.",
  },
];

export const salesPageStatusMeta: Record<
  SalesPageStatus,
  { label: string; tone: "default" | "primary" | "subtle" }
> = {
  DRAFT: { label: "Черновик", tone: "subtle" },
  PENDING_REVIEW: { label: "На модерации", tone: "default" },
  APPROVED: { label: "Одобрено", tone: "primary" },
  PUBLISHED: { label: "Опубликовано", tone: "primary" },
  REJECTED: { label: "Отклонено", tone: "default" },
  UNPUBLISHED: { label: "Снято с публикации", tone: "subtle" },
};

export const salesPageBlockCatalog: Array<{
  type: SalesPageBlockType;
  title: string;
  description: string;
}> = [
  { type: "HERO", title: "Первый экран", description: "Первый экран с оффером и призывом к действию." },
  { type: "OUTCOMES", title: "Результат", description: "Что человек сможет после курса." },
  { type: "WHO_IS_THIS_FOR", title: "Для кого курс", description: "Для кого курс и с какой готовностью в него входить." },
  { type: "WHAT_YOU_WILL_BUILD", title: "Что вы соберете", description: "Что ученик соберет или получит руками." },
  { type: "CURRICULUM", title: "Программа", description: "Программа курса и логика модулей." },
  { type: "AUTHOR", title: "Автор", description: "Блок доверия об авторе и его экспертизе." },
  { type: "FEATURES", title: "Преимущества", description: "Фишки формата: AI, задания, практика, проверка." },
  { type: "BONUSES", title: "Бонусы", description: "Дополнительные бонусы без громких обещаний." },
  { type: "FILES_INCLUDED", title: "Что входит", description: "Шаблоны, репозитории, таблицы и промты." },
  { type: "TESTIMONIALS", title: "Отзывы", description: "Отзывы и короткие доказательства ценности." },
  { type: "FAQ", title: "FAQ", description: "Вопросы, возражения и ответы." },
  { type: "PRICING", title: "Цена", description: "Цена, что входит, варианты оплаты." },
  { type: "CTA", title: "Призыв к действию", description: "Финальный блок с призывом к действию." },
  { type: "COMPARISON", title: "Сравнение", description: "Сравнение обычного курса и нового опыта." },
  { type: "PROCESS", title: "Как проходит обучение", description: "Как проходит обучение по шагам." },
  { type: "CERTIFICATE", title: "Сертификат", description: "Подтвержденные навыки и публичная верификация." },
  { type: "COMMUNITY", title: "Сообщество", description: "Сообщество, созвоны, апдейты и разборы." },
  { type: "CUSTOM_TEXT", title: "Произвольный текст", description: "Гибкий текстовый блок." },
  { type: "IMAGE_TEXT", title: "Изображение + текст", description: "Экран с изображением, подписью и копирайтом." },
  { type: "ICON_GRID", title: "Сетка иконок", description: "Сетка иконок с короткими ценностными тезисами." },
];

const legacySalesPageCopyMap: Record<string, string> = {
  Hero: "Первый экран",
  Outcomes: "Результат",
  "Who is this for": "Для кого курс",
  "What you will build": "Что вы соберете",
  Curriculum: "Программа",
  Author: "Об авторе",
  Features: "Преимущества",
  Bonuses: "Бонусы",
  "Files included": "Что входит",
  Testimonials: "Отзывы",
  Pricing: "Цена",
  Comparison: "Сравнение",
  Process: "Как проходит обучение",
  Certificate: "Сертификат",
  Community: "Сообщество",
  "Custom text": "Произвольный текст",
  "Image + text": "Изображение + текст",
  "Icon grid": "Сетка иконок",
  "Offer & transformation": "Оффер и трансформация",
  "Program & experience": "Программа и опыт",
  "Assets & materials": "Материалы и ресурсы",
  "Trust & proof": "Доверие и доказательства",
  "Purchase decision": "Решение о покупке",
  "Build outcome": "Что вы соберете",
  "Verified skills certificate": "Сертификат подтвержденного навыка",
  "Public verification": "Публичная верификация",
  "Community access": "Доступ к сообществу",
};

export function getDefaultSalesPageTheme(): SalesPageTheme {
  return {
    accent: "#3d3bff",
    accentSoft: "rgba(61,59,255,0.12)",
    background: "#f6f7fb",
    surface: "#ffffff",
    text: "#05070b",
  };
}

function isHexColor(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function normalizeHexColor(value: string) {
  const hex = value.trim();
  if (!isHexColor(hex)) {
    return hex;
  }

  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  return hex;
}

export function hexToRgba(value: string, alpha: number) {
  const normalized = normalizeHexColor(value);

  if (!isHexColor(normalized)) {
    return value;
  }

  const hex = normalized.replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function coerceCourseCardSettings(value: unknown): CourseCardSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const settings = value as Partial<CourseCardSettings>;

  return {
    shortDescription:
      typeof settings.shortDescription === "string"
        ? settings.shortDescription
        : undefined,
    oldPrice:
      typeof settings.oldPrice === "number" && Number.isFinite(settings.oldPrice)
        ? settings.oldPrice
        : null,
    authorName:
      typeof settings.authorName === "string" ? settings.authorName : undefined,
    badges: Array.isArray(settings.badges)
      ? settings.badges.filter(
          (badge): badge is string => typeof badge === "string" && badge.trim().length > 0,
        )
      : [],
    duration: typeof settings.duration === "string" ? settings.duration : undefined,
    lessonsCount:
      typeof settings.lessonsCount === "number" &&
      Number.isFinite(settings.lessonsCount)
        ? settings.lessonsCount
        : null,
    accentColor:
      typeof settings.accentColor === "string" ? settings.accentColor : undefined,
    cardStyle:
      settings.cardStyle === "editorial" ||
      settings.cardStyle === "spotlight" ||
      settings.cardStyle === "compact"
        ? settings.cardStyle
        : undefined,
  };
}

export function coerceFooterSocialLinks(value: unknown): FooterSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const links = value as Partial<FooterSocialLinks>;

  return {
    telegram: typeof links.telegram === "string" ? links.telegram : undefined,
    instagram: typeof links.instagram === "string" ? links.instagram : undefined,
    youtube: typeof links.youtube === "string" ? links.youtube : undefined,
    tiktok: typeof links.tiktok === "string" ? links.tiktok : undefined,
    vk: typeof links.vk === "string" ? links.vk : undefined,
    website: typeof links.website === "string" ? links.website : undefined,
    email: typeof links.email === "string" ? links.email : undefined,
    community: typeof links.community === "string" ? links.community : undefined,
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
    courseCard: coerceCourseCardSettings(theme.courseCard),
    footerSocials: coerceFooterSocialLinks(theme.footerSocials),
  };
}

export function coerceSalesPageBlockSettings(
  value: unknown,
  pageTheme: SalesPageTheme = getDefaultSalesPageTheme(),
): SalesPageBlockSettings {
  const settings =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<SalesPageBlockSettings>)
      : {};

  return {
    variant:
      typeof settings.variant === "string"
        ? (settings.variant as SalesPageBlockStylePreset)
        : "default",
    showModules:
      typeof settings.showModules === "boolean" ? settings.showModules : true,
    showLessonCount:
      typeof settings.showLessonCount === "boolean"
        ? settings.showLessonCount
        : true,
    backgroundStyle:
      typeof settings.backgroundStyle === "string"
        ? (settings.backgroundStyle as SalesPageBackgroundStyle)
        : "glass",
    accentColor:
      typeof settings.accentColor === "string" && settings.accentColor.trim()
        ? settings.accentColor
        : pageTheme.accent,
    surfaceColor:
      typeof settings.surfaceColor === "string" && settings.surfaceColor.trim()
        ? settings.surfaceColor
        : pageTheme.surface,
    textColor:
      typeof settings.textColor === "string" && settings.textColor.trim()
        ? settings.textColor
        : pageTheme.text,
    borderColor:
      typeof settings.borderColor === "string" && settings.borderColor.trim()
        ? settings.borderColor
        : hexToRgba(pageTheme.text, 0.08),
    align:
      settings.align === "center" || settings.align === "left"
        ? settings.align
        : "left",
    padding:
      settings.padding === "sm" ||
      settings.padding === "md" ||
      settings.padding === "lg" ||
      settings.padding === "xl"
        ? settings.padding
        : "lg",
    itemStyle:
      settings.itemStyle === "pill" ||
      settings.itemStyle === "minimal" ||
      settings.itemStyle === "card"
        ? settings.itemStyle
        : "card",
    iconStyle:
      settings.iconStyle === "outline" ||
      settings.iconStyle === "solid" ||
      settings.iconStyle === "soft"
        ? settings.iconStyle
        : "soft",
    designStyle:
      settings.designStyle === "editorial" ||
      settings.designStyle === "numbered" ||
      settings.designStyle === "media" ||
      settings.designStyle === "cards"
        ? settings.designStyle
        : "cards",
    gridColumns:
      settings.gridColumns === 2 ||
      settings.gridColumns === 3 ||
      settings.gridColumns === 4
        ? settings.gridColumns
        : 3,
    mediaFit:
      settings.mediaFit === "contain" || settings.mediaFit === "cover"
        ? settings.mediaFit
        : "cover",
    layout:
      settings.layout === "stacked" || settings.layout === "split"
        ? settings.layout
        : "split",
    sectionId:
      typeof settings.sectionId === "string" ? settings.sectionId.trim() : "",
    sectionLabel:
      typeof settings.sectionLabel === "string"
        ? settings.sectionLabel.trim()
        : "",
    sectionStyle:
      settings.sectionStyle === "glass" ||
      settings.sectionStyle === "soft" ||
      settings.sectionStyle === "accent" ||
      settings.sectionStyle === "gradient" ||
      settings.sectionStyle === "midnight" ||
      settings.sectionStyle === "outline"
        ? settings.sectionStyle
        : "soft",
    sectionAccentColor:
      typeof settings.sectionAccentColor === "string" &&
      settings.sectionAccentColor.trim()
        ? settings.sectionAccentColor
        : pageTheme.accent,
    sectionSurfaceColor:
      typeof settings.sectionSurfaceColor === "string" &&
      settings.sectionSurfaceColor.trim()
        ? settings.sectionSurfaceColor
        : pageTheme.surface,
    sectionTextColor:
      typeof settings.sectionTextColor === "string" &&
      settings.sectionTextColor.trim()
        ? settings.sectionTextColor
        : pageTheme.text,
    sectionBorderColor:
      typeof settings.sectionBorderColor === "string" &&
      settings.sectionBorderColor.trim()
        ? settings.sectionBorderColor
        : hexToRgba(pageTheme.text, 0.08),
  };
}

export function coerceSalesPageSectionSettings(
  value: unknown,
  pageTheme: SalesPageTheme = getDefaultSalesPageTheme(),
): SalesPageSectionSettings | null {
  const settings = coerceSalesPageBlockSettings(value, pageTheme);
  const id = settings.sectionId?.trim() ?? "";

  if (!id) {
    return null;
  }

  return {
    id,
    label: settings.sectionLabel?.trim() ?? "",
    style: settings.sectionStyle ?? "soft",
    accentColor: settings.sectionAccentColor ?? pageTheme.accent,
    surfaceColor: settings.sectionSurfaceColor ?? pageTheme.surface,
    textColor: settings.sectionTextColor ?? pageTheme.text,
    borderColor:
      settings.sectionBorderColor ?? hexToRgba(pageTheme.text, 0.08),
  };
}

export function buildSalesPageBlockAppearance(
  value: unknown,
  pageTheme: SalesPageTheme = getDefaultSalesPageTheme(),
) {
  const settings = coerceSalesPageBlockSettings(value, pageTheme);
  const accent = settings.accentColor ?? pageTheme.accent;
  const surface = settings.surfaceColor ?? pageTheme.surface;
  const text = settings.textColor ?? pageTheme.text;
  const backgroundStyle = settings.backgroundStyle ?? "glass";

  const isDark = backgroundStyle === "midnight";
  const muted = isDark ? "rgba(255,255,255,0.70)" : hexToRgba(text, 0.62);
  const subtle = isDark ? "rgba(255,255,255,0.52)" : hexToRgba(text, 0.42);

  let background = surface;
  let border = settings.borderColor ?? hexToRgba(text, 0.08);
  let card = "#ffffff";
  let cardBorder = hexToRgba(text, 0.08);
  let pill = "#ffffff";
  let iconBg = hexToRgba(accent, 0.14);
  let iconText = accent;
  let tableHead = hexToRgba(accent, 0.08);
  const ctaBg = accent;
  const ctaText = "#ffffff";
  let secondaryBg = "#ffffff";
  let secondaryText = text;

  if (backgroundStyle === "soft") {
    background = `linear-gradient(145deg, ${hexToRgba(accent, 0.08)} 0%, ${surface} 100%)`;
    card = "#ffffff";
    pill = hexToRgba(accent, 0.08);
  }

  if (backgroundStyle === "accent") {
    background = `linear-gradient(145deg, ${hexToRgba(accent, 0.14)} 0%, ${surface} 100%)`;
    card = hexToRgba(accent, 0.08);
    cardBorder = hexToRgba(accent, 0.18);
    pill = hexToRgba(accent, 0.12);
    tableHead = hexToRgba(accent, 0.14);
  }

  if (backgroundStyle === "gradient") {
    background = `radial-gradient(circle at top right, ${hexToRgba(accent, 0.22)} 0%, transparent 32%), radial-gradient(circle at bottom left, ${hexToRgba(accent, 0.12)} 0%, transparent 28%), ${surface}`;
    card = "rgba(255,255,255,0.86)";
    cardBorder = hexToRgba(accent, 0.16);
    pill = hexToRgba(accent, 0.12);
    tableHead = hexToRgba(accent, 0.14);
  }

  if (backgroundStyle === "midnight") {
    background = `radial-gradient(circle at top right, ${hexToRgba(accent, 0.28)} 0%, transparent 32%), linear-gradient(145deg, #0b1020 0%, #111936 100%)`;
    border = "rgba(255,255,255,0.12)";
    card = "rgba(255,255,255,0.06)";
    cardBorder = "rgba(255,255,255,0.12)";
    pill = "rgba(255,255,255,0.08)";
    iconBg = "rgba(255,255,255,0.08)";
    iconText = "#ffffff";
    tableHead = "rgba(255,255,255,0.08)";
    secondaryBg = "rgba(255,255,255,0.08)";
    secondaryText = "#ffffff";
  }

  if (backgroundStyle === "outline") {
    background = "#ffffff";
    border = hexToRgba(accent, 0.22);
    card = "#ffffff";
    cardBorder = hexToRgba(accent, 0.16);
    pill = "#ffffff";
    tableHead = hexToRgba(accent, 0.08);
  }

  if (backgroundStyle === "solid") {
    background = surface;
  }

  if (settings.itemStyle === "pill") {
    card = pill;
  }

  if (settings.itemStyle === "minimal") {
    card = "transparent";
    cardBorder = hexToRgba(text, 0.04);
  }

  if (settings.iconStyle === "solid") {
    iconBg = accent;
    iconText = "#ffffff";
  }

  if (settings.iconStyle === "outline") {
    iconBg = "transparent";
    iconText = accent;
  }

  return {
    settings,
    vars: {
      "--ns-block-surface": background,
      "--ns-block-border": border,
      "--ns-block-text": isDark ? "#f8fbff" : text,
      "--ns-block-muted": muted,
      "--ns-block-subtle": subtle,
      "--ns-block-card": card,
      "--ns-block-card-border": cardBorder,
      "--ns-block-pill": pill,
      "--ns-block-icon-bg": iconBg,
      "--ns-block-icon-text": iconText,
      "--ns-block-table-head": tableHead,
      "--ns-block-cta-bg": ctaBg,
      "--ns-block-cta-text": ctaText,
      "--ns-block-secondary-bg": secondaryBg,
      "--ns-block-secondary-text": secondaryText,
    } as Record<string, string>,
    paddingClass:
      settings.padding === "sm"
        ? "p-5 sm:p-6"
        : settings.padding === "md"
          ? "p-6 sm:p-7"
          : settings.padding === "xl"
            ? "p-8 sm:p-10"
            : "p-6 sm:p-8",
    alignClass: settings.align === "center" ? "text-center" : "text-left",
    isDark,
  };
}

export function buildSalesPageSectionAppearance(
  value: unknown,
  pageTheme: SalesPageTheme = getDefaultSalesPageTheme(),
) {
  const section = coerceSalesPageSectionSettings(value, pageTheme);

  if (!section) {
    return null;
  }

  const baseAppearance = buildSalesPageBlockAppearance(
    {
      backgroundStyle: section.style,
      accentColor: section.accentColor,
      surfaceColor: section.surfaceColor,
      textColor: section.textColor,
      borderColor: section.borderColor,
      itemStyle: "card",
      iconStyle: "soft",
      padding: "lg",
      align: "left",
      layout: "stacked",
    },
    pageTheme,
  );

  return {
    id: section.id,
    label: section.label,
    isDark: baseAppearance.isDark,
    vars: {
      "--ns-section-surface": baseAppearance.vars["--ns-block-surface"],
      "--ns-section-border": baseAppearance.vars["--ns-block-border"],
      "--ns-section-text": baseAppearance.vars["--ns-block-text"],
      "--ns-section-muted": baseAppearance.vars["--ns-block-muted"],
      "--ns-section-badge-bg": baseAppearance.isDark
        ? "rgba(255,255,255,0.10)"
        : hexToRgba(section.accentColor, 0.12),
      "--ns-section-badge-text": baseAppearance.isDark
        ? "#ffffff"
        : section.accentColor,
    } as Record<string, string>,
  };
}

export function getAutoSalesPageSectionSettings(
  type: SalesPageBlockType,
  pageTheme: SalesPageTheme = getDefaultSalesPageTheme(),
): SalesPageSectionSettings | null {
  const presets: Partial<Record<SalesPageBlockType, Omit<SalesPageSectionSettings, "accentColor" | "surfaceColor" | "textColor" | "borderColor"> & {
    accentColor?: string;
    surfaceColor?: string;
    textColor?: string;
    borderColor?: string;
  }>> = {
    HERO: {
      id: "offer-transformation",
      label: "Оффер и трансформация",
      style: "gradient",
    },
    OUTCOMES: {
      id: "offer-transformation",
      label: "Оффер и трансформация",
      style: "gradient",
    },
    WHO_IS_THIS_FOR: {
      id: "offer-transformation",
      label: "Оффер и трансформация",
      style: "gradient",
    },
    WHAT_YOU_WILL_BUILD: {
      id: "offer-transformation",
      label: "Оффер и трансформация",
      style: "gradient",
    },
    CURRICULUM: {
      id: "program-experience",
      label: "Программа и опыт",
      style: "soft",
    },
    PROCESS: {
      id: "program-experience",
      label: "Программа и опыт",
      style: "soft",
    },
    FEATURES: {
      id: "program-experience",
      label: "Программа и опыт",
      style: "soft",
    },
    ICON_GRID: {
      id: "program-experience",
      label: "Программа и опыт",
      style: "soft",
    },
    FILES_INCLUDED: {
      id: "assets-materials",
      label: "Материалы и ресурсы",
      style: "outline",
    },
    BONUSES: {
      id: "assets-materials",
      label: "Материалы и ресурсы",
      style: "outline",
    },
    IMAGE_TEXT: {
      id: "assets-materials",
      label: "Материалы и ресурсы",
      style: "outline",
    },
    CUSTOM_TEXT: {
      id: "assets-materials",
      label: "Материалы и ресурсы",
      style: "outline",
    },
    AUTHOR: {
      id: "trust-proof",
      label: "Доверие и доказательства",
      style: "glass",
    },
    TESTIMONIALS: {
      id: "trust-proof",
      label: "Доверие и доказательства",
      style: "glass",
    },
    COMMUNITY: {
      id: "trust-proof",
      label: "Доверие и доказательства",
      style: "glass",
    },
    COMPARISON: {
      id: "trust-proof",
      label: "Доверие и доказательства",
      style: "glass",
    },
    CERTIFICATE: {
      id: "trust-proof",
      label: "Доверие и доказательства",
      style: "glass",
    },
    PRICING: {
      id: "conversion",
      label: "Решение о покупке",
      style: "accent",
    },
    FAQ: {
      id: "conversion",
      label: "Решение о покупке",
      style: "accent",
    },
    CTA: {
      id: "conversion",
      label: "Решение о покупке",
      style: "accent",
    },
  };

  const preset = presets[type];

  if (!preset) {
    return null;
  }

  return {
    id: preset.id,
    label: preset.label,
    style: preset.style,
    accentColor: preset.accentColor ?? pageTheme.accent,
    surfaceColor: preset.surfaceColor ?? pageTheme.surface,
    textColor: preset.textColor ?? pageTheme.text,
    borderColor: preset.borderColor ?? hexToRgba(pageTheme.text, 0.08),
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

export function localizeSalesPageText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  return legacySalesPageCopyMap[trimmed] ?? trimmed;
}

export function getSalesPageBlockDisplayTitle(input: {
  type: SalesPageBlockType;
  title?: string | null;
}) {
  const title = input.title?.trim();

  if (!title || title === input.type) {
    return getSalesPageBlockLabel(input.type);
  }

  return localizeSalesPageText(title);
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
          `Собери понятный результат в категории ${course.category} и двигайся по программе с AI-помощником, практикой и премиальной подачей.`,
        primaryCtaText: "Купить курс",
        secondaryCtaText: "Смотреть программу",
        coverImage: course.coverUrl ?? "",
        badges: uniqueStrings([
          course.category,
          course.level,
          `${lessonCount} уроков`,
          course.aiEnhanced ? "AI-усилен" : "",
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
              "Курс ведет не к просмотру видео, а к ощутимому результату внутри своей сферы.",
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
              "Каждый модуль и урок поданы так, чтобы обучение ощущалось как премиальный продукт.",
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
            description: "Добавь реальный отзыв, когда он появится.",
          },
          {
            title: "Наконец стало понятно, что делать после урока",
            description: "Можно заменить этот пример своим кейсом и живой цитатой.",
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
          "AI-усиленные материалы",
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
        headline: "Сертификат подтвержденного навыка",
        body:
          "После прохождения и практического результата можно получить публично проверяемый сертификат навыка без ложных обещаний о госдипломе.",
      };
    case "COMMUNITY":
      return {
        headline: "Доступ к сообществу",
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
          { title: "AI", description: "Усиленный учебный опыт", icon: "bot" },
          { title: "Практика", description: "Задания и проектный результат", icon: "sparkles" },
          { title: "Материалы", description: "Материалы и шаблоны внутри", icon: "folder" },
          { title: "Логика", description: "Понятная структура прохождения", icon: "layers" },
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
          ? "Курс можно объяснить через реальные мини-челленджи и прогресс по шагам."
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
