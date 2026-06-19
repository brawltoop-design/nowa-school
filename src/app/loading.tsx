function SkeletonCard() {
  return (
    <div className="glass-panel h-40 animate-pulse bg-white/60 p-6 dark:bg-white/5">
      <div className="h-4 w-24 rounded-full bg-black/5 dark:bg-white/10" />
      <div className="mt-6 h-8 w-2/3 rounded-full bg-black/5 dark:bg-white/10" />
      <div className="mt-3 h-4 w-full rounded-full bg-black/5 dark:bg-white/10" />
      <div className="mt-2 h-4 w-4/5 rounded-full bg-black/5 dark:bg-white/10" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="app-shell page-section">
      <div className="mx-auto max-w-3xl space-y-5 text-center">
        <div className="mx-auto h-6 w-36 animate-pulse rounded-full bg-black/5 dark:bg-white/10" />
        <div className="mx-auto h-16 w-full max-w-2xl animate-pulse rounded-[2rem] bg-black/5 dark:bg-white/10" />
        <div className="mx-auto h-6 w-full max-w-xl animate-pulse rounded-full bg-black/5 dark:bg-white/10" />
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </main>
  );
}
