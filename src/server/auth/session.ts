import type { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/auth";
import { authOptions } from "@/server/auth/config";

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

export async function redirectAuthenticatedUser() {
  const session = await getServerAuthSession();

  if (session?.user?.role) {
    redirect(getRoleHome(session.user.role));
  }
}

export async function requireUserRole(roles: UserRole[], callbackUrl?: string) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect(
      callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login",
    );
  }

  if (!roles.includes(session.user.role)) {
    redirect("/forbidden");
  }

  return session;
}
