import type { ReactNode } from "react";
import { GradientBackground } from "@/components/premium/gradient-background";
import { PublicNavbar } from "@/components/premium/public-navbar";
import { SiteFooter } from "@/components/premium/site-footer";

export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <GradientBackground />
      <PublicNavbar />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
