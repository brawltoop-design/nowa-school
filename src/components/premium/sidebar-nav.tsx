"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bot,
  Compass,
  LayoutDashboard,
  Award,
  ReceiptText,
  ShoppingBag,
  SquarePen,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DashboardNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  items: ReadonlyArray<DashboardNavItem>;
  label: string;
};

const icons = {
  "layout-dashboard": LayoutDashboard,
  "book-open": BookOpen,
  bot: Bot,
  compass: Compass,
  receipt: ReceiptText,
  "shopping-bag": ShoppingBag,
  "square-pen": SquarePen,
  "shield-check": ShieldCheck,
  users: Users,
  award: Award,
} as const;

export function SidebarNav({ items, label }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <Badge variant="subtle">{label}</Badge>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-1">
        {items.map((item) => {
          const isAuthorBuilderItem =
            item.href === "/author/courses/new" &&
            pathname.startsWith("/author/courses/");
          const isRootAuthorItem = item.href === "/author";
          const isActive = isRootAuthorItem
            ? pathname === item.href
            : isAuthorBuilderItem
              ? true
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
          const Icon = icons[item.icon];

          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "group flex w-full min-w-[210px] shrink-0 items-center gap-3 rounded-[1.4rem] border px-4 py-3 text-sm font-medium transition duration-300 md:min-w-0 md:shrink",
                isActive
                  ? "border-[#3d3bff] bg-[#3d3bff] text-white"
                  : "border-transparent bg-[#efefef] text-muted-foreground hover:bg-[#e7e7e7] hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition duration-300",
                  isActive
                    ? "bg-white/12 text-white"
                    : "bg-white text-foreground",
                )}
              >
                <Icon className="size-4" />
              </div>
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
