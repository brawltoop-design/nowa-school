import Link from "next/link";
import { ArrowUpRight, Clock3, PackageCheck } from "lucide-react";
import { PremiumCard } from "@/components/premium/premium-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Guide } from "@/lib/marketing";

type GuideCardProps = {
  guide: Guide;
};

export function GuideCard({ guide }: GuideCardProps) {
  return (
    <PremiumCard
      padding="lg"
      className="group flex h-full flex-col rounded-[2rem] bg-white/94 transition duration-300 hover:-translate-y-1 hover:border-black/16"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="primary">{guide.level}</Badge>
        {guide.badges.slice(0, 2).map((badge) => (
          <Badge key={badge} variant="subtle">
            {badge}
          </Badge>
        ))}
      </div>

      <div className="mt-6 flex-1">
        <p className="text-sm font-medium text-black/46">{guide.eyebrow}</p>
        <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-black">
          {guide.title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-black/58">
          {guide.description}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2 rounded-[1.3rem] bg-[#f7f8fb] px-4 py-3 text-sm text-black/62">
          <PackageCheck className="size-4 text-[#3d3bff]" />
          {guide.result}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f4] px-4 py-2.5 text-sm text-black/58">
            <Clock3 className="size-4" />
            {guide.duration}
          </span>
          <span className="text-xl font-semibold tracking-tight text-black">
            {formatCurrency(guide.price, "RUB")}
          </span>
        </div>
      </div>

      <Link
        href={`/guides/${guide.slug}`}
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition duration-200 group-hover:bg-[#3d3bff]"
      >
        Смотреть гайд
        <ArrowUpRight className="ml-2 size-4" />
      </Link>
    </PremiumCard>
  );
}
