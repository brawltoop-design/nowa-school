import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { CourseSalesPageRenderer } from "@/components/sales-page/course-sales-page-renderer";
import { AnimatedSection } from "@/components/premium/animated-section";
import { PremiumCard } from "@/components/premium/premium-card";
import { PublicCourseCard } from "@/components/premium/public-course-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { getServerAuthSession } from "@/server/auth/session";
import {
  getPublishedCourseBySlug,
  getPublishedCourses,
} from "@/server/public-courses";

type CoursePageProps = {
  params: Promise<{ slug: string }>;
};

async function getPageCourse(slug: string, userId?: string) {
  return getPublishedCourseBySlug(slug, userId);
}

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPageCourse(slug);

  if (!course) {
    return {
      title: "Курс не найден",
    };
  }

  return {
    title: course.salesPage?.metaTitle || course.title,
    description: course.salesPage?.metaDescription || course.description,
  };
}

export default async function PublicCoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const session = await getServerAuthSession();
  const course = await getPageCourse(slug, session?.user?.id);

  if (!course) {
    notFound();
  }

  const relatedCatalog = await getPublishedCourses({
    category: course.category,
    sort: "price-asc",
  });
  const relatedCourses = relatedCatalog.courses
    .filter((item) => item.id !== course.id)
    .slice(0, 3);

  const checkoutHref = `/checkout/mock?course=${encodeURIComponent(course.slug)}`;
  const purchaseHref = course.viewer.isEnrolled
    ? `/learn/${course.id}`
    : session?.user
      ? checkoutHref
      : `/login?callbackUrl=${encodeURIComponent(checkoutHref)}`;

  const purchaseLabel = course.viewer.isEnrolled
    ? "Перейти к обучению"
    : "Купить курс";

  return (
    <div className="pb-20">
      <AnimatedSection className="app-shell pt-8 sm:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-sm font-medium text-black/48 transition duration-200 hover:text-black"
            >
              <ArrowLeft className="size-4" />
              Назад в каталог
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="subtle">{course.category}</Badge>
              <Badge variant="subtle">{course.level}</Badge>
              <Badge variant="subtle">{course.language}</Badge>
              {course.salesPage?.status ? (
                <Badge variant="primary">{course.salesPage.status}</Badge>
              ) : null}
            </div>
          </div>

          {course.viewer.isEnrolled ? (
            <PremiumCard padding="sm" className="rounded-full bg-[#eef0ff]">
              <div className="flex items-center gap-2 text-sm font-medium text-[#3d3bff]">
                <Sparkles className="size-4" />
                Доступ уже активен
              </div>
            </PremiumCard>
          ) : null}
        </div>
      </AnimatedSection>

      <AnimatedSection className="app-shell pt-6">
        <CourseSalesPageRenderer
          course={course}
          salesPage={course.salesPage}
          mode="public"
          primaryHref={purchaseHref}
          primaryLabel={purchaseLabel}
          secondaryHref="#related-courses"
          secondaryLabel="Смотреть похожие курсы"
          tracking={
            course.salesPage
              ? {
                  salesPageId: course.salesPage.id,
                  courseId: course.id,
                  enabled: course.salesPage.status === "PUBLISHED",
                }
              : undefined
          }
        />
      </AnimatedSection>

      {relatedCourses.length ? (
        <AnimatedSection id="related-courses" className="app-shell pt-14">
          <SectionHeader
            eyebrow="Еще в каталоге"
            title="Похожие программы"
            description="Если хочешь собрать вокруг себя более сильный learning stack, вот еще несколько premium курсов рядом по контексту."
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {relatedCourses.map((relatedCourse) => (
              <PublicCourseCard
                key={relatedCourse.id}
                slug={relatedCourse.slug}
                title={relatedCourse.title}
                description={relatedCourse.description}
                coverUrl={relatedCourse.coverUrl}
                authorName={relatedCourse.authorName}
                price={relatedCourse.price}
                currency={relatedCourse.currency}
                category={relatedCourse.category}
                level={relatedCourse.level}
                lessonCount={relatedCourse.lessonCount}
                aiEnhanced={relatedCourse.aiEnhanced}
                studentCount={relatedCourse.studentCount}
                averageRating={relatedCourse.averageRating}
                reviewCount={relatedCourse.reviewCount}
              />
            ))}
          </div>
        </AnimatedSection>
      ) : null}
    </div>
  );
}
