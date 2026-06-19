import type { ReactNode } from "react";
import { DashboardShell } from "@/components/premium/dashboard-shell";
import { requireUserRole } from "@/server/auth/session";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireUserRole(["STUDENT", "ADMIN"], "/learn");

  return (
    <DashboardShell role="student" session={session}>
      {children}
    </DashboardShell>
  );
}
