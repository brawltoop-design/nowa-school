import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 py-12">
      <div className="app-shell flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <Image
            src="/nowa-school-black-logo.png"
            alt="nowa school"
            width={3470}
            height={1076}
            className="h-10 w-auto"
          />
          <p className="max-w-sm text-sm text-black/56">
            AI-first школа для вайбкодинга, AI-агентов, MVP и практических digital-продуктов.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-black/56">
          <Link href="/" className="transition duration-200 hover:text-black">
            Главная
          </Link>
          <Link href="/guides" className="transition duration-200 hover:text-black">
            Гайды
          </Link>
          <Link href="/free" className="transition duration-200 hover:text-black">
            Starter kit
          </Link>
          <Link href="/telegram" className="transition duration-200 hover:text-black">
            Telegram
          </Link>
          <Link href="/bootcamp" className="transition duration-200 hover:text-black">
            Bootcamp
          </Link>
          <Link href="/authors" className="transition duration-200 hover:text-black">
            Авторы
          </Link>
          <Link href="/pricing" className="transition duration-200 hover:text-black">
            Цены
          </Link>
          <Link href="/cases" className="transition duration-200 hover:text-black">
            Кейсы
          </Link>
          <Link href="/blog" className="transition duration-200 hover:text-black">
            Блог
          </Link>
          <Link href="/courses" className="transition duration-200 hover:text-black">
            Курсы LMS
          </Link>
        </div>
      </div>
    </footer>
  );
}
