import type { ReactNode } from "react";
import { GradientBackground } from "@/components/premium/gradient-background";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <GradientBackground />
      <main className="app-shell flex min-h-screen items-center py-12">
        {children}
      </main>
    </div>
  );
}
