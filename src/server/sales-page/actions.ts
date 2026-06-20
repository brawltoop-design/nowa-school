"use server";

import {
  CourseStatus,
  ModerationIssueStatus,
  Prisma,
  SalesPageStatus,
  SalesPageSubmissionStatus,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerAuthSession } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";
import {
  applySuggestionToBlocks,
  auditSalesPage,
  generateSalesPageFromCourse,
  improveSalesPageBlock,
  type SalesPageSuggestion,
} from "@/lib/ai-sales-page";
import {
  coerceSalesPageBlockSettings,
  coerceSalesPageObject,
  coerceSalesPageSectionSettings,
  createDefaultBlockContent,
  createInitialSalesPage,
  getDefaultSalesPageTheme,
  getAutoSalesPageSectionSettings,
  getSalesPageBlockLabel,
  type SalesPageBlockContent,
  type SalesPageBlockDraft,
  type SalesPageBlockSettings,
  type SalesPageSectionSettings,
} from "@/lib/sales-page";
import { slugifyCourseTitle } from "@/lib/validators/course";
import { getAllCourseStudioPaths } from "@/lib/course-studio";
import {
  adminModerationDecisionSchema,
  moderationSubmissionSchema,
  salesPageBlockUpdateSchema,
  salesPageMetaSchema,
  salesPageTemplateSchema,
  type AdminModerationDecisionInput,
  type ModerationSubmissionInput,
  type SalesPageBlockUpdateInput,
  type SalesPageMetaInput,
  type SalesPageTemplateInput,
} from "@/lib/validators/sales-page";
import { mapCourseContext } from "@/server/sales-page/queries";
import {
  runSalesPageModerationCheck,
  type ModerationIssueResult,
} from "@/server/sales-page/moderation";

type AuthorActionResult<T = undefined> = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: T;
};

type SalesPageActor = {
  userId: string;
  role: UserRole;
};

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function buildCourseAccessWhere(actor: SalesPageActor) {
  return actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId };
}

function unauthorizedResult<T = undefined>(): AuthorActionResult<T> {
  return {
    success: false,
    message: "У тебя нет доступа к этому действию.",
  };
}

async function getAuthorActor(): Promise<SalesPageActor | null> {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return null;
  }

  if (session.user.role !== UserRole.AUTHOR && session.user.role !== UserRole.ADMIN) {
    return null;
  }

  return {
    userId: session.user.id,
    role: session.user.role,
  };
}

async function getAdminActor() {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return null;
  }

  return {
    userId: session.user.id,
  };
}

function revalidateSalesPageSurfaces(courseId: string, courseSlug: string) {
  revalidatePath("/author");
  revalidatePath(`/author/courses/${courseId}/builder`);
  revalidatePath(`/author/courses/${courseId}/studio`);
  for (const path of getAllCourseStudioPaths(courseId)) {
    revalidatePath(path);
  }
  revalidatePath(`/author/courses/${courseId}/preview/sales-page`);
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseSlug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/moderation");
}

async function getCourseForSalesPageAction(courseId: string, actor: SalesPageActor) {
  const prisma = getPrismaClient();
  return prisma.course.findFirst({
    where: {
      id: courseId,
      ...buildCourseAccessWhere(actor),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      badges: {
        where: {
          certificateId: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
        },
      },
      modules: {
        orderBy: [{ order: "asc" }],
        include: {
          lessons: {
            orderBy: [{ order: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              durationMinutes: true,
              videoUrl: true,
              transcript: true,
              contentText: true,
              aiSummary: true,
              order: true,
            },
          },
        },
      },
      salesPage: {
        include: {
          blocks: {
            orderBy: [{ order: "asc" }],
          },
        },
      },
    },
  });
}

async function ensureSalesPageForCourse(
  courseId: string,
  actor: SalesPageActor,
  template: SalesPageTemplateInput = "practical-skill",
) {
  const prisma = getPrismaClient();
  const course = await getCourseForSalesPageAction(courseId, actor);

  if (!course) {
    return null;
  }

  if (course.salesPage) {
    return course;
  }

  const courseContext = mapCourseContext(course);
  const initialPage = createInitialSalesPage(courseContext, template);

  await prisma.courseSalesPage.create({
    data: {
      courseId: course.id,
      slug: initialPage.slug,
      status: initialPage.status,
      title: initialPage.title,
      metaTitle: initialPage.metaTitle,
      metaDescription: initialPage.metaDescription,
      ogImage: initialPage.ogImage,
      theme: toInputJson(initialPage.theme),
      blocks: {
        create: initialPage.blocks.map((block) => ({
          type: block.type,
          order: block.order,
          title: block.title,
          subtitle: block.subtitle,
          content: toInputJson(block.content),
          settings: toInputJson(block.settings),
          isVisible: block.isVisible,
        })),
      },
    },
  });

  return getCourseForSalesPageAction(courseId, actor);
}

async function getSalesPageBlockWithContext(
  blockId: string,
  actor: SalesPageActor,
) {
  const prisma = getPrismaClient();
  const block = await prisma.salesPageBlock.findUnique({
    where: { id: blockId },
    include: {
      salesPage: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
          blocks: {
            orderBy: [{ order: "asc" }],
            select: {
              id: true,
              type: true,
              order: true,
              title: true,
              subtitle: true,
              content: true,
              settings: true,
              isVisible: true,
            },
          },
        },
      },
    },
  });

  if (
    !block ||
    (actor.role !== UserRole.ADMIN && block.salesPage.course.authorId !== actor.userId)
  ) {
    return null;
  }

  return block;
}

async function reindexSalesPageBlocks(
  tx: Prisma.TransactionClient,
  salesPageId: string,
) {
  const blocks = await tx.salesPageBlock.findMany({
    where: { salesPageId },
    orderBy: [{ order: "asc" }],
    select: {
      id: true,
    },
  });

  await Promise.all(
    blocks.map((block, index) =>
      tx.salesPageBlock.update({
        where: { id: block.id },
        data: {
          order: index + 1,
        },
      }),
    ),
  );
}

async function applySalesPageBlockOrder(
  tx: Prisma.TransactionClient,
  orderedIds: string[],
) {
  await Promise.all(
    orderedIds.map((blockId, index) =>
      tx.salesPageBlock.update({
        where: { id: blockId },
        data: {
          order: -(index + 1),
        },
      }),
    ),
  );

  await Promise.all(
    orderedIds.map((blockId, index) =>
      tx.salesPageBlock.update({
        where: { id: blockId },
        data: {
          order: index + 1,
        },
      }),
    ),
  );
}

function createUniqueSectionId(base?: string) {
  const normalizedBase = slugifyCourseTitle(base ?? "section") || "section";
  const suffix = crypto.randomUUID().split("-")[0];
  return `${normalizedBase}-${suffix}`;
}

function getResolvedSectionSettings(block: {
  type: SalesPageBlockDraft["type"];
  settings: Prisma.JsonValue;
}) {
  return (
    coerceSalesPageSectionSettings(block.settings, getDefaultSalesPageTheme()) ??
    getAutoSalesPageSectionSettings(block.type, getDefaultSalesPageTheme())
  );
}

function getSectionRangeForIndex(
  blocks: Array<{
    id: string;
    type: SalesPageBlockDraft["type"];
    settings: Prisma.JsonValue;
  }>,
  index: number,
) {
  const section = getResolvedSectionSettings(blocks[index]);

  if (!section) {
    return {
      start: index,
      end: index,
      section: null,
    };
  }

  let start = index;
  let end = index;

  while (start > 0) {
    const previousSection = getResolvedSectionSettings(blocks[start - 1]);

    if (previousSection?.id !== section.id) {
      break;
    }

    start -= 1;
  }

  while (end < blocks.length - 1) {
    const nextSection = getResolvedSectionSettings(blocks[end + 1]);

    if (nextSection?.id !== section.id) {
      break;
    }

    end += 1;
  }

  return {
    start,
    end,
    section,
  };
}

function buildSectionBoundSettings(
  value: Prisma.JsonValue,
  section: SalesPageSectionSettings | null,
  overrides?: {
    sectionId?: string;
    sectionLabel?: string;
  },
) {
  const settings = coerceSalesPageBlockSettings(value, getDefaultSalesPageTheme());

  if (!section && !overrides?.sectionId && !overrides?.sectionLabel) {
    return settings;
  }

  return {
    ...settings,
    sectionId: overrides?.sectionId ?? section?.id ?? settings.sectionId,
    sectionLabel:
      overrides?.sectionLabel ?? section?.label ?? settings.sectionLabel,
    sectionStyle: section?.style ?? settings.sectionStyle,
    sectionAccentColor: section?.accentColor ?? settings.sectionAccentColor,
    sectionSurfaceColor: section?.surfaceColor ?? settings.sectionSurfaceColor,
    sectionTextColor: section?.textColor ?? settings.sectionTextColor,
    sectionBorderColor: section?.borderColor ?? settings.sectionBorderColor,
  };
}

function mapExistingBlock(block: {
  id: string;
  type: SalesPageBlockDraft["type"];
  order: number;
  title: string | null;
  subtitle: string | null;
  content: Prisma.JsonValue;
  settings: Prisma.JsonValue;
  isVisible: boolean;
}): SalesPageBlockDraft {
  return {
    id: block.id,
    type: block.type,
    order: block.order,
    title: block.title,
    subtitle: block.subtitle,
    content: coerceSalesPageObject<SalesPageBlockContent>(block.content),
    settings: coerceSalesPageObject<SalesPageBlockSettings>(block.settings),
    isVisible: block.isVisible,
  };
}

async function createModerationIssues(
  tx: Prisma.TransactionClient,
  params: {
    courseId: string;
    salesPageId: string;
    authorId: string;
    issues: ModerationIssueResult[];
  },
) {
  await tx.courseModerationIssue.updateMany({
    where: {
      salesPageId: params.salesPageId,
      status: ModerationIssueStatus.OPEN,
    },
    data: {
      status: ModerationIssueStatus.RESOLVED,
    },
  });

  if (!params.issues.length) {
    return;
  }

  await tx.courseModerationIssue.createMany({
    data: params.issues.map((issue) => ({
      courseId: params.courseId,
      salesPageId: params.salesPageId,
      authorId: params.authorId,
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
      fieldPath: issue.fieldPath ?? null,
      status: ModerationIssueStatus.OPEN,
    })),
  });
}

export async function initializeSalesPageTemplate(
  courseId: string,
  template: SalesPageTemplateInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const parsed = salesPageTemplateSchema.safeParse(template);

  if (!parsed.success) {
    return {
      success: false,
      message: "Unknown template.",
    };
  }

  const course = await ensureSalesPageForCourse(courseId, actor, parsed.data);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  const courseContext = mapCourseContext(course);
  const generated = generateSalesPageFromCourse(courseContext, parsed.data);

  await prisma.$transaction(async (tx) => {
    await tx.salesPageBlock.deleteMany({
      where: {
        salesPageId: course.salesPage!.id,
      },
    });

    await tx.courseSalesPage.update({
      where: {
        id: course.salesPage!.id,
      },
      data: {
        title: generated.title,
        metaTitle: `${course.title} | nowa school`,
        metaDescription: course.description,
        ogImage: course.coverUrl,
        theme: toInputJson(getDefaultSalesPageTheme()),
        status:
          course.salesPage!.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
        submittedAt: null,
      },
    });

    await tx.salesPageBlock.createMany({
      data: generated.blocks.map((block) => ({
        salesPageId: course.salesPage!.id,
        type: block.type,
        order: block.order,
        title: block.title,
        subtitle: block.subtitle,
        content: toInputJson(block.content),
        settings: toInputJson(block.settings),
        isVisible: block.isVisible,
      })),
    });
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: "Шаблон sales page применен.",
  };
}

export async function saveSalesPageMeta(
  courseId: string,
  values: SalesPageMetaInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  const parsed = salesPageMetaSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь настройки страницы.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.courseSalesPage.update({
    where: {
      id: course.salesPage.id,
    },
    data: {
      title: parsed.data.title,
      metaTitle: parsed.data.metaTitle || null,
      metaDescription: parsed.data.metaDescription || null,
      ogImage: parsed.data.ogImage || null,
      theme: toInputJson(parsed.data.theme),
      status:
        course.salesPage.status === SalesPageStatus.PUBLISHED
          ? SalesPageStatus.UNPUBLISHED
          : course.salesPage.status === SalesPageStatus.APPROVED
            ? SalesPageStatus.APPROVED
            : SalesPageStatus.DRAFT,
      rejectionReason: null,
    },
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: "Настройки sales page сохранены.",
  };
}

export async function createSalesPageBlock(
  courseId: string,
  type: SalesPageBlockDraft["type"],
  afterBlockId?: string | null,
  position: "before" | "after" = "after",
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  await prisma.$transaction(async (tx) => {
    const lastOrder =
      course.salesPage!.blocks.reduce(
        (max, block) => Math.max(max, block.order),
        0,
      ) + 1;

    const newBlock = await tx.salesPageBlock.create({
      data: {
        salesPageId: course.salesPage!.id,
        type,
        order: lastOrder,
        title: type,
        subtitle: null,
        content: toInputJson(
          createDefaultBlockContent(type, mapCourseContext(course)),
        ),
        settings: toInputJson({
          variant: "default",
          showModules: true,
          showLessonCount: true,
          backgroundStyle: "glass",
        }),
        isVisible: true,
      },
      select: {
        id: true,
      },
    });

    if (afterBlockId) {
      const orderedIds = course.salesPage!.blocks
        .map((block) => block.id)
        .filter((blockId) => blockId !== newBlock.id);
      const targetIndex = orderedIds.findIndex((blockId) => blockId === afterBlockId);

      if (targetIndex >= 0) {
        orderedIds.splice(position === "before" ? targetIndex : targetIndex + 1, 0, newBlock.id);
        await applySalesPageBlockOrder(tx, orderedIds);
      }
    } else if (position === "before") {
      await applySalesPageBlockOrder(tx, [newBlock.id, ...course.salesPage!.blocks.map((block) => block.id)]);
    }
  });

  await prisma.courseSalesPage.update({
    where: {
      id: course.salesPage.id,
    },
    data: {
      status:
        course.salesPage.status === SalesPageStatus.PUBLISHED
          ? SalesPageStatus.UNPUBLISHED
          : SalesPageStatus.DRAFT,
    },
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: "Блок добавлен.",
  };
}

export async function createSalesPageBlockBatch(
  courseId: string,
  types: SalesPageBlockDraft["type"][],
  afterBlockId?: string | null,
  position: "before" | "after" = "after",
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const uniqueTypes = types.filter(Boolean);

  if (!uniqueTypes.length) {
    return {
      success: false,
      message: "Выбери хотя бы один блок для вставки.",
    };
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  await prisma.$transaction(async (tx) => {
    const lastOrder =
      course.salesPage!.blocks.reduce(
        (max, block) => Math.max(max, block.order),
        0,
      ) + 1;

    const courseContext = mapCourseContext(course);
    const createdIds: string[] = [];

    for (const [index, type] of uniqueTypes.entries()) {
      const createdBlock = await tx.salesPageBlock.create({
        data: {
          salesPageId: course.salesPage!.id,
          type,
          order: lastOrder + index,
          title: type,
          subtitle: null,
          content: toInputJson(createDefaultBlockContent(type, courseContext)),
          settings: toInputJson({
            variant: "default",
            showModules: true,
            showLessonCount: true,
            backgroundStyle: "glass",
          }),
          isVisible: true,
        },
        select: {
          id: true,
        },
      });

      createdIds.push(createdBlock.id);
    }

    const orderedIds = course.salesPage!.blocks.map((block) => block.id);

    if (afterBlockId) {
      const targetIndex = orderedIds.findIndex((blockId) => blockId === afterBlockId);

      if (targetIndex >= 0) {
        orderedIds.splice(
          position === "before" ? targetIndex : targetIndex + 1,
          0,
          ...createdIds,
        );
      } else {
        orderedIds.push(...createdIds);
      }
    } else if (position === "before") {
      orderedIds.unshift(...createdIds);
    } else {
      orderedIds.push(...createdIds);
    }

    await applySalesPageBlockOrder(tx, orderedIds);
  });

  await prisma.courseSalesPage.update({
    where: {
      id: course.salesPage.id,
    },
    data: {
      status:
        course.salesPage.status === SalesPageStatus.PUBLISHED
          ? SalesPageStatus.UNPUBLISHED
          : SalesPageStatus.DRAFT,
      rejectionReason: null,
    },
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: `${uniqueTypes.length} блоков добавлено в страницу.`,
  };
}

export async function insertSalesPageSectionKit(
  courseId: string,
  types: SalesPageBlockDraft["type"][],
  options?: {
    anchorBlockId?: string | null;
    position?: "before" | "after";
    sectionLabel?: string;
    sectionStyle?: SalesPageBlockSettings["sectionStyle"];
  },
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const uniqueTypes = types.filter(Boolean);

  if (!uniqueTypes.length) {
    return {
      success: false,
      message: "Выбери хотя бы один блок для новой секции.",
    };
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  const courseContext = mapCourseContext(course);
  const baseSection =
    getAutoSalesPageSectionSettings(uniqueTypes[0], getDefaultSalesPageTheme()) ??
    getAutoSalesPageSectionSettings("CUSTOM_TEXT", getDefaultSalesPageTheme());
  const sectionLabel =
    options?.sectionLabel?.trim() ||
    `${getSalesPageBlockLabel(uniqueTypes[0])} section`;
  const sectionId = createUniqueSectionId(sectionLabel);

  await prisma.$transaction(async (tx) => {
    const lastOrder =
      course.salesPage!.blocks.reduce(
        (max, block) => Math.max(max, block.order),
        0,
      ) + 1;

    const createdIds: string[] = [];

    for (const [index, type] of uniqueTypes.entries()) {
      const createdBlock = await tx.salesPageBlock.create({
        data: {
          salesPageId: course.salesPage!.id,
          type,
          order: lastOrder + index,
          title: getSalesPageBlockLabel(type),
          subtitle: null,
          content: toInputJson(createDefaultBlockContent(type, courseContext)),
          settings: toInputJson(
            buildSectionBoundSettings(
              {
                variant: "default",
                showModules: true,
                showLessonCount: true,
                backgroundStyle: "glass",
              },
              {
                id: sectionId,
                label: sectionLabel,
                style: options?.sectionStyle ?? baseSection?.style ?? "soft",
                accentColor:
                  baseSection?.accentColor ?? getDefaultSalesPageTheme().accent,
                surfaceColor:
                  baseSection?.surfaceColor ?? getDefaultSalesPageTheme().surface,
                textColor:
                  baseSection?.textColor ?? getDefaultSalesPageTheme().text,
                borderColor:
                  baseSection?.borderColor ??
                  "rgba(5, 7, 11, 0.08)",
              },
            ),
          ),
          isVisible: true,
        },
        select: {
          id: true,
        },
      });

      createdIds.push(createdBlock.id);
    }

    const orderedIds = course.salesPage!.blocks.map((block) => block.id);
    const anchorBlockId = options?.anchorBlockId;
    const position = options?.position ?? "after";

    if (anchorBlockId) {
      const targetIndex = orderedIds.findIndex((blockId) => blockId === anchorBlockId);

      if (targetIndex >= 0) {
        orderedIds.splice(
          position === "before" ? targetIndex : targetIndex + 1,
          0,
          ...createdIds,
        );
      } else {
        orderedIds.push(...createdIds);
      }
    } else if (position === "before") {
      orderedIds.unshift(...createdIds);
    } else {
      orderedIds.push(...createdIds);
    }

    await applySalesPageBlockOrder(tx, orderedIds);

    await tx.courseSalesPage.update({
      where: {
        id: course.salesPage!.id,
      },
      data: {
        status:
          course.salesPage!.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
        rejectionReason: null,
      },
    });
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: `Новая секция "${sectionLabel}" добавлена.`,
  };
}

export async function replaceSalesPageBlockType(
  blockId: string,
  nextType: SalesPageBlockDraft["type"],
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await getSalesPageBlockWithContext(blockId, actor);

  if (!block) {
    return unauthorizedResult();
  }

  const course = await getCourseForSalesPageAction(block.salesPage.course.id, actor);

  if (!course) {
    return unauthorizedResult();
  }

  const currentSettings = coerceSalesPageBlockSettings(
    block.settings,
    getDefaultSalesPageTheme(),
  );

  await prisma.$transaction(async (tx) => {
    await tx.salesPageBlock.update({
      where: { id: block.id },
      data: {
        type: nextType,
        title: getSalesPageBlockLabel(nextType),
        subtitle: null,
        content: toInputJson(
          createDefaultBlockContent(nextType, mapCourseContext(course)),
        ),
        settings: toInputJson(currentSettings),
      },
    });

    await tx.courseSalesPage.update({
      where: {
        id: block.salesPageId,
      },
      data: {
        status:
          block.salesPage.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
        rejectionReason: null,
      },
    });
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: `Блок заменен на ${getSalesPageBlockLabel(nextType)}.`,
  };
}

export async function updateSalesPageBlock(
  blockId: string,
  values: SalesPageBlockUpdateInput,
): Promise<AuthorActionResult<{ block: SalesPageBlockDraft }>> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await prisma.salesPageBlock.findUnique({
    where: { id: blockId },
    include: {
      salesPage: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !block ||
    (actor.role !== UserRole.ADMIN && block.salesPage.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const parsed = salesPageBlockUpdateSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь содержимое блока.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const updated = await prisma.salesPageBlock.update({
    where: {
      id: block.id,
    },
    data: {
      title: parsed.data.title ?? null,
      subtitle: parsed.data.subtitle ?? null,
      content: toInputJson(parsed.data.content),
      settings: toInputJson(parsed.data.settings),
      isVisible: parsed.data.isVisible,
    },
  });

  await prisma.courseSalesPage.update({
    where: {
      id: block.salesPageId,
    },
    data: {
      status:
        block.salesPage.status === SalesPageStatus.PUBLISHED
          ? SalesPageStatus.UNPUBLISHED
          : SalesPageStatus.DRAFT,
      rejectionReason: null,
    },
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: "Блок сохранен.",
    data: {
      block: mapExistingBlock(updated),
    },
  };
}

export async function moveSalesPageBlock(
  blockId: string,
  direction: "up" | "down",
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await prisma.salesPageBlock.findUnique({
    where: { id: blockId },
    include: {
      salesPage: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
          blocks: {
            orderBy: [{ order: "asc" }],
            select: {
              id: true,
              order: true,
            },
          },
        },
      },
    },
  });

  if (
    !block ||
    (actor.role !== UserRole.ADMIN && block.salesPage.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const currentIndex = block.salesPage.blocks.findIndex((item) => item.id === block.id);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= block.salesPage.blocks.length) {
    return {
      success: false,
      message: "Этот блок уже нельзя сдвинуть дальше.",
    };
  }

  const current = block.salesPage.blocks[currentIndex];
  const target = block.salesPage.blocks[targetIndex];

  await prisma.$transaction([
    prisma.salesPageBlock.update({
      where: { id: current.id },
      data: { order: -1 },
    }),
    prisma.salesPageBlock.update({
      where: { id: target.id },
      data: { order: current.order },
    }),
    prisma.salesPageBlock.update({
      where: { id: current.id },
      data: { order: target.order },
    }),
    prisma.courseSalesPage.update({
      where: { id: block.salesPageId },
      data: {
        status:
          block.salesPage.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
      },
    }),
  ]);

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: "Порядок блоков обновлен.",
  };
}

export async function reorderSalesPageBlocks(
  courseId: string,
  orderedIds: string[],
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  const currentIds = course.salesPage.blocks
    .map((block) => block.id)
    .sort();
  const nextIds = [...orderedIds].sort();

  if (
    currentIds.length !== nextIds.length ||
    currentIds.some((id, index) => id !== nextIds[index])
  ) {
    return {
      success: false,
      message: "Не удалось сохранить новый порядок блоков.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await applySalesPageBlockOrder(tx, orderedIds);

    await tx.courseSalesPage.update({
      where: {
        id: course.salesPage!.id,
      },
      data: {
        status:
          course.salesPage!.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
        rejectionReason: null,
      },
    });
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: "Drag-and-drop порядок сохранен.",
  };
}

export async function moveSalesPageSection(
  blockId: string,
  direction: "up" | "down",
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await getSalesPageBlockWithContext(blockId, actor);

  if (!block) {
    return unauthorizedResult();
  }

  const blocks = block.salesPage.blocks;
  const currentIndex = blocks.findIndex((item) => item.id === block.id);

  if (currentIndex === -1) {
    return {
      success: false,
      message: "Секция не найдена.",
    };
  }

  const currentRange = getSectionRangeForIndex(blocks, currentIndex);

  if (direction === "up" && currentRange.start === 0) {
    return {
      success: false,
      message: "Эта секция уже находится вверху.",
    };
  }

  if (direction === "down" && currentRange.end === blocks.length - 1) {
    return {
      success: false,
      message: "Эта секция уже находится внизу.",
    };
  }

  const adjacentIndex =
    direction === "up" ? currentRange.start - 1 : currentRange.end + 1;
  const adjacentRange = getSectionRangeForIndex(blocks, adjacentIndex);
  const beforeCurrent = blocks.slice(0, currentRange.start).map((item) => item.id);
  const currentIds = blocks
    .slice(currentRange.start, currentRange.end + 1)
    .map((item) => item.id);
  const beforeAdjacent = blocks.slice(0, adjacentRange.start).map((item) => item.id);
  const adjacentIds = blocks
    .slice(adjacentRange.start, adjacentRange.end + 1)
    .map((item) => item.id);
  const afterAdjacent = blocks.slice(adjacentRange.end + 1).map((item) => item.id);
  const afterCurrent = blocks.slice(currentRange.end + 1).map((item) => item.id);

  const orderedIds =
    direction === "up"
      ? [
          ...beforeAdjacent,
          ...currentIds,
          ...adjacentIds,
          ...afterCurrent,
        ]
      : [
          ...beforeCurrent,
          ...adjacentIds,
          ...currentIds,
          ...afterAdjacent,
        ];

  await prisma.$transaction(async (tx) => {
    await applySalesPageBlockOrder(tx, orderedIds);

    await tx.courseSalesPage.update({
      where: {
        id: block.salesPageId,
      },
      data: {
        status:
          block.salesPage.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
        rejectionReason: null,
      },
    });
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: "Секция переставлена.",
  };
}

export async function duplicateSalesPageSection(
  blockId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await getSalesPageBlockWithContext(blockId, actor);

  if (!block) {
    return unauthorizedResult();
  }

  const blocks = block.salesPage.blocks;
  const currentIndex = blocks.findIndex((item) => item.id === block.id);

  if (currentIndex === -1) {
    return {
      success: false,
      message: "Секция не найдена.",
    };
  }

  const currentRange = getSectionRangeForIndex(blocks, currentIndex);
  const sourceSection = currentRange.section;
  const sectionBlocks = blocks.slice(currentRange.start, currentRange.end + 1);
  const sourceLabel =
    sourceSection?.label?.trim() ||
    sectionBlocks[0]?.title ||
    getSalesPageBlockLabel(sectionBlocks[0]?.type ?? "CUSTOM_TEXT");
  const duplicatedLabel = `${sourceLabel} copy`;
  const duplicatedSectionId = createUniqueSectionId(
    sourceSection?.id || sourceLabel,
  );

  await prisma.$transaction(async (tx) => {
    const lastOrder =
      blocks.reduce((max, item) => Math.max(max, item.order), 0) + 1;
    const createdIds: string[] = [];

    for (const [index, sectionBlock] of sectionBlocks.entries()) {
      const duplicated = await tx.salesPageBlock.create({
        data: {
          salesPageId: block.salesPageId,
          type: sectionBlock.type,
          order: lastOrder + index,
          title: sectionBlock.title,
          subtitle: sectionBlock.subtitle,
          content: toInputJson(sectionBlock.content),
          settings: toInputJson(
            buildSectionBoundSettings(sectionBlock.settings, sourceSection, {
              sectionId: duplicatedSectionId,
              sectionLabel: duplicatedLabel,
            }),
          ),
          isVisible: sectionBlock.isVisible,
        },
        select: {
          id: true,
        },
      });

      createdIds.push(duplicated.id);
    }

    const orderedIds = blocks.map((item) => item.id);
    orderedIds.splice(currentRange.end + 1, 0, ...createdIds);
    await applySalesPageBlockOrder(tx, orderedIds);

    await tx.courseSalesPage.update({
      where: {
        id: block.salesPageId,
      },
      data: {
        status:
          block.salesPage.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
        rejectionReason: null,
      },
    });
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: `Секция "${duplicatedLabel}" продублирована.`,
  };
}

export async function deleteSalesPageSection(
  blockId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await getSalesPageBlockWithContext(blockId, actor);

  if (!block) {
    return unauthorizedResult();
  }

  const blocks = block.salesPage.blocks;
  const currentIndex = blocks.findIndex((item) => item.id === block.id);

  if (currentIndex === -1) {
    return {
      success: false,
      message: "Секция не найдена.",
    };
  }

  const currentRange = getSectionRangeForIndex(blocks, currentIndex);
  const sectionLabel =
    currentRange.section?.label ||
    blocks[currentRange.start]?.title ||
    "Section";
  const idsToDelete = blocks
    .slice(currentRange.start, currentRange.end + 1)
    .map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.salesPageBlock.deleteMany({
      where: {
        id: {
          in: idsToDelete,
        },
      },
    });

    await reindexSalesPageBlocks(tx, block.salesPageId);

    await tx.courseSalesPage.update({
      where: {
        id: block.salesPageId,
      },
      data: {
        status:
          block.salesPage.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
        rejectionReason: null,
      },
    });
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: `Секция "${sectionLabel}" удалена.`,
  };
}

export async function duplicateSalesPageBlock(
  blockId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await prisma.salesPageBlock.findUnique({
    where: { id: blockId },
    include: {
      salesPage: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !block ||
    (actor.role !== UserRole.ADMIN && block.salesPage.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  await prisma.$transaction(async (tx) => {
    await tx.salesPageBlock.create({
      data: {
        salesPageId: block.salesPageId,
        type: block.type,
        order: block.order + 1,
        title: block.title,
        subtitle: block.subtitle,
        content: toInputJson(block.content),
        settings: toInputJson(block.settings),
        isVisible: block.isVisible,
      },
    });

    await reindexSalesPageBlocks(tx, block.salesPageId);

    await tx.courseSalesPage.update({
      where: {
        id: block.salesPageId,
      },
      data: {
        status:
          block.salesPage.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
      },
    });
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: "Блок продублирован.",
  };
}

export async function deleteSalesPageBlock(
  blockId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await prisma.salesPageBlock.findUnique({
    where: { id: blockId },
    include: {
      salesPage: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !block ||
    (actor.role !== UserRole.ADMIN && block.salesPage.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  await prisma.$transaction(async (tx) => {
    await tx.salesPageBlock.delete({
      where: {
        id: block.id,
      },
    });
    await reindexSalesPageBlocks(tx, block.salesPageId);
    await tx.courseSalesPage.update({
      where: { id: block.salesPageId },
      data: {
        status:
          block.salesPage.status === SalesPageStatus.PUBLISHED
            ? SalesPageStatus.UNPUBLISHED
            : SalesPageStatus.DRAFT,
      },
    });
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: "Блок удален.",
  };
}

export async function toggleSalesPageBlockVisibility(
  blockId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await prisma.salesPageBlock.findUnique({
    where: { id: blockId },
    include: {
      salesPage: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              authorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !block ||
    (actor.role !== UserRole.ADMIN && block.salesPage.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  await prisma.salesPageBlock.update({
    where: {
      id: block.id,
    },
    data: {
      isVisible: !block.isVisible,
    },
  });

  await prisma.courseSalesPage.update({
    where: {
      id: block.salesPageId,
    },
    data: {
      status:
        block.salesPage.status === SalesPageStatus.PUBLISHED
          ? SalesPageStatus.UNPUBLISHED
          : SalesPageStatus.DRAFT,
    },
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: block.isVisible ? "Блок скрыт." : "Блок снова виден.",
  };
}

export async function resetSalesPageBlock(
  blockId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await prisma.salesPageBlock.findUnique({
    where: { id: blockId },
    include: {
      salesPage: {
        include: {
          course: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              badges: {
                where: {
                  certificateId: null,
                },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  icon: true,
                },
              },
              modules: {
                orderBy: [{ order: "asc" }],
                include: {
                  lessons: {
                    orderBy: [{ order: "asc" }],
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      durationMinutes: true,
                      videoUrl: true,
                      transcript: true,
                      contentText: true,
                      aiSummary: true,
                      order: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    !block ||
    (actor.role !== UserRole.ADMIN && block.salesPage.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const content = createDefaultBlockContent(block.type, mapCourseContext(block.salesPage.course));

  await prisma.salesPageBlock.update({
    where: {
      id: block.id,
    },
    data: {
      content: toInputJson(content),
      settings: toInputJson({
        variant: "default",
        showModules: true,
        showLessonCount: true,
        backgroundStyle: "glass",
      }),
    },
  });

  await prisma.courseSalesPage.update({
    where: {
      id: block.salesPageId,
    },
    data: {
      status:
        block.salesPage.status === SalesPageStatus.PUBLISHED
          ? SalesPageStatus.UNPUBLISHED
          : SalesPageStatus.DRAFT,
    },
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: "Блок сброшен к шаблону.",
  };
}

export async function improveSalesPageBlockAction(
  blockId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const block = await prisma.salesPageBlock.findUnique({
    where: { id: blockId },
    include: {
      salesPage: {
        include: {
          course: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              badges: {
                where: {
                  certificateId: null,
                },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  icon: true,
                },
              },
              modules: {
                orderBy: [{ order: "asc" }],
                include: {
                  lessons: {
                    orderBy: [{ order: "asc" }],
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      durationMinutes: true,
                      videoUrl: true,
                      transcript: true,
                      contentText: true,
                      aiSummary: true,
                      order: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    !block ||
    (actor.role !== UserRole.ADMIN && block.salesPage.course.authorId !== actor.userId)
  ) {
    return unauthorizedResult();
  }

  const improved = improveSalesPageBlock(
    mapExistingBlock(block),
    mapCourseContext(block.salesPage.course),
  );

  await prisma.salesPageBlock.update({
    where: {
      id: block.id,
    },
    data: {
      content: toInputJson(improved.content),
      settings: toInputJson(improved.settings),
    },
  });

  await prisma.courseSalesPage.update({
    where: {
      id: block.salesPageId,
    },
    data: {
      status:
        block.salesPage.status === SalesPageStatus.PUBLISHED
          ? SalesPageStatus.UNPUBLISHED
          : SalesPageStatus.DRAFT,
    },
  });

  revalidateSalesPageSurfaces(block.salesPage.course.id, block.salesPage.course.slug);

  return {
    success: true,
    message: "AI улучшил этот блок в mock mode.",
  };
}

export async function getSalesPageSuggestions(
  courseId: string,
): Promise<AuthorActionResult<{ suggestions: SalesPageSuggestion[] }>> {
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  const suggestions = auditSalesPage(
    {
      title: course.salesPage.title,
      metaTitle: course.salesPage.metaTitle,
      metaDescription: course.salesPage.metaDescription,
      blocks: course.salesPage.blocks.map((block) => mapExistingBlock(block)),
    },
    mapCourseContext(course),
  );

  return {
    success: true,
    message: suggestions.length
      ? "AI нашел точки усиления страницы."
      : "Страница уже выглядит собранно.",
    data: {
      suggestions,
    },
  };
}

export async function applySalesPageSuggestion(
  courseId: string,
  suggestion: SalesPageSuggestion,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  const nextBlocks = applySuggestionToBlocks(
    course.salesPage.blocks.map((block) => mapExistingBlock(block)),
    suggestion,
    mapCourseContext(course),
  );

  await prisma.$transaction(async (tx) => {
    await tx.salesPageBlock.deleteMany({
      where: {
        salesPageId: course.salesPage!.id,
      },
    });

    await tx.salesPageBlock.createMany({
      data: nextBlocks
        .sort((left, right) => left.order - right.order)
        .map((block, index) => ({
          salesPageId: course.salesPage!.id,
          type: block.type,
          order: index + 1,
          title: block.title,
          subtitle: block.subtitle,
          content: toInputJson(block.content),
          settings: toInputJson(block.settings),
          isVisible: block.isVisible,
        })),
    });
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: "AI suggestion applied.",
  };
}

export async function submitSalesPageForModeration(
  courseId: string,
  values: ModerationSubmissionInput,
): Promise<AuthorActionResult<{ issues?: ModerationIssueResult[] }>> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const parsed = moderationSubmissionSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь комментарий к отправке.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  const moderation = runSalesPageModerationCheck({
    title: course.salesPage.title,
    metaTitle: course.salesPage.metaTitle,
    metaDescription: course.salesPage.metaDescription,
    blocks: course.salesPage.blocks.map((block) => ({
      title: block.title,
      subtitle: block.subtitle,
      content: block.content,
    })),
  });

  await prisma.$transaction(async (tx) => {
    await createModerationIssues(tx, {
      courseId: course.id,
      salesPageId: course.salesPage!.id,
      authorId: course.authorId,
      issues: moderation.issues,
    });
  });

  if (!moderation.passed) {
    revalidateSalesPageSurfaces(course.id, course.slug);

    return {
      success: false,
      message: "Автопроверка нашла рискованные формулировки. Исправь их и попробуй снова.",
      data: {
        issues: moderation.issues,
      },
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.courseSalesPage.update({
      where: {
        id: course.salesPage!.id,
      },
      data: {
        status: SalesPageStatus.PENDING_REVIEW,
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    await tx.salesPageSubmission.create({
      data: {
        salesPageId: course.salesPage!.id,
        authorId: actor.userId,
        status: SalesPageSubmissionStatus.PENDING,
        message: parsed.data.message || null,
      },
    });
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: "Страница отправлена на модерацию.",
  };
}

export async function publishSalesPage(
  courseId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  if (course.status !== CourseStatus.PUBLISHED) {
    return {
      success: false,
      message:
        "Сначала переведи сам курс в PUBLISHED во вкладке Overview, потом публикуй sales page.",
    };
  }

  if (course.salesPage.status !== SalesPageStatus.APPROVED) {
    return {
      success: false,
      message: "Публикация доступна только после approve от админа.",
    };
  }

  await prisma.courseSalesPage.update({
    where: {
      id: course.salesPage.id,
    },
    data: {
      status: SalesPageStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: "Sales page опубликована.",
  };
}

export async function unpublishSalesPage(
  courseId: string,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAuthorActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const course = await ensureSalesPageForCourse(courseId, actor);

  if (!course?.salesPage) {
    return unauthorizedResult();
  }

  await prisma.courseSalesPage.update({
    where: {
      id: course.salesPage.id,
    },
    data: {
      status: SalesPageStatus.UNPUBLISHED,
      publishedAt: null,
    },
  });

  revalidateSalesPageSurfaces(course.id, course.slug);

  return {
    success: true,
    message: "Страница снята с публикации.",
  };
}

export async function approveSalesPageSubmission(
  salesPageId: string,
  values: AdminModerationDecisionInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAdminActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const parsed = adminModerationDecisionSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь комментарий администратора.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const page = await prisma.courseSalesPage.findUnique({
    where: { id: salesPageId },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
        },
      },
      submissions: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
      },
    },
  });

  if (!page?.submissions[0]) {
    return {
      success: false,
      message: "Submission не найден.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.courseSalesPage.update({
      where: { id: page.id },
      data: {
        status: SalesPageStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedById: actor.userId,
        rejectionReason: null,
      },
    });

    await tx.salesPageSubmission.update({
      where: { id: page.submissions[0].id },
      data: {
        status: SalesPageSubmissionStatus.APPROVED,
        adminComment: parsed.data.adminComment || null,
        reviewedAt: new Date(),
        reviewedById: actor.userId,
      },
    });

    await tx.courseModerationIssue.updateMany({
      where: {
        salesPageId: page.id,
        status: ModerationIssueStatus.OPEN,
      },
      data: {
        status: ModerationIssueStatus.RESOLVED,
      },
    });
  });

  revalidateSalesPageSurfaces(page.course.id, page.course.slug);

  return {
    success: true,
    message: "Страница одобрена.",
  };
}

export async function rejectSalesPageSubmission(
  salesPageId: string,
  values: AdminModerationDecisionInput,
): Promise<AuthorActionResult> {
  const prisma = getPrismaClient();
  const actor = await getAdminActor();

  if (!actor) {
    return unauthorizedResult();
  }

  const parsed = adminModerationDecisionSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Проверь комментарий администратора.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const page = await prisma.courseSalesPage.findUnique({
    where: { id: salesPageId },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
        },
      },
      submissions: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
      },
    },
  });

  if (!page?.submissions[0]) {
    return {
      success: false,
      message: "Submission не найден.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.courseSalesPage.update({
      where: { id: page.id },
      data: {
        status: SalesPageStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedById: actor.userId,
        rejectionReason: parsed.data.adminComment || "Нужны правки перед публикацией.",
      },
    });

    await tx.salesPageSubmission.update({
      where: { id: page.submissions[0].id },
      data: {
        status: SalesPageSubmissionStatus.REJECTED,
        adminComment: parsed.data.adminComment || null,
        reviewedAt: new Date(),
        reviewedById: actor.userId,
      },
    });
  });

  revalidateSalesPageSurfaces(page.course.id, page.course.slug);

  return {
    success: true,
    message: "Страница отправлена на доработку.",
  };
}

export async function requestSalesPageChanges(
  salesPageId: string,
  values: AdminModerationDecisionInput,
): Promise<AuthorActionResult> {
  return rejectSalesPageSubmission(salesPageId, values);
}
