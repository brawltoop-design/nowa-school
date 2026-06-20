import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { CourseStudioHeader } from "@/components/author/course-studio-header";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { requireUserRole } from "@/server/auth/session";
import { getAuthorCourseStudioShellData } from "@/server/author/queries";

type CourseStudioLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function CourseStudioLayout({
  children,
  params,
}: CourseStudioLayoutProps) {
  const { id } = await params;
  const session = await requireUserRole(
    ["AUTHOR", "ADMIN"],
    `/author/courses/${id}/studio`,
  );
  const result = await getAuthorCourseStudioShellData(id, {
    userId: session.user.id,
    role: session.user.role,
  });

  if (result.status === "forbidden") {
    redirect("/forbidden");
  }

  if (result.status === "not_found") {
    notFound();
  }

  const course = result.data;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Авторский кабинет", href: "/author" },
          { label: course.title },
          { label: "Креативная студия" },
        ]}
      />

      <CourseStudioHeader course={course} />
      {children}
    </div>
  );
}
