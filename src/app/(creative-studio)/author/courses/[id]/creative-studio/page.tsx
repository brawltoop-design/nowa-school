import { notFound, redirect } from "next/navigation";
import { CreativeStudio } from "@/components/author/creative-studio";
import { requireUserRole } from "@/server/auth/session";
import { getAuthorCourseBuilderData } from "@/server/author/queries";
import { getCourseStudioData } from "@/server/sales-page/queries";

type CreativeStudioRouteProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

function normalizeCreativeStudioTab(value: string | undefined) {
  switch (value) {
    case "course-card":
    case "sales-page":
    case "course-studio":
    case "ai-assistant":
    case "analytics":
      return value;
    default:
      return "course-card";
  }
}

export default async function CreativeStudioRoute({
  params,
  searchParams,
}: CreativeStudioRouteProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ tab?: string }>({}),
  ]);

  const session = await requireUserRole(
    ["AUTHOR", "ADMIN"],
    `/author/courses/${id}/creative-studio`,
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
    <CreativeStudio
      studio={studioResult.data}
      builderCourse={builderResult.course}
      initialTab={normalizeCreativeStudioTab(resolvedSearchParams.tab)}
    />
  );
}
