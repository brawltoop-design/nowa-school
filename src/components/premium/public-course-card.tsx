"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Sparkles, Star, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn, formatCompactNumber, formatCurrency } from "@/lib/utils";

type PublicCourseCardProps = {
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  authorName: string;
  price: number;
  currency: string;
  category: string;
  level: string;
  lessonCount: number;
  aiEnhanced: boolean;
  studentCount: number;
  averageRating: number | null;
  reviewCount: number;
  className?: string;
};

export function PublicCourseCard({
  slug,
  title,
  description,
  coverUrl,
  authorName,
  price,
  currency,
  category,
  level,
  lessonCount,
  aiEnhanced,
  studentCount,
  averageRating,
  reviewCount,
  className,
}: PublicCourseCardProps) {
  const safeDescription = description ?? "";
  const descriptionPreview =
    safeDescription.length > 120
      ? `${safeDescription.slice(0, 117)}...`
      : safeDescription;

  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn(
        "group flex h-full flex-col rounded-[2rem] border border-black/6 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[1.6rem] border border-black/6 bg-[#f5f7fb]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            width={1440}
            height={960}
            unoptimized
            className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-56 w-full bg-[radial-gradient(circle_at_top_right,rgba(61,59,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(71,183,255,0.12),transparent_32%),linear-gradient(135deg,#111827_0%,#3d3bff_100%)]" />
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge variant="default" className="bg-white/92 text-black shadow-sm">
            {category}
          </Badge>
          {aiEnhanced ? (
            <Badge variant="primary" className="shadow-sm">
              AI-усилен
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-2 pb-2 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-black/48">{level}</p>
            <h3 className="mt-2 text-[1.6rem] font-semibold leading-tight tracking-tight text-black">
              {title}
            </h3>
          </div>
          <p className="text-right text-xl font-semibold tracking-tight text-black">
            {formatCurrency(price, currency)}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-black/56">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-3 py-2">
            <UserCircle2 className="size-4" />
            <span>{authorName}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-3 py-2">
            <BookOpen className="size-4" />
            <span>{lessonCount} уроков</span>
          </div>
        </div>

        {descriptionPreview ? (
          <p className="mt-4 text-sm leading-7 text-black/56">
            {descriptionPreview}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <div className="inline-flex items-center gap-2 text-black/56">
            <Star className="size-4 fill-current text-[#f0b24d]" />
            <span>
              {averageRating
                ? `${averageRating.toFixed(1)} · ${reviewCount} отзывов`
                : "Новый курс"}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 text-black/56">
            <Sparkles className="size-4 text-[#3d3bff]" />
            <span>{formatCompactNumber(studentCount)} учеников</span>
          </div>
        </div>

        <Link
          href={`/courses/${slug}`}
          className="mt-6 inline-flex items-center justify-between rounded-full bg-[#3d3bff] px-4 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8]"
        >
          <span>Смотреть программу</span>
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </motion.article>
  );
}
