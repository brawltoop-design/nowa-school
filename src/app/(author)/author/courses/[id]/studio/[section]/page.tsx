import { notFound, redirect } from "next/navigation";
import { CourseStudioSectionPage } from "@/components/author/course-studio-sections";
import { normalizeCourseStudioSection } from "@/lib/course-studio";
import { requireUserRole } from "@/server/auth/session";
import { getAuthorCourseBuilderData } from "@/server/author/queries";
import { getCourseStudioData } from "@/server/sales-page/queries";

type CourseStudioSectionRouteProps = {
  params: Promise<{ id: string; section: string }>;
};

export default async function CourseStudioSectionRoute({
  params,
}: CourseStudioSectionRouteProps) {
  const { id, section } = await params;
  const activeSection = normalizeCourseStudioSection(section);

  if (!activeSection) {
    notFound();
  }

  const session = await requireUserRole(
    ["AUTHOR", "ADMIN"],
    `/author/courses/${id}/studio/${activeSection}`,
  );

  const [studioResult, builderResult] = await Promise.all([
    getCourseStudioData(id, {
      userId: session.user.id,
      role: session.user.role,
    }),
    getAuthorCourseBuilderData(id, {
      userId: session.user.id,
      role: session.user.role,
    }),
  ]);

  if (studioResult.status === "forbidden" || builderResult.status === "forbidden") {
    redirect("/forbidden");
  }

  if (studioResult.status === "not_found" || builderResult.status === "not_found") {
    notFound();
  }

  return (
    <CourseStudioSectionPage
      section={activeSection}
      studio={studioResult.data}
      builderCourse={builderResult.course}
    />
  );
}
