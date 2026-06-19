import { PremiumCard } from "@/components/premium/premium-card";

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-black/8 ${className}`}
      aria-hidden="true"
    />
  );
}

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SkeletonLine className="h-8 w-36" />
        <SkeletonLine className="h-12 w-full max-w-xl" />
        <SkeletonLine className="h-5 w-full max-w-2xl" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <PremiumCard key={index} className="rounded-[2rem]">
            <div className="flex items-start justify-between gap-4">
              <div className="w-full space-y-4">
                <SkeletonLine className="h-4 w-24" />
                <SkeletonLine className="h-9 w-32" />
                <SkeletonLine className="h-4 w-40" />
              </div>
              <div className="size-11 animate-pulse rounded-2xl bg-black/8" />
            </div>
          </PremiumCard>
        ))}
      </div>

      <PremiumCard padding="lg" className="rounded-[2.3rem]">
        <div className="space-y-4">
          <SkeletonLine className="h-8 w-48" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid gap-4 rounded-[1.4rem] border border-black/6 bg-[#fafafa] p-4 md:grid-cols-4"
            >
              <SkeletonLine className="h-5 w-full" />
              <SkeletonLine className="h-5 w-full" />
              <SkeletonLine className="h-5 w-full" />
              <SkeletonLine className="h-5 w-full" />
            </div>
          ))}
        </div>
      </PremiumCard>
    </div>
  );
}
