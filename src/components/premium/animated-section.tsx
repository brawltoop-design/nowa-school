"use client";

import type { ReactNode } from "react";
import type { HTMLMotionProps, Variants } from "framer-motion";
import { motion } from "framer-motion";
import { slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

type AnimatedSectionProps = Omit<
  HTMLMotionProps<"section">,
  "children" | "variants"
> & {
  children: ReactNode;
  className?: string;
  variants?: Variants;
};

export function AnimatedSection({
  children,
  className,
  variants = slideUp,
  ...props
}: AnimatedSectionProps) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.section>
  );
}
