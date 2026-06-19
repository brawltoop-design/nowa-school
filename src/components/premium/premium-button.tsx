"use client";

import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const premiumButtonVariants = cva("", {
  variants: {
    tone: {
      primary:
        "border border-[#3d3bff] bg-[#3d3bff] text-white shadow-none hover:bg-[#2f2de8] hover:border-[#2f2de8]",
      secondary:
        "border border-transparent bg-[#efefef] text-foreground shadow-none hover:bg-[#e7e7e7]",
      ghost:
        "bg-transparent text-foreground hover:bg-[#f2f2f2]",
    },
  },
  defaultVariants: {
    tone: "primary",
  },
});

type PremiumButtonProps = ComponentProps<typeof Button> &
  VariantProps<typeof premiumButtonVariants>;

export function PremiumButton({
  className,
  tone,
  variant,
  ...props
}: PremiumButtonProps) {
  const resolvedTone = tone ?? "primary";
  const resolvedVariant =
    variant ??
    (resolvedTone === "primary"
      ? "default"
      : resolvedTone === "secondary"
        ? "outline"
        : "ghost");

  return (
    <Button
      variant={resolvedVariant}
      className={cn(
        "rounded-full px-5 transition duration-200 hover:scale-[1.02]",
        premiumButtonVariants({ tone: resolvedTone }),
        className,
      )}
      {...props}
    />
  );
}
