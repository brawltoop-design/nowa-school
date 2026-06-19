"use client";

import { Children, type ReactNode } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

type StaggerGridProps = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
};

export function StaggerGrid({
  children,
  className,
  itemClassName,
}: StaggerGridProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={staggerContainer}
      className={cn(className)}
    >
      {Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={staggerItem}
          className={cn(itemClassName)}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
