import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const premiumCardVariants = cva(
  "relative w-full min-w-0 overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-none transition duration-200",
  {
    variants: {
      tone: {
        default: "",
        elevated: "bg-[#f8f8f8]",
        glass: "bg-[#f4f4f4]",
      },
      padding: {
        none: "",
        sm: "p-5",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      tone: "default",
      padding: "md",
    },
  },
);

type PremiumCardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof premiumCardVariants>;

export function PremiumCard({
  className,
  tone,
  padding,
  ...props
}: PremiumCardProps) {
  return (
    <div
      className={cn(
        premiumCardVariants({ tone, padding }),
        "hover:border-black/15",
        className,
      )}
      {...props}
    />
  );
}
