export default function LearnLoadingPage() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-[2.5rem] bg-white/70" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[320px] animate-pulse rounded-[2.5rem] bg-white/70" />
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-[2rem] bg-white/70" />
          <div className="h-40 animate-pulse rounded-[2rem] bg-white/70" />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[2rem] bg-white/70"
          />
        ))}
      </div>
    </div>
  );
}
