import {
  AiGenerationStatus,
  AiMessageRole,
  CertificateReviewerType,
  CertificateStatus,
  CertificateSubmissionStatus,
  CertificateType,
  CourseStatus,
  OrderStatus,
  Prisma,
  SalesPageAnalyticsEventType,
  SalesPageStatus,
  SalesPageSubmissionStatus,
  UserRole,
} from "@prisma/client";
import { createInitialSalesPage } from "../src/lib/sales-page";
import { getPrismaClient } from "../src/server/db";
import { hashPassword } from "../src/server/password";

const prisma = getPrismaClient();

const money = (amount: number) => new Prisma.Decimal(amount.toFixed(2));

const verifiedSkillCriteria = [
  {
    criterion: "Working product",
    description: "The submitted project opens and demonstrates the promised scenario.",
    points: 30,
  },
  {
    criterion: "Execution quality",
    description: "The implementation is structured, usable, and aligned with the course level.",
    points: 25,
  },
  {
    criterion: "AI-first workflow",
    description: "The project shows meaningful use of prompts, AI tools, or automation.",
    points: 20,
  },
  {
    criterion: "Documentation and demo",
    description: "The student provides a clear project explanation, demo, or repository.",
    points: 15,
  },
  {
    criterion: "Reflection and next steps",
    description: "The student understands limitations and the next iteration.",
    points: 10,
  },
];

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const avatar = (name: string) =>
  `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear`;

const gradientCover = (title: string, from: string, to: string) => {
  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1440" height="960" viewBox="0 0 1440 960" fill="none">
      <defs>
        <linearGradient id="paint" x1="0" y1="0" x2="1440" y2="960" gradientUnits="userSpaceOnUse">
          <stop stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="1440" height="960" rx="72" fill="url(#paint)"/>
      <circle cx="1210" cy="160" r="180" fill="white" fill-opacity="0.14"/>
      <circle cx="220" cy="760" r="220" fill="white" fill-opacity="0.10"/>
      <text x="96" y="144" fill="white" fill-opacity="0.78" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">nowa school</text>
      <text x="96" y="760" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="78" font-weight="700">${safeTitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const createModulePracticeSeed = (
  moduleTitle: string,
  moduleDescription: string,
) => ({
  type: "PROJECT",
  title: `Module deliverable: ${moduleTitle}`,
  summary: `${moduleDescription} Turn this module into a visible result the student can present, publish, or submit for feedback.`,
  outcome: "A polished deliverable that proves the student can apply the module end to end.",
  submissionLabel: "Notion page, Figma link, Loom demo, PDF or repository",
  deliverables: [
    {
      text: `Main output for ${moduleTitle}`,
      required: true,
    },
    {
      text: "Short rationale behind the solution",
      required: true,
    },
    {
      text: "Optional polish layer or bonus improvement",
      required: false,
    },
  ],
  checklist: [
    {
      text: "Complete every lesson in the module",
      required: true,
    },
    {
      text: "Assemble the final module output",
      required: true,
    },
    {
      text: "Prepare the work for review or publication",
      required: false,
    },
  ],
});

const users = {
  admin: {
    name: "Elena Voronina",
    email: "admin@example.com",
    role: UserRole.ADMIN,
  },
  authors: [
    {
      name: "Nika Petrova",
      email: "author@example.com",
      role: UserRole.AUTHOR,
    },
    {
      name: "Marco Lee",
      email: "marco.lee@example.com",
      role: UserRole.AUTHOR,
    },
  ],
  students: [
    "Alex Johnson",
    "Emma Reed",
    "Oliver Hayes",
    "Sofia Khan",
    "Daniel Cho",
    "Mia Garcia",
    "Leo Walker",
    "Eva Turner",
    "Noah Price",
    "Grace Lin",
  ].map((name, index) => ({
    name,
    email:
      index === 0
        ? "student@example.com"
        : `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    role: UserRole.STUDENT,
  })),
};

const courseSeeds = [
  {
    authorEmail: "author@example.com",
    title: "AI Course Systems",
    slug: "ai-course-systems",
    description:
      "Turn raw recordings, docs, and slide decks into a premium AI-enhanced learning product with summaries, quizzes, assignments, and a contextual student copilot.",
    category: "AI",
    price: 349,
    currency: "USD",
    level: "Intermediate",
    language: "English",
    status: CourseStatus.PUBLISHED,
    aiEnhanced: true,
    cover: ["#0F172A", "#3D3BFF"],
    modules: [
      {
        title: "Offer and curriculum architecture",
        description:
          "Define the transformation promise, curriculum logic, and premium learning arc.",
        lessons: [
          "Transformation promise and premium positioning",
          "Curriculum map for modules, lessons, and outcomes",
          "Source material intake for AI enrichment",
        ],
      },
      {
        title: "AI learning experience layer",
        description:
          "Add summaries, assignments, checkpoints, and a student-facing assistant.",
        lessons: [
          "Summary and recap generation workflow",
          "Assignments, rubrics, and knowledge checks",
          "Student copilot prompts and support flows",
        ],
      },
    ],
    badges: [
      {
        title: "System Architect",
        description: "Complete the first module and map the full learning system.",
        icon: "sparkles",
      },
      {
        title: "AI Learning Builder",
        description: "Ship the AI-enhanced student layer and publish the course.",
        icon: "bot",
      },
    ],
  },
  {
    authorEmail: "marco.lee@example.com",
    title: "Designing Signature Cohorts",
    slug: "designing-signature-cohorts",
    description:
      "Build a cohort-based course with a strong visual system, clear learning milestones, and polished handoff points between live sessions and async content.",
    category: "Design",
    price: 289,
    currency: "USD",
    level: "Advanced Beginner",
    language: "English",
    status: CourseStatus.PUBLISHED,
    aiEnhanced: true,
    cover: ["#1E1B4B", "#7C3AED"],
    modules: [
      {
        title: "Visual language and cohort positioning",
        description:
          "Design the look, feel, and emotional promise of the cohort experience.",
        lessons: [
          "Creative direction for a premium cohort",
          "Designing covers, slides, and student kits",
          "Making the learning environment feel branded",
        ],
      },
      {
        title: "Practice loops and feedback rituals",
        description:
          "Turn static content into a structured, feedback-driven cohort rhythm.",
        lessons: [
          "Weekly feedback rituals for momentum",
          "Assignments that lead to visible progress",
          "Ceremonies, badges, and completion moments",
        ],
      },
    ],
    badges: [
      {
        title: "Cohort Director",
        description: "Complete the visual system for a premium live cohort.",
        icon: "palette",
      },
      {
        title: "Feedback Host",
        description: "Set up repeatable feedback loops across the full experience.",
        icon: "message-square",
      },
    ],
  },
  {
    authorEmail: "author@example.com",
    title: "Performance Marketing for Course Launches",
    slug: "performance-marketing-course-launches",
    description:
      "Create a launch system for education products with acquisition channels, messaging tests, and retention-informed funnel design.",
    category: "Marketing",
    price: 319,
    currency: "USD",
    level: "Intermediate",
    language: "English",
    status: CourseStatus.PUBLISHED,
    aiEnhanced: true,
    cover: ["#111827", "#0EA5E9"],
    modules: [
      {
        title: "Offer-market fit for launch campaigns",
        description:
          "Align the learning promise with acquisition messaging and landing structure.",
        lessons: [
          "Crafting the launch angle",
          "Landing page signals that convert",
          "Performance assets for paid channels",
        ],
      },
      {
        title: "Scaling without breaking the product",
        description:
          "Use analytics, segmentation, and learner feedback to improve launches over time.",
        lessons: [
          "Tracking acquisition quality",
          "Retention signals after purchase",
          "Launch retrospectives and next sprint inputs",
        ],
      },
    ],
    badges: [
      {
        title: "Launch Operator",
        description: "Ship a measurable launch sprint for a premium education product.",
        icon: "rocket",
      },
      {
        title: "Retention Marketer",
        description: "Connect conversion metrics to learner outcomes and product quality.",
        icon: "activity",
      },
    ],
  },
  {
    authorEmail: "marco.lee@example.com",
    title: "Profitable Learning Business",
    slug: "profitable-learning-business",
    description:
      "Design the financial engine of an education business, from pricing architecture and unit economics to team operations and renewal strategy.",
    category: "Business",
    price: 399,
    currency: "USD",
    level: "Advanced",
    language: "English",
    status: CourseStatus.DRAFT,
    aiEnhanced: false,
    cover: ["#0B1120", "#10B981"],
    modules: [
      {
        title: "Pricing and unit economics",
        description:
          "Create clear margins, fees, and delivery assumptions for your learning business.",
        lessons: [
          "Price architecture and premium positioning",
          "Platform fees, author revenue, and ops costs",
          "Forecasting cohort and evergreen scenarios",
        ],
      },
      {
        title: "Operational excellence and renewals",
        description:
          "Keep the business resilient through better planning, support, and retention.",
        lessons: [
          "Support operations and escalation flows",
          "Renewal strategy for recurring programs",
          "Dashboards for revenue and completion quality",
        ],
      },
    ],
    badges: [
      {
        title: "Revenue Operator",
        description: "Map revenue, fees, and support costs into one business model.",
        icon: "wallet",
      },
      {
        title: "Renewal Strategist",
        description: "Design a repeatable retention and renewal layer for programs.",
        icon: "refresh-cw",
      },
    ],
  },
  {
    authorEmail: "author@example.com",
    title: "Creator Economy Membership OS",
    slug: "creator-economy-membership-os",
    description:
      "Package lessons, community, and recurring offers into a membership product that feels premium for both creators and subscribers.",
    category: "Creator Economy",
    price: 259,
    currency: "USD",
    level: "Intermediate",
    language: "English",
    status: CourseStatus.BLOCKED,
    aiEnhanced: true,
    cover: ["#111827", "#F97316"],
    modules: [
      {
        title: "Membership foundations",
        description:
          "Define the recurring value proposition, content rhythm, and loyalty mechanics.",
        lessons: [
          "Recurring value without content fatigue",
          "Tiering the membership offer",
          "Member onboarding and activation moments",
        ],
      },
      {
        title: "Community and expansion loops",
        description:
          "Combine community prompts, AI support, and live moments into one system.",
        lessons: [
          "Community prompts that deepen retention",
          "AI support for member questions",
          "Expansion offers and premium upgrades",
        ],
      },
    ],
    badges: [
      {
        title: "Membership Builder",
        description: "Build the first recurring content system for a creator brand.",
        icon: "layers-3",
      },
      {
        title: "Community Catalyst",
        description: "Create the engagement loop that keeps members active every week.",
        icon: "users",
      },
    ],
  },
];

type CreatedCourse = {
  id: string;
  slug: string;
  title: string;
  price: number;
  salesPageId: string | null;
  firstLessonId: string;
  lessonIds: string[];
};

async function resetDatabase() {
  await prisma.certificateReview.deleteMany();
  await prisma.certificateSubmission.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.courseModerationIssue.deleteMany();
  await prisma.salesPageAnalyticsEvent.deleteMany();
  await prisma.salesPageSubmission.deleteMany();
  await prisma.salesPageBlock.deleteMany();
  await prisma.courseSalesPage.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.aiMessage.deleteMany();
  await prisma.aiGeneration.deleteMany();
  await prisma.review.deleteMany();
  await prisma.order.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const passwordHash = await hashPassword("password123");
  const createdUsers = new Map<string, { id: string; name: string; email: string }>();

  const allUsers = [users.admin, ...users.authors, ...users.students];

  for (const user of allUsers) {
    const created = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        avatarUrl: avatar(user.name),
        createdAt: daysAgo(60),
      },
    });

    createdUsers.set(created.email, {
      id: created.id,
      name: created.name,
      email: created.email,
    });
  }

  return createdUsers;
}

async function seedCourses(userMap: Map<string, { id: string; name: string; email: string }>) {
  const courses = new Map<string, CreatedCourse>();
  const admin = userMap.get("admin@example.com");

  for (const [courseIndex, seed] of courseSeeds.entries()) {
    const author = userMap.get(seed.authorEmail);

    if (!author) {
      throw new Error(`Missing author for ${seed.slug}`);
    }

    const course = await prisma.course.create({
      data: {
        authorId: author.id,
        title: seed.title,
        slug: seed.slug,
        description: seed.description,
        category: seed.category,
        price: money(seed.price),
        currency: seed.currency,
        coverUrl: gradientCover(seed.title, seed.cover[0], seed.cover[1]),
        level: seed.level,
        language: seed.language,
        status: seed.status,
        aiEnhanced: seed.aiEnhanced,
        createdAt: daysAgo(45 - courseIndex * 4),
      },
    });

    const lessonIds: string[] = [];
    let firstLessonId = "";

    for (const [moduleIndex, moduleSeed] of seed.modules.entries()) {
      const courseModule = await prisma.module.create({
        data: {
          courseId: course.id,
          title: moduleSeed.title,
          description: moduleSeed.description,
          practice: createModulePracticeSeed(
            moduleSeed.title,
            moduleSeed.description,
          ),
          order: moduleIndex + 1,
        },
      });

      for (const [lessonIndex, lessonTitle] of moduleSeed.lessons.entries()) {
        const lessonNumber = moduleIndex * 3 + lessonIndex + 1;
        const lesson = await prisma.lesson.create({
          data: {
            moduleId: courseModule.id,
            title: lessonTitle,
            description: `${lessonTitle} gives creators a practical system they can apply immediately inside the product.`,
            videoUrl: `https://cdn.newschool.ai/demo/${seed.slug}/lesson-${lessonNumber}.mp4`,
            contentText: `${lessonTitle} covers structure, delivery, and practical execution for a premium AI-native course product.`,
            transcript: `Transcript for ${lessonTitle}. This lesson explains the strategic and operational steps required to ship the feature with clarity.`,
            aiSummary: `AI summary for ${lessonTitle}: focus on transformation, content systems, and measurable learner outcomes.`,
            order: lessonIndex + 1,
            durationMinutes: 12 + lessonIndex * 4 + moduleIndex * 3,
            createdAt: daysAgo(42 - lessonNumber),
          },
        });

        if (!firstLessonId) {
          firstLessonId = lesson.id;
        }

        lessonIds.push(lesson.id);

        await prisma.quiz.create({
          data: {
            lessonId: lesson.id,
            title: `${lessonTitle} Checkpoint`,
            questions: [
              {
                type: "multiple_choice",
                prompt: `What is the main outcome of "${lessonTitle}"?`,
                options: [
                  "A clearer product system",
                  "A random design change",
                  "An unrelated marketing channel",
                  "A one-time manual process",
                ],
                answer: 0,
              },
              {
                type: "short_answer",
                prompt: "Name one workflow this lesson improves.",
              },
            ],
          },
        });

        await prisma.assignment.create({
          data: {
            lessonId: lesson.id,
            title: `${lessonTitle} Assignment`,
            description: `Draft the version of "${lessonTitle}" for your own premium course and prepare it for review.`,
            rubric: {
              criteria: [
                "Strategic clarity",
                "Execution quality",
                "Premium learner experience",
              ],
              passingScore: 80,
            },
          },
        });

        await prisma.checklist.create({
          data: {
            lessonId: lesson.id,
            items: [
              "Review the lesson objective",
              "Complete the assignment draft",
              "Publish the AI-enhanced asset",
            ],
          },
        });

        await prisma.quest.create({
          data: {
            lessonId: lesson.id,
            title: `${lessonTitle} Sprint`,
            description: `Complete the practical sprint linked to ${lessonTitle}.`,
            rewardPoints: 120 + lessonIndex * 30,
          },
        });
      }
    }

    for (const badge of seed.badges) {
      await prisma.badge.create({
        data: {
          courseId: course.id,
          title: badge.title,
          description: badge.description,
          icon: badge.icon,
          condition: {
            type: "course_rule",
            trigger: badge.title,
          },
        },
      });
    }

    await prisma.aiGeneration.create({
      data: {
        courseId: course.id,
        type: "COURSE_BLUEPRINT",
        prompt: `Generate a premium course blueprint for ${seed.title}.`,
        result: {
          outcome: "Structured premium learning product",
          modules: seed.modules.map((module) => module.title),
        },
        status:
          seed.status === CourseStatus.PUBLISHED
            ? AiGenerationStatus.APPLIED
            : AiGenerationStatus.DRAFT,
        createdAt: daysAgo(18),
      },
    });

    const template =
      seed.category === "Marketing"
        ? "creator-blogging"
        : seed.category === "AI"
          ? "tech-vibe-coding"
          : "practical-skill";
    const initialSalesPage = createInitialSalesPage(
      {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: seed.description,
        category: seed.category,
        level: seed.level,
        language: seed.language,
        price: seed.price,
        currency: seed.currency,
        coverUrl: gradientCover(seed.title, seed.cover[0], seed.cover[1]),
        aiEnhanced: seed.aiEnhanced,
        author: {
          id: author.id,
          name: author.name,
          email: author.email,
          avatarUrl: avatar(author.name),
        },
        modules: seed.modules.map((module) => ({
          id: module.title.toLowerCase().replace(/\s+/g, "-"),
          title: module.title,
          description: module.description,
          lessons: module.lessons.map((lessonTitle, lessonIndex) => ({
            id: `${module.title}-${lessonIndex}`,
            title: lessonTitle,
            description: `${lessonTitle} gives creators a practical system they can apply immediately inside the product.`,
            durationMinutes: 12 + lessonIndex * 4,
          })),
        })),
        badges: seed.badges.map((badge, badgeIndex) => ({
          id: `${seed.slug}-${badgeIndex}`,
          title: badge.title,
          description: badge.description,
          icon: badge.icon,
        })),
      },
      template,
    );

    const salesPageStatus: SalesPageStatus =
      seed.status === CourseStatus.PUBLISHED
        ? SalesPageStatus.PUBLISHED
        : courseIndex === 3
          ? SalesPageStatus.PENDING_REVIEW
          : SalesPageStatus.APPROVED;

    const salesPage = await prisma.courseSalesPage.create({
      data: {
        courseId: course.id,
        slug: course.slug,
        status: salesPageStatus,
        title: initialSalesPage.title,
        metaTitle: initialSalesPage.metaTitle,
        metaDescription: initialSalesPage.metaDescription,
        ogImage: initialSalesPage.ogImage,
        theme: initialSalesPage.theme as Prisma.InputJsonValue,
        publishedAt:
          salesPageStatus === SalesPageStatus.PUBLISHED ? daysAgo(7 - courseIndex) : null,
        submittedAt: daysAgo(5 - courseIndex),
        reviewedAt:
          salesPageStatus === SalesPageStatus.PUBLISHED ||
          salesPageStatus === SalesPageStatus.APPROVED
            ? daysAgo(3 - courseIndex)
            : null,
        reviewedById:
          salesPageStatus === SalesPageStatus.PUBLISHED ||
          salesPageStatus === SalesPageStatus.APPROVED
            ? admin?.id ?? null
            : null,
        rejectionReason: null,
        blocks: {
          create: initialSalesPage.blocks.map((block) => ({
            type: block.type,
            order: block.order,
            title: block.title,
            subtitle: block.subtitle,
            content: block.content as Prisma.InputJsonValue,
            settings: block.settings as Prisma.InputJsonValue,
            isVisible: block.isVisible,
          })),
        },
      },
    });

    await prisma.salesPageSubmission.create({
      data: {
        salesPageId: salesPage.id,
        authorId: author.id,
        status:
          salesPageStatus === SalesPageStatus.PENDING_REVIEW
            ? SalesPageSubmissionStatus.PENDING
            : SalesPageSubmissionStatus.APPROVED,
        message: "Seeded sales page submission for moderation flows.",
        adminComment:
          salesPageStatus === SalesPageStatus.PENDING_REVIEW
            ? null
            : "Seeded page approved for local MVP review.",
        reviewedAt:
          salesPageStatus === SalesPageStatus.PENDING_REVIEW
            ? null
            : daysAgo(2 - courseIndex),
        reviewedById:
          salesPageStatus === SalesPageStatus.PENDING_REVIEW
            ? null
            : admin?.id ?? null,
        createdAt: daysAgo(5 - courseIndex),
      },
    });

    if (salesPageStatus === SalesPageStatus.PENDING_REVIEW) {
      await prisma.courseModerationIssue.create({
        data: {
          courseId: course.id,
          salesPageId: salesPage.id,
          authorId: author.id,
          type: "MISLEADING_CLAIM",
          severity: "MEDIUM",
          message:
            "Уточни оффер и убери слишком общий promise, чтобы страница выглядела честнее.",
          fieldPath: "blocks[0].headline",
        },
      });
    }

    await prisma.aiGeneration.create({
      data: {
        courseId: course.id,
        lessonId: firstLessonId,
        type: "LESSON_SUMMARY",
        prompt: `Summarize the first lesson of ${seed.title}.`,
        result: {
          summary: `Premium summary for ${seed.title}.`,
          assets: ["summary", "quiz", "assignment"],
        },
        status: AiGenerationStatus.APPLIED,
        createdAt: daysAgo(16),
      },
    });

    courses.set(seed.slug, {
      id: course.id,
      slug: course.slug,
      title: course.title,
      price: seed.price,
      salesPageId: salesPage.id,
      firstLessonId,
      lessonIds,
    });
  }

  return courses;
}

async function seedOrdersAndProgress(
  userMap: Map<string, { id: string; name: string; email: string }>,
  courseMap: Map<string, CreatedCourse>,
) {
  const purchases = [
    {
      email: "student@example.com",
      slug: "ai-course-systems",
      status: OrderStatus.PAID,
      completedLessons: 4,
      streakDays: 12,
    },
    {
      email: "emma.reed@example.com",
      slug: "designing-signature-cohorts",
      status: OrderStatus.PAID,
      completedLessons: 6,
      streakDays: 21,
    },
    {
      email: "oliver.hayes@example.com",
      slug: "performance-marketing-course-launches",
      status: OrderStatus.PAID,
      completedLessons: 3,
      streakDays: 8,
    },
    {
      email: "sofia.khan@example.com",
      slug: "ai-course-systems",
      status: OrderStatus.PAID,
      completedLessons: 2,
      streakDays: 5,
    },
    {
      email: "daniel.cho@example.com",
      slug: "designing-signature-cohorts",
      status: OrderStatus.PAID,
      completedLessons: 5,
      streakDays: 18,
    },
    {
      email: "mia.garcia@example.com",
      slug: "performance-marketing-course-launches",
      status: OrderStatus.REFUNDED,
      completedLessons: 0,
      streakDays: 0,
    },
    {
      email: "leo.walker@example.com",
      slug: "ai-course-systems",
      status: OrderStatus.PENDING,
      completedLessons: 0,
      streakDays: 0,
    },
    {
      email: "eva.turner@example.com",
      slug: "performance-marketing-course-launches",
      status: OrderStatus.PAID,
      completedLessons: 4,
      streakDays: 10,
    },
    {
      email: "noah.price@example.com",
      slug: "ai-course-systems",
      status: OrderStatus.PAID,
      completedLessons: 1,
      streakDays: 3,
    },
    {
      email: "grace.lin@example.com",
      slug: "designing-signature-cohorts",
      status: OrderStatus.PAID,
      completedLessons: 2,
      streakDays: 6,
    },
  ];

  const paidEnrollments: Array<{ userId: string; courseId: string }> = [];

  for (const [index, purchase] of purchases.entries()) {
    const user = userMap.get(purchase.email);
    const course = courseMap.get(purchase.slug);

    if (!user || !course) {
      throw new Error(`Missing purchase seed dependency for ${purchase.email}/${purchase.slug}`);
    }

    const platformFee = Number((course.price * 0.15).toFixed(2));
    const authorRevenue = Number((course.price - platformFee).toFixed(2));

    await prisma.order.create({
      data: {
        userId: user.id,
        courseId: course.id,
        amount: money(course.price),
        platformFee: money(platformFee),
        authorRevenue: money(authorRevenue),
        status: purchase.status,
        paymentProvider: purchase.status === OrderStatus.PENDING ? "stripe" : "stripe",
        paymentId: `pay_${purchase.slug}_${index + 1}`,
        createdAt: daysAgo(20 - index),
      },
    });

    if (course.salesPageId) {
      const trafficSource =
        index % 3 === 0 ? "telegram" : index % 3 === 1 ? "instagram" : "youtube";

      await prisma.salesPageAnalyticsEvent.createMany({
        data: [
          {
            salesPageId: course.salesPageId,
            courseId: course.id,
            visitorId: `seed-visitor-${index}-view`,
            userId: purchase.status === OrderStatus.PAID ? user.id : null,
            type: SalesPageAnalyticsEventType.PAGE_VIEW,
            metadata: {
              utm_source: trafficSource,
              ref: trafficSource,
            },
            createdAt: daysAgo(20 - index),
          },
          {
            salesPageId: course.salesPageId,
            courseId: course.id,
            visitorId: `seed-visitor-${index}-checkout`,
            userId: purchase.status === OrderStatus.PAID ? user.id : null,
            type: SalesPageAnalyticsEventType.CHECKOUT_CLICK,
            metadata: {
              utm_source: trafficSource,
              label: "Купить курс",
            },
            createdAt: daysAgo(20 - index),
          },
        ],
      });
    }

    if (purchase.status !== OrderStatus.PAID) {
      continue;
    }

    if (course.salesPageId) {
      await prisma.salesPageAnalyticsEvent.create({
        data: {
          salesPageId: course.salesPageId,
          courseId: course.id,
          visitorId: `seed-visitor-${index}-purchase`,
          userId: user.id,
          type: SalesPageAnalyticsEventType.PURCHASE,
          metadata: {
            utm_source: index % 3 === 0 ? "telegram" : index % 3 === 1 ? "instagram" : "youtube",
          },
          createdAt: daysAgo(20 - index),
        },
      });
    }

    const totalLessons = course.lessonIds.length;
    const progressPercent = Math.round((purchase.completedLessons / totalLessons) * 100);

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        progressPercent,
        points: purchase.completedLessons * 125,
        level: Math.max(1, Math.ceil(purchase.completedLessons / 2)),
        streakDays: purchase.streakDays,
        createdAt: daysAgo(20 - index),
      },
    });

    paidEnrollments.push({ userId: user.id, courseId: course.id });

    for (const [lessonIndex, lessonId] of course.lessonIds.entries()) {
      const completed = lessonIndex < purchase.completedLessons;

      await prisma.lessonProgress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId,
          completed,
          score: completed ? 82 + (lessonIndex % 4) * 4 : null,
          completedAt: completed ? daysAgo(14 - lessonIndex) : null,
        },
      });
    }
  }

  return paidEnrollments;
}

async function seedReviews(
  userMap: Map<string, { id: string; name: string; email: string }>,
  courseMap: Map<string, CreatedCourse>,
) {
  const reviews = [
    {
      email: "student@example.com",
      slug: "ai-course-systems",
      rating: 5,
      text: "The course feels like a product system, not a loose collection of lessons. The AI assets are immediately useful.",
    },
    {
      email: "emma.reed@example.com",
      slug: "designing-signature-cohorts",
      rating: 5,
      text: "One of the clearest cohort design programs I have taken. The structure is polished and the assignments are sharp.",
    },
    {
      email: "oliver.hayes@example.com",
      slug: "performance-marketing-course-launches",
      rating: 4,
      text: "Great bridge between launch strategy and product retention. I would add even more analytics examples.",
    },
    {
      email: "sofia.khan@example.com",
      slug: "ai-course-systems",
      rating: 5,
      text: "Helped me rethink how to turn lesson recordings into a premium course experience.",
    },
    {
      email: "daniel.cho@example.com",
      slug: "designing-signature-cohorts",
      rating: 5,
      text: "Beautifully paced. It gave me a complete framework for visuals, rituals, and feedback.",
    },
    {
      email: "eva.turner@example.com",
      slug: "performance-marketing-course-launches",
      rating: 4,
      text: "Very strong on offer-market fit and launch messaging. The assignments made the ideas practical.",
    },
  ];

  for (const [index, review] of reviews.entries()) {
    const user = userMap.get(review.email);
    const course = courseMap.get(review.slug);

    if (!user || !course) {
      throw new Error(`Missing review seed dependency for ${review.email}/${review.slug}`);
    }

    await prisma.review.create({
      data: {
        userId: user.id,
        courseId: course.id,
        rating: review.rating,
        text: review.text,
        createdAt: daysAgo(10 - index),
      },
    });
  }
}

async function seedAiMessages(
  userMap: Map<string, { id: string; name: string; email: string }>,
  courseMap: Map<string, CreatedCourse>,
) {
  const messages = [
    {
      email: "student@example.com",
      slug: "ai-course-systems",
      messages: [
        {
          role: AiMessageRole.USER,
          content: "Summarize the second lesson in three implementation steps.",
        },
        {
          role: AiMessageRole.ASSISTANT,
          content:
            "1. Map source material inputs. 2. Turn them into structured assets. 3. Publish the AI-enhanced learner flow.",
        },
      ],
    },
    {
      email: "emma.reed@example.com",
      slug: "designing-signature-cohorts",
      messages: [
        {
          role: AiMessageRole.USER,
          content: "Give me a cleaner assignment brief for my cohort students.",
        },
        {
          role: AiMessageRole.ASSISTANT,
          content:
            "Start with the transformation goal, define the deliverable, and add a three-part rubric for quality review.",
        },
      ],
    },
    {
      email: "oliver.hayes@example.com",
      slug: "performance-marketing-course-launches",
      messages: [
        {
          role: AiMessageRole.USER,
          content: "What should I measure after the first week of a paid launch?",
        },
        {
          role: AiMessageRole.ASSISTANT,
          content:
            "Track qualified enrollments, completion signals from the first lessons, refund risk, and message-to-purchase fit.",
        },
      ],
    },
  ];

  for (const thread of messages) {
    const user = userMap.get(thread.email);
    const course = courseMap.get(thread.slug);

    if (!user || !course) {
      throw new Error(`Missing AI message seed dependency for ${thread.email}/${thread.slug}`);
    }

    for (const [index, message] of thread.messages.entries()) {
      await prisma.aiMessage.create({
        data: {
          courseId: course.id,
          userId: user.id,
          role: message.role,
          content: message.content,
          createdAt: daysAgo(6 - index),
        },
      });
    }
  }
}

async function seedCertificates(
  userMap: Map<string, { id: string; name: string; email: string }>,
  courseMap: Map<string, CreatedCourse>,
) {
  const student = userMap.get("emma.reed@example.com");
  const author = userMap.get("marco.lee@example.com");
  const course = courseMap.get("designing-signature-cohorts");

  if (!student || !author || !course) {
    throw new Error("Missing certificate seed dependency");
  }

  const issuedAt = daysAgo(2);
  const certificateId = "NSAI-DEMO-2026";
  const skills = [
    "Design",
    "Cohort experience design",
    "Premium learning rituals",
    "Project delivery",
    "AI-first course assets",
  ];
  const verificationUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/cert/${certificateId}`;
  const openBadgeMetadata = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    id: verificationUrl,
    name: "nowa school Verified Skill: Designing Signature Cohorts",
    description:
      "Practical project reviewed against nowa school Verified Skills criteria.",
    issuer: {
      type: "Profile",
      name: "nowa school",
      url: process.env.NEXTAUTH_URL ?? "http://localhost:3001",
    },
    credentialSubject: {
      type: "AchievementSubject",
      achievement: {
        id: certificateId,
        type: "Achievement",
        name: "Cohort Experience Designer",
        description:
          "Verified project for designing a premium cohort learning experience.",
        criteria: verifiedSkillCriteria,
        alignment: skills,
      },
    },
    issuanceDate: issuedAt.toISOString(),
  };

  await prisma.certificateSubmission.create({
    data: {
      userId: student.id,
      courseId: course.id,
      projectTitle: "Signature Cohort Launch System",
      projectDescription:
        "A complete premium cohort package with visual direction, feedback rituals, student milestones, and launch-ready learning assets.",
      projectUrl: "https://newschool.ai/demo/signature-cohort-system",
      demoVideoUrl: "https://newschool.ai/demo/signature-cohort-system/video",
      repositoryUrl: "https://github.com/newschool-ai/signature-cohort-system",
      files: [
        "https://newschool.ai/demo/signature-cohort-system/brief.pdf",
        "https://newschool.ai/demo/signature-cohort-system/rubric.pdf",
      ],
      status: CertificateSubmissionStatus.APPROVED,
      createdAt: daysAgo(5),
      updatedAt: issuedAt,
    },
  });

  const certificate = await prisma.certificate.create({
    data: {
      certificateId,
      userId: student.id,
      courseId: course.id,
      authorId: author.id,
      type: CertificateType.VERIFIED_SKILL,
      track: "Design",
      title: "nowa school Verified Skill: Designing Signature Cohorts",
      description:
        "Issued for a reviewed practical project that demonstrates cohort experience design skills.",
      skills,
      criteria: verifiedSkillCriteria,
      score: 92,
      status: CertificateStatus.ISSUED,
      projectUrl: "https://newschool.ai/demo/signature-cohort-system",
      demoVideoUrl: "https://newschool.ai/demo/signature-cohort-system/video",
      repositoryUrl: "https://github.com/newschool-ai/signature-cohort-system",
      issuedAt,
      createdAt: issuedAt,
    },
  });

  await prisma.certificateReview.create({
    data: {
      certificateId: certificate.id,
      reviewerId: author.id,
      reviewerType: CertificateReviewerType.AUTHOR,
      score: 92,
      feedback:
        "Strong project with clear learner milestones, polished visual direction, and useful feedback rituals. Next step: add more analytics checkpoints after week one.",
      rubric: verifiedSkillCriteria,
      createdAt: issuedAt,
    },
  });

  await prisma.badge.create({
    data: {
      certificateId: certificate.id,
      title: "Verified Skill",
      description: "Practical project reviewed against nowa school criteria.",
      icon: "shield-check",
      level: "Advanced",
      metadata: openBadgeMetadata,
    },
  });
}

async function main() {
  await resetDatabase();

  const userMap = await seedUsers();
  const courseMap = await seedCourses(userMap);

  await seedOrdersAndProgress(userMap, courseMap);
  await seedReviews(userMap, courseMap);
  await seedAiMessages(userMap, courseMap);
  await seedCertificates(userMap, courseMap);

  console.log("Seed complete for nowa school");
  console.log("Demo certificate: NSAI-DEMO-2026");
  console.log("Demo accounts:");
  console.log("admin@example.com / password123");
  console.log("author@example.com / password123");
  console.log("student@example.com / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
