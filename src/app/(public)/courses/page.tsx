import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  GraduationCap,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { AnimatedSection } from "@/components/premium/animated-section";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { PublicCourseCard } from "@/components/premium/public-course-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StaggerGrid } from "@/components/premium/stagger-grid";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, formatCurrency } from "@/lib/utils";
import {
  getPublicPlatformStats,
  getPublishedCourseBySlug,
  getPublishedCourses,
  type CourseCatalogSort,
} from "@/server/public-courses";

type CoursesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const sellingPillars = [
  {
    title: "Сильная упаковка до покупки",
    description:
      "Курс выглядит как дорогой продукт: понятная подача, уверенная структура и чистая страница без хаоса.",
    icon: Sparkles,
  },
  {
    title: "Покупаешь не уроки, а результат",
    description:
      "Программа собрана вокруг навыка, карьерного шага или конкретного практического результата.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Учиться реально проще",
    description:
      "AI-выжимки, задания, маршрут и аккуратная логика прохождения снижают шанс бросить курс на середине.",
    icon: Bot,
  },
] as const;

const buyerScenarios = [
  {
    title: "Сменить профессию",
    description:
      "Выбери программу с сильной структурой и понятным маршрутом к новой роли.",
    icon: Target,
  },
  {
    title: "Усилить текущий навык",
    description:
      "Короткие и средние программы помогают быстро закрыть конкретный пробел в навыке.",
    icon: TrendingUp,
  },
  {
    title: "Зайти в AI без перегруза",
    description: "Курсы объясняют сложные темы спокойно, чисто и по шагам.",
    icon: Sparkles,
  },
] as const;

const learningFlow = [
  {
    step: "01",
    title: "Выбираешь программу",
    description:
      "Смотришь витрину, сравниваешь формат, уровень и автора.",
    icon: PlayCircle,
  },
  {
    step: "02",
    title: "Заходишь в курс",
    description:
      "Получаешь модули, уроки, AI-выжимки и структуру без хаоса.",
    icon: GraduationCap,
  },
  {
    step: "03",
    title: "Двигаешься по спринтам",
    description:
      "Чеклисты, задания и квесты помогают не выпадать из процесса.",
    icon: CheckCircle2,
  },
  {
    step: "04",
    title: "Фиксируешь результат",
    description:
      "Прогресс, бейджи и сильная подача доводят обучение до завершения.",
    icon: TrendingUp,
  },
] as const;

const purchaseBenefits = [
  {
    title: "Понятная программа",
    description:
      "Сразу видно, что внутри курса, в каком порядке ты учишься и куда это ведет.",
    icon: GraduationCap,
  },
  {
    title: "Практика без воды",
    description:
      "Уроки, домашки и чеклисты держат фокус не на просмотре, а на результате.",
    icon: CheckCircle2,
  },
  {
    title: "Спокойный темп",
    description:
      "AI-помощник, саммари и аккуратная навигация помогают идти без перегруза.",
    icon: Clock3,
  },
  {
    title: "Доверие к покупке",
    description:
      "Витрина, отзывы и премиальное оформление дают ощущение зрелого продукта, а не сырого курса.",
    icon: ShieldCheck,
  },
] as const;

const faqItems = [
  {
    question: "Что отличает эти курсы от обычной LMS?",
    answer:
      "Каждый курс здесь подан как продукт: сильная витрина, понятная программа, AI-усиленные материалы и аккуратный опыт ученика.",
  },
  {
    question: "Здесь только курсы про AI?",
    answer:
      "Нет. В витрине уже есть AI, Design и Marketing, а дальше каталог может расти в сторону Business и Creator Economy.",
  },
  {
    question: "Можно ли запустить здесь свой курс?",
    answer:
      "Да. Для авторов это не просто хранилище уроков, а премиальная AI-LMS с готовой упаковкой, страницей курса и кабинетом ученика.",
  },
] as const;

function getParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const q = getParam(resolvedSearchParams.q);
  const category = getParam(resolvedSearchParams.category, "all");
  const level = getParam(resolvedSearchParams.level, "all");
  const sort = (getParam(
    resolvedSearchParams.sort,
    "price-asc",
  ) as CourseCatalogSort) || "price-asc";

  const [catalog, stats] = await Promise.all([
    getPublishedCourses({ q, category, level, sort }),
    getPublicPlatformStats(),
  ]);

  const featuredCourses = catalog.courses.slice(0, 3);
  const heroCourse = featuredCourses[0];
  const totalReviews = catalog.courses.reduce(
    (sum, course) => sum + course.reviewCount,
    0,
  );
  const averageRating =
    totalReviews > 0
      ? catalog.courses.reduce(
          (sum, course) =>
            sum + (course.averageRating ?? 0) * course.reviewCount,
          0,
        ) / totalReviews
      : null;
  const startingPrice = catalog.courses.length
    ? Math.min(...catalog.courses.map((course) => course.price))
    : null;

  const categoryMap = catalog.courses.reduce<Map<string, number>>((acc, course) => {
    acc.set(course.category, (acc.get(course.category) ?? 0) + 1);
    return acc;
  }, new Map());

  const categories = Array.from(categoryMap.entries()).map(([title, count]) => ({
    title,
    count,
  }));

  const reviewPayload = await Promise.all(
    featuredCourses.map((course) => getPublishedCourseBySlug(course.slug)),
  );

  const reviewHighlights = reviewPayload
    .flatMap(
      (course) =>
        course?.reviews.slice(0, 1).map((review) => ({
          id: review.id,
          name: review.user.name,
          text: review.text,
          rating: review.rating,
          courseTitle: course.title,
        })) ?? [],
    )
    .slice(0, 3);

  return (
    <div className="pb-20">
      <AnimatedSection className="relative isolate overflow-hidden bg-black pb-10 text-white sm:pb-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#030712_0%,#081120_26%,#0d2340_58%,#07111f_100%)]" />
          <div className="hero-orb hero-orb-a left-[-9rem] top-[-7rem] h-[24rem] w-[24rem] bg-[#4f46e5]/28" />
          <div className="hero-orb hero-orb-b right-[-10rem] top-[2rem] h-[28rem] w-[28rem] bg-[#2563eb]/24" />
          <div className="hero-orb hero-orb-c bottom-[-9rem] left-[18%] h-[22rem] w-[22rem] bg-[#06b6d4]/16" />
          <div className="hero-orb hero-orb-d bottom-[-8rem] right-[12%] h-[18rem] w-[18rem] bg-[#8b5cf6]/22" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(125,211,252,0.14),transparent_16%),radial-gradient(circle_at_68%_18%,rgba(99,102,241,0.18),transparent_18%),radial-gradient(circle_at_44%_72%,rgba(14,165,233,0.12),transparent_18%)]" />
          <div className="hero-grid absolute inset-0 opacity-[0.08]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.26)_0%,rgba(2,6,23,0.54)_38%,rgba(2,6,23,0.86)_100%)]" />
        </div>

        <div className="app-shell relative z-10 pt-6 sm:pt-8 lg:pt-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] md:items-start xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-white/86">
                <Sparkles className="size-4 text-[#7a78ff]" />
                Премиальная витрина современных онлайн-курсов
              </div>

              <h1 className="mt-5 max-w-5xl text-[clamp(2.85rem,6vw,5.9rem)] font-semibold leading-[0.92] tracking-tight">
                Курсы, которые продают себя качеством, а не шумом
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-white/64 sm:text-lg">
                Здесь хочется покупать, потому что курсы выглядят
                профессионально: сильная упаковка, понятная программа,
                аккуратный опыт ученика и ощущение, что ты входишь в
                зрелый продукт, а не в набор случайных уроков.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  "Практика и результат",
                  "AI-усиленный формат",
                  "Сильные авторы и отзывы",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/82"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <PremiumButton asChild className="h-[52px] px-6 text-base sm:h-14 sm:px-7">
                  <Link href={heroCourse ? `/courses/${heroCourse.slug}` : "/register"}>
                    Выбрать курс
                  </Link>
                </PremiumButton>
                <PremiumButton
                  asChild
                  tone="secondary"
                  className="h-[52px] px-6 text-base sm:h-14 sm:px-7"
                >
                  <Link href="/register">Стать автором</Link>
                </PremiumButton>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <PremiumCard
                  padding="sm"
                  className="rounded-[1.8rem] border-white/10 bg-white/5 text-white"
                >
                  <p className="text-sm text-white/52">Средний рейтинг</p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-tight">
                    {averageRating ? averageRating.toFixed(1) : "4.8"}
                  </p>
                  <p className="mt-2 text-sm text-white/56">
                    {formatCompactNumber(totalReviews || 12)} отзывов
                  </p>
                </PremiumCard>

                <PremiumCard
                  padding="sm"
                  className="rounded-[1.8rem] border-white/10 bg-white/5 text-white"
                >
                  <p className="text-sm text-white/52">Ученики</p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-tight">
                    {formatCompactNumber(stats.enrollments)}
                  </p>
                  <p className="mt-2 text-sm text-white/56">
                    уже внутри программ
                  </p>
                </PremiumCard>

                <PremiumCard
                  padding="sm"
                  className="rounded-[1.8rem] border-white/10 bg-white/5 text-white"
                >
                  <p className="text-sm text-white/52">Старт от</p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-tight">
                    {startingPrice ? formatCurrency(startingPrice, "USD") : "$289"}
                  </p>
                  <p className="mt-2 text-sm text-white/56">
                    за премиальную программу
                  </p>
                </PremiumCard>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2.4rem] bg-[radial-gradient(circle_at_top_left,rgba(122,120,255,0.34),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(71,183,255,0.18),transparent_36%)] blur-2xl" />

              <div className="relative space-y-3">
                <PremiumCard
                  padding="md"
                  className="rounded-[2.4rem] border-white/10 bg-white/8 text-white backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/52">Фокус недели</p>
                      <h2 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight">
                        {heroCourse?.title ?? "AI Course Systems"}
                      </h2>
                    </div>
                    <Badge className="border-transparent bg-white/12 text-white">
                      Хит
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      `${heroCourse?.lessonCount ?? 6} уроков`,
                      `${heroCourse?.studentCount ?? 3} учеников`,
                      heroCourse
                        ? formatCurrency(heroCourse.price, heroCourse.currency)
                        : "$349",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-medium text-white/82"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                    <p className="text-sm text-white/52">Почему покупают</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        "Понятная программа",
                        "AI-усиленная подача",
                        "Премиальная упаковка",
                        "Реальные отзывы",
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-[1.1rem] bg-white/6 px-3 py-3 text-sm font-medium text-white/82"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </PremiumCard>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PremiumCard
                    padding="md"
                    className="rounded-[2rem] border-white/10 bg-white/8 text-white"
                  >
                    <p className="text-sm text-white/52">Авторы</p>
                    <p className="mt-2 text-[2rem] font-semibold tracking-tight">
                      {stats.authors}
                    </p>
                    <p className="mt-2 text-sm text-white/64">
                      с опубликованными программами
                    </p>
                  </PremiumCard>

                  <PremiumCard
                    padding="md"
                    className="rounded-[2rem] border-white/10 bg-[#7a78ff] text-white"
                  >
                    <p className="text-sm text-white/68">Уроки</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight">
                      {formatCompactNumber(stats.lessons)}
                    </p>
                    <p className="mt-2 text-sm text-white/74">
                      уже собраны внутри витрины
                    </p>
                  </PremiumCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="app-shell page-section pt-10">
        <SectionHeader
          eyebrow="Для кого"
          title="Люди приходят сюда не за видео, а за следующим шагом"
          description="Курсы должны ощущаться как уверенная инвестиция в навык, карьеру или новый профессиональный вектор."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {buyerScenarios.map((item) => {
            const Icon = item.icon;

            return (
              <PremiumCard
                key={item.title}
                padding="lg"
                className="rounded-[2rem] bg-white/88 backdrop-blur-xl"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight text-black">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-black/56">
                  {item.description}
                </p>
              </PremiumCard>
            );
          })}
        </div>
      </AnimatedSection>

      <AnimatedSection className="app-shell page-section pt-0">
        <SectionHeader
          eyebrow="Направления"
          title="Популярные категории в витрине"
          description="Быстрый вход в ключевые направления без перегруженного каталога."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((item) => (
            <PremiumCard
              key={item.title}
              padding="lg"
              className="rounded-[2rem] bg-white/88 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <Badge variant="subtle">{item.title}</Badge>
                <span className="text-sm text-black/42">{item.count} курса</span>
              </div>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-black">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-black/56">
                Сильная упаковка, ясная программа и аккуратный путь к результату.
              </p>
            </PremiumCard>
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection className="app-shell page-section pt-0">
        <SectionHeader
          eyebrow="Почему покупают"
          title="Что делает эти курсы сильной покупкой"
          description="Сюда заходят за качеством, доверием и ощущением, что курс доведет до результата."
        />

        <StaggerGrid className="mt-8 grid gap-5 lg:grid-cols-3">
          {sellingPillars.map((item) => {
            const Icon = item.icon;

            return (
              <PremiumCard
                key={item.title}
                padding="lg"
                className="rounded-[2rem] bg-white/90 backdrop-blur-xl"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight text-black">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-black/56">
                  {item.description}
                </p>
              </PremiumCard>
            );
          })}
        </StaggerGrid>

        <PremiumCard
          padding="lg"
          className="mt-6 rounded-[2.4rem] border-transparent bg-black text-white"
        >
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <Badge className="border-transparent bg-white/12 text-white">
                Почему это работает
              </Badge>
              <h3 className="mt-5 text-4xl font-semibold leading-tight tracking-tight">
                Здесь покупка ощущается безопаснее и профессиональнее
              </h3>
              <p className="mt-4 text-base leading-8 text-white/66">
                Когда страница курса сильная, программа прозрачная, а подача
                аккуратная, решение о покупке принимается быстрее и спокойнее.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {purchaseBenefits.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5"
                  >
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white/8 text-[#8f8dff]">
                      <Icon className="size-5" />
                    </div>
                    <h4 className="mt-5 text-xl font-semibold tracking-tight">
                      {item.title}
                    </h4>
                    <p className="mt-3 text-sm leading-7 text-white/64">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </PremiumCard>
      </AnimatedSection>

      {heroCourse ? (
        <AnimatedSection className="app-shell page-section pt-0">
          <PremiumCard
            padding="lg"
            className="overflow-hidden rounded-[2.6rem] border-black/6 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.08)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.16),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(71,183,255,0.14),transparent_24%)]" />

            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <div>
                <Badge variant="primary">Курс недели</Badge>
                <h2 className="mt-5 max-w-3xl text-[clamp(2.2rem,4.2vw,4rem)] font-semibold leading-[0.95] tracking-tight text-black">
                  {heroCourse.title}
                </h2>
                <p className="mt-5 max-w-3xl text-base leading-8 text-black/60">
                  {heroCourse.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {[
                    heroCourse.category,
                    heroCourse.level,
                    `${heroCourse.lessonCount} уроков`,
                    heroCourse.aiEnhanced ? "AI-усилен" : "Структурированный курс",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-full bg-[#f3f5fb] px-4 py-3 text-sm font-medium text-black/68"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <PremiumButton asChild className="h-14 px-6 text-base">
                    <Link href={`/courses/${heroCourse.slug}`}>
                      Открыть курс
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </PremiumButton>
                  <PremiumButton asChild tone="secondary" className="h-14 px-6 text-base">
                    <Link href="/register">Стать автором</Link>
                  </PremiumButton>
                </div>
              </div>

              <div className="space-y-3">
                <PremiumCard
                  padding="md"
                  className="rounded-[2rem] border-black/6 bg-[#0f172a] text-white"
                >
                  <p className="text-sm text-white/56">Стоимость</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight">
                    {formatCurrency(heroCourse.price, heroCourse.currency)}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/64">
                    Премиальная подача, понятная программа и живой формат прохождения.
                  </p>
                </PremiumCard>

                <div className="grid gap-3 sm:grid-cols-2">
                  <PremiumCard
                    padding="md"
                    className="rounded-[2rem] bg-[#f7f8fc]"
                  >
                    <p className="text-sm text-black/42">Рейтинг</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-black">
                      {heroCourse.averageRating
                        ? heroCourse.averageRating.toFixed(1)
                        : "Новый"}
                    </p>
                    <p className="mt-2 text-sm text-black/54">
                      {heroCourse.reviewCount
                        ? `${heroCourse.reviewCount} отзывов`
                        : "первые ученики уже внутри"}
                    </p>
                  </PremiumCard>

                  <PremiumCard
                    padding="md"
                    className="rounded-[2rem] bg-[#f7f8fc]"
                  >
                    <p className="text-sm text-black/42">Ученики</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-black">
                      {formatCompactNumber(heroCourse.studentCount)}
                    </p>
                    <p className="mt-2 text-sm text-black/54">
                      уже купили или проходят
                    </p>
                  </PremiumCard>
                </div>
              </div>
            </div>
          </PremiumCard>
        </AnimatedSection>
      ) : null}

      <AnimatedSection className="app-shell page-section pt-0">
        <SectionHeader
          eyebrow="Популярные курсы"
          title={`${catalog.total} курсов, которые уже готовы к покупке`}
          description="Реальные программы из базы Prisma с автором, ценой, количеством уроков и AI-усиленной подачей."
          action={
            <PremiumButton asChild tone="secondary">
              <Link href="/register">
                Создать свой курс
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </PremiumButton>
          }
        />

        {catalog.courses.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {catalog.courses.map((course) => (
              <PublicCourseCard
                key={course.id}
                slug={course.slug}
                title={course.title}
                description={course.description}
                coverUrl={course.coverUrl}
                authorName={course.authorName}
                price={course.price}
                currency={course.currency}
                category={course.category}
                level={course.level}
                lessonCount={course.lessonCount}
                heroBadges={course.heroBadges}
                oldPrice={course.oldPrice}
                accentColor={course.accentColor}
                cardStyle={course.cardStyle}
                durationLabel={course.durationLabel}
                aiEnhanced={course.aiEnhanced}
                studentCount={course.studentCount}
                averageRating={course.averageRating}
                reviewCount={course.reviewCount}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              icon={Search}
              title="Курсы не найдены"
              description="Сейчас в витрине показываются только опубликованные курсы."
              action={
                <PremiumButton asChild tone="secondary">
                  <Link href="/courses">Обновить витрину</Link>
                </PremiumButton>
              }
            />
          </div>
        )}
      </AnimatedSection>

      <AnimatedSection className="app-shell page-section pt-0">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <PremiumCard
            padding="lg"
            className="rounded-[2.4rem] bg-white/90 backdrop-blur-xl"
          >
            <SectionHeader
              eyebrow="После покупки"
              title="Что получает ученик внутри курса"
              description="Важно не только продать красиво, но и удержать ощущение качества уже после оплаты."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {learningFlow.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.step}
                    className="rounded-[1.8rem] border border-black/6 bg-[#fbfbfc] p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#3d3bff]">
                        <Icon className="size-5" />
                      </div>
                      <span className="text-sm font-medium text-black/34">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight text-black">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-black/56">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.4rem] bg-black text-white">
            <p className="text-sm text-white/56">Для автора</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
              0 ₽ за старт. 15% только с успешных продаж.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/68">
              Это не просто хранилище уроков. Автор получает витрину, упаковку
              и опыт ученика, который помогает продавать курс как зрелый
              цифровой продукт.
            </p>

            <div className="mt-8 space-y-3">
              {[
                "Премиальная страница курса",
                "AI-выжимки, тесты и задания поверх уроков",
                "Ученики получают прогресс, бейджи и AI-наставника",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4"
                >
                  <BadgeCheck className="size-5 text-[#7a78ff]" />
                  <p className="text-sm font-medium text-white/84">{item}</p>
                </div>
              ))}
            </div>

            <PremiumButton
              asChild
              className="mt-8 h-14 w-full bg-white text-black hover:bg-white/92"
            >
              <Link href="/register">Запустить свой курс</Link>
            </PremiumButton>
          </PremiumCard>
        </div>
      </AnimatedSection>

      <AnimatedSection className="app-shell page-section pt-0">
        <SectionHeader
          eyebrow="Отзывы"
          title="Что говорят ученики"
          description="Живые отзывы добавляют доверие и подтверждают, что это не просто красивая оболочка."
        />

        {reviewHighlights.length ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {reviewHighlights.map((review) => (
              <PremiumCard
                key={review.id}
                padding="lg"
                className="rounded-[2rem] bg-white/90 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#eef0ff] text-sm font-semibold text-[#3d3bff]">
                      {getInitials(review.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">{review.name}</p>
                      <p className="text-xs text-black/42">{review.courseTitle}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] px-3 py-2 text-sm font-medium text-black/62">
                    <Star className="size-4 fill-current text-[#f0b24d]" />
                    <span>{review.rating}.0</span>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-black/58">
                  {review.text}
                </p>
              </PremiumCard>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              icon={Star}
              title="Отзывы скоро появятся"
              description="Как только в опубликованных курсах будет больше данных по отзывам, этот блок автоматически наполнится."
            />
          </div>
        )}
      </AnimatedSection>

      <AnimatedSection className="app-shell page-section pt-0">
        <SectionHeader
          eyebrow="FAQ"
          title="Что важно понять до покупки"
          description="Коротко и по делу, без длинных перегруженных блоков."
        />

        <div className="mt-8 space-y-4">
          {faqItems.map((item) => (
            <PremiumCard
              key={item.question}
              padding="lg"
              className="rounded-[2rem] bg-white/90 backdrop-blur-xl"
            >
              <h3 className="text-2xl font-semibold tracking-tight text-black">
                {item.question}
              </h3>
              <p className="mt-4 max-w-4xl text-sm leading-8 text-black/58">
                {item.answer}
              </p>
            </PremiumCard>
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection className="app-shell page-section pt-0">
        <PremiumCard
          padding="lg"
          className="overflow-hidden rounded-[2.8rem] border-black/6 bg-white shadow-[0_28px_100px_rgba(15,23,42,0.08)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.16),transparent_30%),radial-gradient(circle_at_85%_12%,rgba(71,183,255,0.14),transparent_24%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge variant="primary">Финальный шаг</Badge>
              <h2 className="mt-5 text-[clamp(2.6rem,5vw,4.7rem)] font-semibold leading-[0.95] tracking-tight text-black">
                Хочешь купить сильный курс или вывести свой в премиальный сегмент?
              </h2>
              <p className="mt-5 text-lg leading-8 text-black/60">
                Витрина уже работает как продающая часть продукта. Дальше можно
                идти либо как ученик, либо как автор.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <PremiumButton asChild className="h-14 px-7 text-base">
                <Link href={heroCourse ? `/courses/${heroCourse.slug}` : "/register"}>
                  Смотреть курс
                </Link>
              </PremiumButton>
              <PremiumButton
                asChild
                tone="secondary"
                className="h-14 px-7 text-base"
              >
                <Link href="/register">Запустить свой</Link>
              </PremiumButton>
            </div>
          </div>
        </PremiumCard>
      </AnimatedSection>
    </div>
  );
}
