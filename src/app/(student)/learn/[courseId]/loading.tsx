export default function LearnCourseLoadingPage() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded-full bg-white/70" />
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="h-[360px] animate-pulse rounded-[2.5rem] bg-white/70" />
          <div className="h-[520px] animate-pulse rounded-[2.3rem] bg-white/70" />
        </div>
        <div className="space-y-6">
          <div className="h-[280px] animate-pulse rounded-[2.7rem] bg-white/70" />
          <div className="h-[240px] animate-pulse rounded-[2.3rem] bg-white/70" />
          <div className="h-[320px] animate-pulse rounded-[2.3rem] bg-white/70" />
        </div>
      </div>
    </div>
  );
}
