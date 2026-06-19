import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-sm text-foreground outline-none transition duration-200 placeholder:text-muted-foreground focus:border-black/20 focus:bg-white focus:ring-2 focus:ring-black/5",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
