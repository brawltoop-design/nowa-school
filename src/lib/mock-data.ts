export type ShowcaseCourse = {
  title: string;
  slug: string;
  description: string;
  category: string;
  lessons: number;
  students: number;
  progress: number;
  duration: string;
  updatedAt: string;
  cover: {
    from: string;
    to: string;
  };
};

export const landingHighlights = [
  {
    title: "AI course production",
    description:
      "Generate summaries, quizzes, homework, and checklists from existing lessons in a few minutes.",
  },
  {
    title: "Premium learner experience",
    description:
      "Deliver quests, badges, progress nudges, and an AI study copilot with a product-grade UI.",
  },
  {
    title: "One operating system",
    description:
      "Public pages, creator studio, student hub, and admin console share one expensive visual language.",
  },
];

export const featuredCourses: ShowcaseCourse[] = [
  {
    title: "AI Product Sprints",
    slug: "ai-product-sprints",
    description:
      "Build a repeatable product engine for launching AI-native education offers.",
    category: "Product Strategy",
    lessons: 28,
    students: 1264,
    progress: 84,
    duration: "5 weeks",
    updatedAt: "2026-06-12",
    cover: {
      from: "from-[#7569FF]",
      to: "to-[#49B3FF]",
    },
  },
  {
    title: "Creator Growth OS",
    slug: "creator-growth-os",
    description:
      "Design a high-ticket course funnel with better positioning, onboarding, and retention.",
    category: "Growth",
    lessons: 19,
    students: 842,
    progress: 67,
    duration: "4 weeks",
    updatedAt: "2026-06-04",
    cover: {
      from: "from-[#0F172A]",
      to: "to-[#7168FF]",
    },
  },
  {
    title: "Premium Cohort Design",
    slug: "premium-cohort-design",
    description:
      "Package templates, office hours, and assignments into a premium cohort-based product.",
    category: "Instructional Design",
    lessons: 24,
    students: 617,
    progress: 73,
    duration: "6 weeks",
    updatedAt: "2026-05-29",
    cover: {
      from: "from-[#1E293B]",
      to: "to-[#77DBE7]",
    },
  },
];

export const authorStats = [
  { label: "Monthly revenue", value: "$48.2K", change: "+18% vs last month" },
  { label: "Published courses", value: "12", change: "3 in review by AI" },
  { label: "Completion rate", value: "74%", change: "+6 points in 30 days" },
];

export const studentStats = [
  { label: "Active streak", value: "14 days", change: "2 quests ready today" },
  { label: "Completion", value: "68%", change: "Across 3 active programs" },
  { label: "Badges earned", value: "9", change: "1 new unlock this week" },
];

export const adminStats = [
  { label: "MRR under management", value: "$182K", change: "Across 48 creators" },
  { label: "Pending reviews", value: "07", change: "2 need policy approval" },
  { label: "Platform health", value: "99.97%", change: "No critical incidents" },
];

export const adminReviewQueue = [
  {
    course: "AI Product Sprints",
    author: "Nika Petrova",
    status: "Awaiting QA",
    eta: "Today",
  },
  {
    course: "Creator Growth OS",
    author: "Marco Lee",
    status: "Policy review",
    eta: "Tomorrow",
  },
  {
    course: "Premium Cohort Design",
    author: "Dana White",
    status: "Asset generation",
    eta: "In progress",
  },
];

export const aiToolkit = [
  "Auto-summaries and lesson takeaways",
  "Tests, homework, and interactive quests",
  "Student-facing AI mentor prompt packs",
  "Badge logic, checklists, and completion flows",
];

export const studentRoadmap = [
  "Finish Module 3 recap and unlock the AI workshop prompt pack",
  "Submit the scorecard assignment to earn the Systems Builder badge",
  "Book a 15-minute AI tutor session for weak quiz topics",
];
