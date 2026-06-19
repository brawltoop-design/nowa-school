import type { ReactNode } from "react";
import { DashboardShell } from "@/components/premium/dashboard-shell";
import { requireUserRole } from "@/server/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireUserRole(["ADMIN"], "/admin");

  return (
    <DashboardShell role="admin" session={session}>
      {children}
    </DashboardShell>
  );
}
