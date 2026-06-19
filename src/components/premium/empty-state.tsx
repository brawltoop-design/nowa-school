import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PremiumCard } from "@/components/premium/premium-card";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <PremiumCard padding="lg">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#efefef] text-foreground">
        <Icon className="size-6" />
      </div>
      <div className="mt-5 space-y-2">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="max-w-md text-sm leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="mt-6">{action}</div> : null}
    </PremiumCard>
  );
}
