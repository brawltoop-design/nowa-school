"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/premium/premium-card";
import { formatCompactNumber } from "@/lib/utils";

type CourseCardProps = {
  title: string;
  description: string;
  category: string;
  lessons: number;
  students: number;
  progress: number;
  duration: string;
  coverFromClassName: string;
  coverToClassName: string;
  href?: string;
  ctaLabel?: string;
  minimal?: boolean;
};

export function CourseCard({
  title,
  description,
  category,
  lessons,
  students,
  progress,
  duration,
  coverFromClassName,
  coverToClassName,
  href = "/learn",
  ctaLabel = "Open course",
  minimal = false,
}: CourseCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full"
    >
      <PremiumCard
        padding="none"
        className="flex h-full flex-col overflow-hidden rounded-[2rem]"
      >
        <div
          className={`relative h-52 bg-gradient-to-br ${coverFromClassName} ${coverToClassName} p-6 text-white`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.38),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,241,176,0.2),transparent_34%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <Badge className="w-fit border-white/60 bg-white text-[#1b2140] shadow-sm">
              {category}
            </Badge>
            <div>
              <p className="text-sm text-white/80">
                {minimal ? "Course" : "AI learning experience"}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h3>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-6">
          {minimal ? null : (
            <p className="text-sm leading-7 text-muted-foreground">{description}</p>
          )}

          <div
            className={`flex flex-wrap gap-3 text-sm text-muted-foreground ${
              minimal ? "mt-0" : "mt-6"
            }`}
          >
            <div className="flex items-center gap-2 rounded-full bg-[#f5f8ff] px-3 py-2">
              <BookOpen className="size-4" />
              <span>{lessons} lessons</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#f5f8ff] px-3 py-2">
              <Users className="size-4" />
              <span>{formatCompactNumber(students)} learners</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#fff6d8] px-3 py-2 text-[#564a22]">
              <Sparkles className="size-4" />
              <span>{duration}</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {minimal ? "Completion" : "Completion signal"}
              </span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#edf1f9]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-[#49b3ff]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Link
            href={href}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition duration-300 hover:text-primary"
          >
            {ctaLabel}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </PremiumCard>
    </motion.div>
  );
}
