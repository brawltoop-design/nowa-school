import type { ReactNode } from "react";
import { GradientBackground } from "@/components/premium/gradient-background";
import { PublicNavbar } from "@/components/premium/public-navbar";
import { PublicFooterClient } from "@/components/premium/public-footer-client";

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
      <PublicFooterClient />
    </div>
  );
}
