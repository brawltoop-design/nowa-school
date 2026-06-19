import type { ReactNode } from "react";
import type { Session } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bell, BookOpen, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CatalogMenu } from "@/components/premium/catalog-menu";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/premium/premium-card";
import { SidebarNav } from "@/components/premium/sidebar-nav";
import { dashboardNavigation } from "@/lib/navigation";

type DashboardShellProps = {
  role: keyof typeof dashboardNavigation;
  session: Session;
  children: ReactNode;
};

const shellCopy = {
  author: {
    title: "Авторский кабинет",
    description: "Курсы, продажи и builder в одном аналитическом пространстве.",
    note: "Analytics, revenue и course builder",
    side: "Управляй курсами, модулями, уроками и продажами без ощущения старой админки.",
  },
  student: {
    title: "Кабинет ученика",
    description: "Учись внутри продукта.",
    note: "Прогресс и AI-помощник",
    side: "Уроки, задания, roadmap и сопровождение в одном месте.",
  },
  admin: {
    title: "Админка",
    description: "Операции под контролем.",
    note: "Пользователи, курсы и платежи",
    side: "Авторы, очереди и статус платформы без лишнего визуального шума.",
  },
} as const;

const roleBadge = {
  author: "AUTHOR",
  student: "STUDENT",
  admin: "ADMIN",
} as const;

export function DashboardShell({
  role,
  session,
  children,
}: DashboardShellProps) {
  const copy = shellCopy[role];
  const initials = session.user.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell page-section pt-8 sm:pt-10">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="order-2 min-w-0 space-y-5 lg:order-1">
          <div className="space-y-4 lg:sticky lg:top-24">
            <PremiumCard padding="lg" className="p-6 sm:p-8">
              <Image
                src="/nowa-school-black-logo.png"
                alt="nowa school"
                width={3470}
                height={1076}
                className="h-10 w-auto"
                priority
              />
              <div className="mt-6">
                <p className="text-sm font-medium text-black">{copy.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {copy.side}
                </p>
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-black/5 bg-[#f5f5f5] p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 rounded-full">
                    <AvatarImage src={undefined} alt={session.user.name ?? "User"} />
                    <AvatarFallback className="rounded-full">
                      {initials ?? "NS"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {session.user.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Badge variant="subtle">{roleBadge[role]}</Badge>
                  <LogoutButton className="w-full justify-center px-4 sm:w-auto" />
                </div>
              </div>
            </PremiumCard>

            <PremiumCard padding="lg" tone="glass" className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Workspace</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {role === "author" ? "85%" : "01"}
                  </p>
                </div>
                <Badge variant="primary">{role === "author" ? "Revenue" : "Live"}</Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{copy.note}</p>
            </PremiumCard>

            <PremiumCard padding="lg" tone="glass" className="p-6 sm:p-8">
              <SidebarNav items={dashboardNavigation[role]} label="Workspace" />
            </PremiumCard>
          </div>
        </aside>

        <div className="order-1 min-w-0 space-y-6 lg:order-2">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <PremiumCard padding="lg" className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <Badge variant="subtle">{copy.title}</Badge>
                  <div>
                    <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground">
                      {copy.description}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {copy.note}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  {role === "author" ? (
                    <Link
                      href="/author/courses/new"
                      className="inline-flex w-full items-center justify-center rounded-full bg-[#3d3bff] px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8] sm:w-auto"
                    >
                      Новый курс
                      <ArrowUpRight className="ml-2 size-4" />
                    </Link>
                  ) : role === "admin" ? (
                    <Link
                      href="/admin/courses"
                      className="inline-flex w-full items-center justify-center rounded-full bg-[#3d3bff] px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8] sm:w-auto"
                    >
                      <BookOpen className="mr-2 size-4" />
                      Курсы
                    </Link>
                  ) : (
                    <CatalogMenu className="w-full justify-center sm:w-auto" />
                  )}
                  <Link
                    href={role === "admin" ? "/admin/users" : "/courses"}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#efefef] px-5 py-3 text-sm font-medium text-black transition duration-200 hover:bg-[#e7e7e7] sm:w-auto"
                  >
                    {role === "admin" ? (
                      <>
                        <Users className="mr-2 size-4" />
                        Пользователи
                      </>
                    ) : (
                      <>
                        Библиотека
                        <ArrowUpRight className="ml-2 size-4" />
                      </>
                    )}
                  </Link>
                  <div className="flex items-center justify-between gap-3 rounded-full bg-[#efefef] px-3 py-2 sm:justify-start">
                    <div className="flex size-9 items-center justify-center rounded-full bg-white">
                      <Bell className="size-4" />
                    </div>
                    <Avatar className="size-10 rounded-full">
                      <AvatarImage src={undefined} alt={session.user.name ?? "User"} />
                      <AvatarFallback className="rounded-full">
                        {initials ?? "NS"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard
              padding="lg"
              className="border-transparent bg-black p-6 text-white sm:p-8"
            >
              <p className="text-sm text-white/56">
                {role === "author" ? "Экономика" : role === "admin" ? "Take rate" : "MVP"}
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight">
                {role === "author" || role === "admin" ? "15%" : "01"}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/72">
                {role === "author"
                  ? "Комиссия платформы. Остальное остается автору как revenue."
                  : role === "admin"
                    ? "Платформа удерживает комиссию только с успешных продаж."
                    : "Каркас готов. Дальше можно допиливать блоки вручную."}
              </p>
            </PremiumCard>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
