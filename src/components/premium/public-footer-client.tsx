"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/premium/site-footer";

export function PublicFooterClient() {
  const pathname = usePathname();
  const isCourseDetailsPage =
    pathname.startsWith("/courses/") && pathname !== "/courses";

  if (isCourseDetailsPage) {
    return null;
  }

  return <SiteFooter />;
}
