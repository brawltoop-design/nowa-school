"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Clock3,
  Sparkles,
  Star,
  UserCircle2,
} from "lucide-react";
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
  heroBadges?: string[];
  oldPrice?: number | null;
  accentColor?: string | null;
  cardStyle?: "editorial" | "spotlight" | "compact" | null;
  durationLabel?: string | null;
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
  heroBadges = [],
  oldPrice,
  accentColor,
  cardStyle,
  durationLabel,
  aiEnhanced,
  studentCount,
  averageRating,
  reviewCount,
  className,
}: PublicCourseCardProps) {
  const accent = accentColor ?? "#3d3bff";
  const safeDescription = description ?? "";
  const descriptionPreview =
    safeDescription.length > (cardStyle === "compact" ? 88 : 120)
      ? `${safeDescription.slice(0, cardStyle === "compact" ? 85 : 117)}...`
      : safeDescription;
  const isSpotlight = cardStyle === "spotlight";
  const isCompact = cardStyle === "compact";

  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn(
        "group flex h-full flex-col rounded-[2rem] border p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]",
        isSpotlight
          ? "border-transparent bg-[#05070b] text-white"
          : "border-black/6 bg-white",
        className,
      )}
      style={{
        boxShadow: `0 18px 60px ${accent}18`,
      }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.6rem] border",
          isSpotlight ? "border-white/10 bg-[#0b1020]" : "border-black/6 bg-[#f5f7fb]",
        )}
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            width={1440}
            height={960}
            unoptimized
            className={cn(
              "w-full object-cover transition duration-500 group-hover:scale-[1.03]",
              isCompact ? "h-48" : "h-56",
            )}
          />
        ) : (
          <div
            className={cn("w-full", isCompact ? "h-48" : "h-56")}
            style={{
              background: `radial-gradient(circle at top right, ${accent}3d, transparent 30%), radial-gradient(circle at bottom left, rgba(71,183,255,0.12), transparent 32%), linear-gradient(135deg, #111827 0%, ${accent} 100%)`,
            }}
          />
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge
            variant="default"
            className={cn(
              "shadow-sm",
              isSpotlight ? "bg-white/12 text-white" : "bg-white/92 text-black",
            )}
          >
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
            <p className={cn("text-sm", isSpotlight ? "text-white/46" : "text-black/48")}>
              {level}
            </p>
            <h3
              className={cn(
                "mt-2 font-semibold leading-tight tracking-tight",
                isCompact ? "text-[1.35rem]" : "text-[1.6rem]",
                isSpotlight ? "text-white" : "text-black",
              )}
            >
              {title}
            </h3>
          </div>
          <div className="text-right">
            {oldPrice ? (
              <p className={cn("text-xs line-through", isSpotlight ? "text-white/38" : "text-black/36")}>
                {formatCurrency(oldPrice, currency)}
              </p>
            ) : null}
            <p
              className={cn(
                "text-xl font-semibold tracking-tight",
                isSpotlight ? "text-white" : "text-black",
              )}
              style={!isSpotlight ? { color: accent } : undefined}
            >
              {formatCurrency(price, currency)}
            </p>
          </div>
        </div>

        <div className={cn("mt-5 flex flex-wrap items-center gap-3 text-sm", isSpotlight ? "text-white/64" : "text-black/56")}>
          <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-2", isSpotlight ? "bg-white/8" : "bg-[#f4f4f4]")}>
            <UserCircle2 className="size-4" />
            <span>{authorName}</span>
          </div>
          <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-2", isSpotlight ? "bg-white/8" : "bg-[#f4f4f4]")}>
            <BookOpen className="size-4" />
            <span>{lessonCount} уроков</span>
          </div>
          {durationLabel ? (
            <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-2", isSpotlight ? "bg-white/8" : "bg-[#f4f4f4]")}>
              <Clock3 className="size-4" />
              <span>{durationLabel}</span>
            </div>
          ) : null}
          {heroBadges.slice(0, isCompact ? 1 : 2).map((badge) => (
            <div
              key={badge}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-2",
                isSpotlight ? "bg-white/8 text-white/78" : "bg-[#eef2ff] text-black/62",
              )}
            >
              {badge}
            </div>
          ))}
        </div>

        {descriptionPreview ? (
          <p className={cn("mt-4 text-sm leading-7", isSpotlight ? "text-white/68" : "text-black/56")}>
            {descriptionPreview}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <div className={cn("inline-flex items-center gap-2", isSpotlight ? "text-white/64" : "text-black/56")}>
            <Star className="size-4 fill-current text-[#f0b24d]" />
            <span>
              {averageRating
                ? `${averageRating.toFixed(1)} · ${reviewCount} отзывов`
                : "Новый курс"}
            </span>
          </div>
          <div className={cn("inline-flex items-center gap-2", isSpotlight ? "text-white/64" : "text-black/56")}>
            <Sparkles className="size-4" style={{ color: accent }} />
            <span>{formatCompactNumber(studentCount)} учеников</span>
          </div>
        </div>

        <Link
          href={`/courses/${slug}`}
          className="mt-6 inline-flex items-center justify-between rounded-full px-4 py-3 text-sm font-medium text-white transition duration-200"
          style={{ backgroundColor: accent }}
        >
          <span>Смотреть программу</span>
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </motion.article>
  );
}
