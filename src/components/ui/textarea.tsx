import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[132px] w-full rounded-[1.35rem] border border-black/10 bg-[#f6f6f6] px-4 py-3 text-sm text-foreground outline-none transition duration-200 placeholder:text-muted-foreground focus:border-black/20 focus:bg-white focus:ring-2 focus:ring-black/5",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
