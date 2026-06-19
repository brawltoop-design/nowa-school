"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Brain,
  BriefcaseBusiness,
  Brush,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Code2,
  Gamepad2,
  Globe,
  Grid2X2,
  Megaphone,
  Search,
  Store,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type CatalogMenuProps = {
  className?: string;
  theme?: "light" | "dark";
  triggerLabel?: string;
};

const catalogCategories = [
  { title: "Программирование", href: "/courses?category=AI", icon: Code2 },
  { title: "Дизайн", href: "/courses?category=Design", icon: Brush },
  { title: "Аналитика", href: "/courses?category=Analytics", icon: ChartColumn },
  { title: "Маркетинг", href: "/courses?category=Marketing", icon: Megaphone },
  { title: "Управление", href: "/courses?category=Business", icon: BriefcaseBusiness },
  { title: "Финансы", href: "/courses?category=Business", icon: Wallet },
  { title: "Игры", href: "/courses?category=Creator%20Economy", icon: Gamepad2 },
  { title: "Кино и Музыка", href: "/courses?category=Creator%20Economy", icon: Clapperboard },
  { title: "Маркетплейсы", href: "/courses?category=Business", icon: Store },
  { title: "Инженерия", href: "/courses?category=Business", icon: Wrench },
  { title: "Нейросети", href: "/courses?category=AI", icon: Brain },
  { title: "Английский язык", href: "/courses?category=Creator%20Economy", icon: Globe },
  { title: "Все курсы", href: "/courses", icon: Grid2X2 },
] as const;

const catalogPopular = [
  { title: "AI-креатор: контент и программа курса", accent: "bg-[#eef1ff]", badge: "AI" },
  { title: "Python-разработчик + ИИ", accent: "bg-[#f3ecff]", badge: "PY" },
  { title: "Менеджер маркетплейсов + AI", accent: "bg-[#e8f1ff]", badge: "MP" },
  { title: "Графический дизайнер PRO + ИИ", accent: "bg-[#fff0db]", badge: "GD" },
  { title: "Дизайнер интерьеров", accent: "bg-[#efe8ff]", badge: "IN" },
  { title: "1С-программист", accent: "bg-[#f8ecdf]", badge: "1C" },
  { title: "Веб-дизайнер + ИИ", accent: "bg-[#ebe9ff]", badge: "WD" },
  { title: "3D-дженералист + ИИ", accent: "bg-[#fce8d8]", badge: "3D" },
] as const;

const itemsPerPage = 4;

export function CatalogMenu({
  className,
  theme = "light",
  triggerLabel = "Каталог",
}: CatalogMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    setPage(0);
  }, [deferredQuery]);

  const filteredCategories = deferredQuery
    ? catalogCategories.filter((item) =>
        item.title.toLowerCase().includes(deferredQuery),
      )
    : catalogCategories;

  const filteredPopular = deferredQuery
    ? catalogPopular.filter((item) =>
        item.title.toLowerCase().includes(deferredQuery),
      )
    : catalogPopular;

  const pagedPopular = deferredQuery
    ? filteredPopular
    : filteredPopular.slice(page * itemsPerPage, page * itemsPerPage + itemsPerPage);

  const totalPages = Math.max(1, Math.ceil(filteredPopular.length / itemsPerPage));

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium transition duration-200 hover:scale-[1.02]",
            theme === "dark"
              ? "bg-[#3d3bff] text-white hover:bg-[#2f2de8]"
              : "border border-black/6 bg-white/88 text-black shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl hover:bg-white",
            className,
          )}
        >
          <div
            className={cn(
              "flex items-center gap-1",
              theme === "dark" ? "text-white" : "text-[#3d3bff]",
            )}
          >
            <Search className="size-4" />
            <div
              className={cn(
                "h-4 w-px",
                theme === "dark" ? "bg-white/28" : "bg-[#3d3bff]/20",
              )}
            />
            <div className="flex size-4 items-center justify-center">
              <span
                className={cn(
                  "block h-0.5 w-3 rounded-full",
                  theme === "dark" ? "bg-white" : "bg-[#3d3bff]",
                )}
              />
            </div>
          </div>
          <span>{triggerLabel}</span>
        </button>
      </Dialog.Trigger>

      <AnimatePresence>
        {isOpen ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <div className="fixed left-1/2 top-1/2 z-50 h-[min(780px,calc(100vh-1rem))] w-[min(1080px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 outline-none sm:h-[min(780px,calc(100vh-2rem))] sm:w-[min(1080px,calc(100vw-2rem))]">
                <motion.div
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.985 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/14 bg-[#070711]/96 shadow-[0_30px_80px_rgba(5,8,20,0.48)] backdrop-blur-xl sm:rounded-[2.5rem]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,120,255,0.18),transparent_30%),radial-gradient(circle_at_82%_76%,rgba(122,120,255,0.22),transparent_20%),radial-gradient(circle_at_top_right,rgba(71,183,255,0.12),transparent_24%)]" />
                  <div className="grid h-full min-h-0 gap-0 overflow-hidden lg:grid-cols-[1.1fr_1fr]">
                    <div className="relative min-h-0 overflow-y-auto border-b border-white/10 p-4 lg:border-b-0 lg:border-r lg:border-white/10 lg:p-6">
                      <div className="mb-4 flex items-center gap-3 sm:mb-5 sm:gap-4">
                        <Dialog.Close asChild>
                          <button
                            type="button"
                            aria-label="Закрыть каталог"
                            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition duration-200 hover:bg-white/10 sm:size-11"
                          >
                            <X className="size-5" />
                          </button>
                        </Dialog.Close>

                        <div>
                          <h2 className="text-[1.45rem] font-semibold tracking-tight text-white sm:text-[1.75rem]">
                            Наши курсы
                          </h2>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-white/46" />
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Профессия, курс или навык"
                          className="h-16 w-full rounded-[1.4rem] border border-white/12 bg-white/6 pl-14 pr-5 text-[15px] text-white outline-none transition duration-200 placeholder:text-white/42 focus:border-white/18 focus:bg-white/9"
                        />
                      </div>

                      <div className="mt-5 grid gap-x-5 gap-y-1 sm:mt-6 sm:grid-cols-2">
                        {filteredCategories.map((item) => {
                          const Icon = item.icon;

                          return (
                            <Dialog.Close asChild key={item.title}>
                              <Link
                                href={item.href}
                                className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition duration-200 hover:bg-white/6"
                              >
                                <div className="flex size-9 items-center justify-center rounded-full bg-white text-black/72 transition duration-200 group-hover:bg-white group-hover:text-black">
                                  <Icon className="size-4" />
                                </div>
                                <span className="text-[15px] font-medium text-white">
                                  {item.title}
                                </span>
                              </Link>
                            </Dialog.Close>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative min-h-0 overflow-y-auto p-4 lg:p-6">
                      <div className="flex items-center justify-between gap-4">
                        <Dialog.Title className="text-[1.65rem] font-semibold tracking-tight text-white sm:text-[2rem]">
                          Популярное
                        </Dialog.Title>
                        {!deferredQuery ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Предыдущая страница"
                              className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/56 transition duration-200 hover:bg-white/10 hover:text-white"
                              onClick={() =>
                                setPage((value) =>
                                  value === 0 ? totalPages - 1 : value - 1,
                                )
                              }
                            >
                              <ChevronLeft className="size-5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Следующая страница"
                              className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/56 transition duration-200 hover:bg-white/10 hover:text-white"
                              onClick={() =>
                                setPage((value) =>
                                  value >= totalPages - 1 ? 0 : value + 1,
                                )
                              }
                            >
                              <ChevronRight className="size-5" />
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {pagedPopular.map((item) => (
                          <Dialog.Close asChild key={item.title}>
                            <Link
                              href="/courses"
                              className="group flex items-center gap-4 rounded-[1.6rem] p-3 transition duration-200 hover:bg-white/6"
                            >
                              <div
                                className={cn(
                                  "flex size-[92px] shrink-0 items-center justify-center rounded-[1.6rem] text-lg font-semibold tracking-tight text-black",
                                  item.accent,
                                )}
                              >
                                {item.badge}
                              </div>
                              <p className="line-clamp-3 text-[15px] font-semibold leading-8 text-white transition duration-200 group-hover:opacity-80">
                                {item.title}
                              </p>
                            </Link>
                          </Dialog.Close>
                        ))}
                      </div>

                      {filteredCategories.length === 0 && filteredPopular.length === 0 ? (
                        <div className="mt-8 rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
                          <p className="text-sm font-medium text-white">
                            Ничего не нашли
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white/56">
                            Попробуй другой запрос или открой полный каталог курсов.
                          </p>
                          <Dialog.Close asChild>
                            <Link
                              href="/courses"
                              className="mt-4 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
                            >
                              Все курсы
                            </Link>
                          </Dialog.Close>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
