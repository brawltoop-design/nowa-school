"use client";

import type { Session } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LogoutButton } from "@/components/auth/logout-button";
import { CatalogMenu } from "@/components/premium/catalog-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getRoleHome, getRoleLabel } from "@/lib/auth";
import { publicNavigation } from "@/lib/navigation";

function UserPill({
  session,
  dark = false,
}: {
  session: Session;
  dark?: boolean;
}) {
  const initials = session.user.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={
        dark
          ? "hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white lg:flex"
          : "hidden items-center gap-3 rounded-full border border-black/5 bg-[#f5f5f5] px-3 py-2 text-foreground lg:flex"
      }
    >
      <Avatar
        className={
          dark
            ? "size-10 rounded-full border-white/10 bg-white/10"
            : "size-10 rounded-full"
        }
      >
        <AvatarFallback
          className={dark ? "rounded-full bg-white/10 text-white" : "rounded-full"}
        >
          {initials ?? "NS"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className={dark ? "truncate text-sm font-medium text-white" : "truncate text-sm font-medium text-foreground"}>
          {session.user.name}
        </p>
        <p className={dark ? "truncate text-xs text-white/60" : "truncate text-xs text-muted-foreground"}>
          {getRoleLabel(session.user.role)}
        </p>
      </div>
    </div>
  );
}

function AuthenticatedActions({
  session,
  dark = false,
}: {
  session: Session;
  dark?: boolean;
}) {
  return (
    <>
      <UserPill session={session} dark={dark} />
      <Link
        href={getRoleHome(session.user.role)}
        className={
          dark
            ? "inline-flex rounded-full bg-[#3d3bff] px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8]"
            : "inline-flex rounded-full bg-[#3d3bff] px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8]"
        }
      >
        Кабинет
      </Link>
      <LogoutButton
        className={
          dark
            ? "hidden border border-white/10 bg-white/5 text-white hover:bg-white/10 sm:inline-flex"
            : "hidden bg-[#efefef] text-black hover:bg-[#e7e7e7] sm:inline-flex"
        }
      />
    </>
  );
}

export function PublicNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isCoursesStorefront = pathname === "/courses";

  if (isCoursesStorefront) {
    return (
      <div className="sticky top-0 z-40">
        <div className="border-b border-black/10 bg-[#f8ffc0]">
          <div className="app-shell flex min-h-12 flex-wrap items-center justify-between gap-3 py-3 text-sm font-medium text-black">
            <p>Starter kit бесплатно: 30 промтов и шаблон первого лендинга</p>
            <Link
              href="/free"
              className="inline-flex items-center transition duration-200 hover:opacity-70"
            >
              Забрать бесплатно
            </Link>
          </div>
        </div>

        <header className="border-b border-white/10 bg-black text-white">
          <div className="app-shell flex flex-wrap items-center justify-between gap-4 py-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <Link href="/courses" className="shrink-0">
                <Image
                  src="/nowa-school-white-logo.png"
                  alt="nowa school"
                  width={3470}
                  height={1076}
                  className="h-9 w-auto sm:h-11"
                  priority
                />
              </Link>
              <CatalogMenu theme="dark" className="hidden sm:inline-flex" />
            </div>

            <nav className="hidden items-center gap-5 xl:flex">
              {publicNavigation.slice(0, 5).map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="text-[15px] font-medium text-white/72 transition duration-200 hover:text-white"
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {session ? (
                <AuthenticatedActions session={session} dark />
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-white/10 sm:hidden"
                  >
                    Войти
                  </Link>
                  <Link
                    href="/learn"
                    className="hidden text-sm font-medium text-white/72 transition duration-200 hover:text-white sm:inline-flex"
                  >
                    Кабинет ученика
                  </Link>
                  <Link
                    href="/login"
                    className="hidden text-sm font-medium text-white/72 transition duration-200 hover:text-white sm:inline-flex"
                  >
                    Войти
                  </Link>
                  <Link
                    href="/free"
                    className="hidden rounded-full bg-[#ebebeb] px-5 py-3 text-sm font-medium text-black transition duration-200 hover:bg-white lg:inline-flex"
                  >
                    Бесплатно
                  </Link>
                  <Link
                    href="/courses"
                    className="hidden rounded-full bg-[#1f1f1f] px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#2a2a2a] lg:inline-flex"
                  >
                    nowa school
                  </Link>
                </>
              )}
            </div>

            <div className="flex w-full gap-3 sm:hidden">
              <CatalogMenu theme="dark" className="flex-1 justify-center" />
              <Link
                href={session ? "/courses" : "/free"}
                className="inline-flex items-center justify-center rounded-full bg-[#ebebeb] px-5 py-3 text-sm font-medium text-black transition duration-200 hover:bg-white"
              >
                {session ? "Курсы" : "Бесплатно"}
              </Link>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur-xl">
      <div className="app-shell flex flex-wrap items-center justify-between gap-4 py-4 sm:gap-6">
        <div className="flex items-center gap-4">
          <Link href="/courses" className="shrink-0">
            <Image
              src="/nowa-school-black-logo.png"
              alt="nowa school"
              width={3470}
              height={1076}
              className="h-9 w-auto sm:h-11"
              priority
            />
          </Link>
          <CatalogMenu className="hidden sm:inline-flex" />
        </div>

        <nav className="hidden items-center gap-5 lg:flex">
          {publicNavigation.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={
                pathname === item.href
                  ? "text-[15px] font-medium text-black"
                  : "text-[15px] font-medium text-black/62 transition duration-200 hover:text-black"
              }
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <AuthenticatedActions session={session} />
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex rounded-full bg-[#efefef] px-4 py-2.5 text-sm font-medium text-black transition duration-200 hover:bg-[#e7e7e7] sm:hidden"
              >
                Войти
              </Link>
              <Link
                href="/learn"
                className="hidden rounded-full bg-[#f5f5f5] px-5 py-3 text-sm font-medium text-black transition duration-200 hover:bg-[#ededed] sm:inline-flex"
              >
                Кабинет ученика
              </Link>
              <Link
                href="/login"
                className="hidden rounded-full bg-[#efefef] px-5 py-3 text-sm font-medium text-black transition duration-200 hover:bg-[#e7e7e7] sm:inline-flex"
              >
                Войти
              </Link>
              <Link
                href="/free"
                className="hidden rounded-full bg-[#3d3bff] px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8] lg:inline-flex"
              >
                Начать бесплатно
              </Link>
            </>
          )}
        </div>

        <div className="flex w-full gap-3 sm:hidden">
          <CatalogMenu className="flex-1 justify-center" />
          <Link
            href={session ? "/courses" : "/free"}
            className="inline-flex items-center justify-center rounded-full bg-[#3d3bff] px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8]"
          >
            {session ? "Курсы" : "Бесплатно"}
          </Link>
        </div>
      </div>
    </header>
  );
}
