import type { LucideIcon } from "lucide-react";
import { PremiumCard } from "@/components/premium/premium-card";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
};

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: StatCardProps) {
  return (
    <PremiumCard className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="space-y-1">
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            {description ? (
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#efefef] text-foreground">
          <Icon className="size-5" />
        </div>
      </div>
    </PremiumCard>
  );
}
