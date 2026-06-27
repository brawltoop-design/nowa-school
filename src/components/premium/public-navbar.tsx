import { getServerAuthSession } from "@/server/auth/session";
import { PublicNavbarClient } from "@/components/premium/public-navbar-client";

export async function PublicNavbar() {
  const session = await getServerAuthSession();

  return <PublicNavbarClient session={session} />;
}
