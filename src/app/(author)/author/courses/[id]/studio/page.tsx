import { redirect } from "next/navigation";
import {
  getCourseStudioPath,
  normalizeCourseStudioSection,
} from "@/lib/course-studio";

type CourseStudioRootPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CourseStudioRootPage({
  params,
  searchParams,
}: CourseStudioRootPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const section =
    normalizeCourseStudioSection(getFirstValue(resolvedSearchParams.tab)) ??
    "overview";

  redirect(getCourseStudioPath(id, section));
}
