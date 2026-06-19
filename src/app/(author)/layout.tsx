import type { ReactNode } from "react";
import { DashboardShell } from "@/components/premium/dashboard-shell";
import { requireUserRole } from "@/server/auth/session";

export default async function AuthorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author");

  return (
    <DashboardShell role="author" session={session}>
      {children}
    </DashboardShell>
  );
}
