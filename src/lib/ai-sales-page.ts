import {
  createDefaultBlockContent,
  createSalesPageTemplateBlocks,
  flattenSalesPageText,
  type SalesPageBlockContent,
  type SalesPageBlockDraft,
  type SalesPageCourseContext,
  type SalesPageDraft,
  type SalesPageTemplateKey,
} from "@/lib/sales-page";

export type SalesPageSuggestion = {
  id: string;
  problem: string;
  whyItMatters: string;
  suggestedCopy: string;
  targetBlockId?: string;
  targetBlockType?: SalesPageBlockDraft["type"];
  targetField?: string;
};

function getBlockTextValue(content: SalesPageBlockContent, key: string) {
  const value = content[key];
  return typeof value === "string" ? value.trim() : "";
}

function withUpdatedContent(
  block: SalesPageBlockDraft,
  patch: Partial<SalesPageBlockContent>,
): SalesPageBlockDraft {
  return {
    ...block,
    content: {
      ...block.content,
      ...patch,
    },
  };
}

function courseOutcomeCopy(course: SalesPageCourseContext) {
  const firstLesson = course.modules[0]?.lessons[0]?.title ?? "рабочий проект";
  return `За ${course.modules.length} модулей ты соберешь понятную систему вокруг темы "${course.title}" и доведешь ее до прикладного результата, а не остановишься на теории. Первый ощутимый шаг начнется уже с блока "${firstLesson}".`;
}

export function suggestBetterHeadline(
  page: Pick<SalesPageDraft, "blocks" | "title">,
  course: SalesPageCourseContext,
) {
  const hero = page.blocks.find((block) => block.type === "HERO");
  const currentHeadline = hero ? getBlockTextValue(hero.content, "headline") : "";

  if (currentHeadline.length >= 42 && /собер|сдела|результат|систем/i.test(currentHeadline)) {
    return null;
  }

  return {
    id: "headline",
    problem: "На первом экране не хватает ясного результата.",
    whyItMatters:
      "Покупателю нужно быстро понять, чему именно он научится и что получит после прохождения.",
    suggestedCopy:
      `${course.title}: собери практический результат в ${course.category} без хаотичного обучения`,
    targetBlockId: hero?.id,
    targetBlockType: "HERO" as const,
    targetField: "headline",
  } satisfies SalesPageSuggestion;
}

export function suggestFAQ(course: SalesPageCourseContext) {
  return [
    {
      id: "faq-1",
      problem: "На странице могут отсутствовать ответы на базовые возражения.",
      whyItMatters:
        "FAQ снимает сомнения по опыту, формату, длительности и тому, что будет внутри кроме видео.",
      suggestedCopy:
        `Добавь вопросы про стартовый уровень ${course.level}, практику внутри курса и материалы, которые студент получит вместе с программой.`,
      targetBlockType: "FAQ" as const,
    },
  ] satisfies SalesPageSuggestion[];
}

export function suggestCTA(course: SalesPageCourseContext) {
  return {
    id: "cta",
    problem: "CTA может звучать слишком нейтрально и не подчеркивать ценность.",
    whyItMatters:
      "Финальный CTA должен повторить результат и дать спокойный следующий шаг без агрессии.",
    suggestedCopy:
      `Открыть ${course.title} и начать движение к практическому результату`,
    targetBlockType: "CTA" as const,
    targetField: "primaryCtaText",
  } satisfies SalesPageSuggestion;
}

export function suggestObjectionHandlingBlocks(course: SalesPageCourseContext) {
  return [
    {
      id: "objection-faq",
      problem: "Не хватает блока, который закрывает возражения про формат и нагрузку.",
      whyItMatters:
        "Если у страницы нет честных ответов про сложность, ритм и материалы, часть трафика просто не дойдет до checkout.",
      suggestedCopy:
        `Добавь FAQ и подчеркни, что курс уровня ${course.level}, идет по модулям и помогает двигаться без перегруза.`,
      targetBlockType: "FAQ" as const,
    },
  ] satisfies SalesPageSuggestion[];
}

export function auditSalesPage(
  page: Pick<SalesPageDraft, "blocks" | "title" | "metaTitle" | "metaDescription">,
  course: SalesPageCourseContext,
) {
  const suggestions: SalesPageSuggestion[] = [];
  const visibleTypes = new Set(page.blocks.filter((block) => block.isVisible).map((block) => block.type));
  const text = flattenSalesPageText(page);

  const headlineSuggestion = suggestBetterHeadline(page, course);
  if (headlineSuggestion) {
    suggestions.push(headlineSuggestion);
  }

  if (!visibleTypes.has("WHO_IS_THIS_FOR") && !visibleTypes.has("OUTCOMES")) {
    suggestions.push({
      id: "audience",
      problem: "На странице не видно, кому именно подходит курс.",
      whyItMatters:
        "Покупателю важно узнать себя в тексте и понять, для какого уровня и сценария создан курс.",
      suggestedCopy:
        `Добавь блок "Кому подойдет" и честно опиши уровень ${course.level}, боли и стартовую готовность.`,
      targetBlockType: "WHO_IS_THIS_FOR",
    });
  }

  if (!visibleTypes.has("WHAT_YOU_WILL_BUILD")) {
    suggestions.push({
      id: "build-result",
      problem: "На странице не показан практический итог обучения.",
      whyItMatters:
        "Когда человек видит, что именно он соберет руками, решение о покупке становится проще.",
      suggestedCopy: courseOutcomeCopy(course),
      targetBlockType: "WHAT_YOU_WILL_BUILD",
    });
  }

  if (!visibleTypes.has("FAQ")) {
    suggestions.push(...suggestFAQ(course));
  }

  if (!visibleTypes.has("CTA")) {
    suggestions.push(suggestCTA(course));
  }

  if (text.length < 600) {
    suggestions.push({
      id: "depth",
      problem: "Страница сейчас выглядит слишком короткой.",
      whyItMatters:
        "Для холодного трафика нужно больше контекста: результат, программа, доверие и ответы на вопросы.",
      suggestedCopy:
        "Добавь блоки результата, того что соберет ученик, FAQ и цены, чтобы страница продавала курс, а не только красиво выглядела.",
    });
  }

  return suggestions;
}

export function improveSalesPageBlock(
  block: SalesPageBlockDraft,
  course: SalesPageCourseContext,
) {
  switch (block.type) {
    case "HERO":
      return withUpdatedContent(block, {
        headline:
          getBlockTextValue(block.content, "headline") ||
          `${course.title}: собери практический результат без хаоса`,
        subheadline:
          getBlockTextValue(block.content, "subheadline") || courseOutcomeCopy(course),
      });
    case "OUTCOMES":
      return withUpdatedContent(block, {
        items: (
          block.content.items as SalesPageBlockContent["items"] | undefined
        )?.length
          ? block.content.items
          : createDefaultBlockContent("OUTCOMES", course).items,
      });
    case "WHO_IS_THIS_FOR":
      return withUpdatedContent(block, {
        items: createDefaultBlockContent("WHO_IS_THIS_FOR", course).items,
      });
    case "WHAT_YOU_WILL_BUILD":
      return withUpdatedContent(block, {
        body: courseOutcomeCopy(course),
        deliverables: [
          "Финальный проект или deliverable по теме курса",
          "Рабочий набор материалов и шаблонов",
          "Понятный workflow, который можно повторить дальше",
        ],
      });
    case "FAQ":
      return withUpdatedContent(block, {
        faqs: createDefaultBlockContent("FAQ", course).faqs,
      });
    case "CTA":
      return withUpdatedContent(block, {
        primaryCtaText: "Открыть курс",
        headline: "Войти в курс и начать путь к результату",
      });
    default:
      return withUpdatedContent(block, {
        body:
          getBlockTextValue(block.content, "body") ||
          "Этот блок дополнен так, чтобы страница яснее объясняла результат, формат и ценность курса.",
      });
  }
}

export function generateSalesPageFromCourse(
  course: SalesPageCourseContext,
  template: SalesPageTemplateKey = "practical-skill",
) {
  return {
    title: course.title,
    blocks: createSalesPageTemplateBlocks(template, course),
  };
}

export function applySuggestionToBlocks(
  blocks: SalesPageBlockDraft[],
  suggestion: SalesPageSuggestion,
  course: SalesPageCourseContext,
) {
  const target = suggestion.targetBlockId
    ? blocks.find((block) => block.id === suggestion.targetBlockId)
    : suggestion.targetBlockType
      ? blocks.find((block) => block.type === suggestion.targetBlockType)
      : undefined;

  if (!target) {
    if (suggestion.targetBlockType) {
      const nextOrder =
        blocks.reduce((max, block) => Math.max(max, block.order), 0) + 1;
      const newBlock = {
        id: `suggestion-${suggestion.id}`,
        type: suggestion.targetBlockType,
        order: nextOrder,
        title: suggestion.targetBlockType,
        subtitle: null,
        content: createDefaultBlockContent(suggestion.targetBlockType, course),
        settings: {
          variant: "default",
          showModules: true,
          showLessonCount: true,
          backgroundStyle: "glass",
        },
        isVisible: true,
      } satisfies SalesPageBlockDraft;

      return [...blocks, newBlock];
    }

    return blocks;
  }

  if (typeof suggestion.targetField === "string") {
    const targetField = suggestion.targetField;

    return blocks.map((block) =>
      block.id === target.id
        ? withUpdatedContent(block, {
            [targetField]: suggestion.suggestedCopy,
          })
        : block,
    );
  }

  return blocks.map((block) =>
    block.id === target.id
      ? withUpdatedContent(block, {
          body: suggestion.suggestedCopy,
        })
      : block,
  );
}
