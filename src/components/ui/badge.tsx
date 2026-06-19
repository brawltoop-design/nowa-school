import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium tracking-normal transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#efefef] text-foreground",
        primary:
          "border-transparent bg-[#3d3bff] text-white",
        subtle:
          "border-transparent bg-[#f4f4f4] text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
