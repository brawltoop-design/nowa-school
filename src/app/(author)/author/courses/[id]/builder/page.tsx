import { redirect } from "next/navigation";

type AuthorCourseBuilderRedirectProps = {
  params: Promise<{ id: string }>;
};

export default async function AuthorCourseBuilderRedirect({
  params,
}: AuthorCourseBuilderRedirectProps) {
  const { id } = await params;

  redirect(`/author/courses/${id}/studio/lessons`);
}
