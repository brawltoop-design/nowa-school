function CatalogCardSkeleton() {
  return (
    <div className="rounded-[2rem] border border-black/6 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
      <div className="h-56 animate-pulse rounded-[1.6rem] bg-black/5" />
      <div className="mt-5 h-4 w-20 animate-pulse rounded-full bg-black/5" />
      <div className="mt-4 h-10 w-3/4 animate-pulse rounded-[1rem] bg-black/5" />
      <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-black/5" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-black/5" />
      <div className="mt-6 h-12 w-full animate-pulse rounded-full bg-black/5" />
    </div>
  );
}

export default function CoursesLoading() {
  return (
    <div className="pb-20">
      <section className="bg-black pb-14 text-white">
        <div className="app-shell pt-10 sm:pt-12 lg:pt-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="h-4 w-44 animate-pulse rounded-full bg-white/10" />
              <div className="mt-5 h-24 w-full max-w-4xl animate-pulse rounded-[2rem] bg-white/10" />
              <div className="mt-5 h-6 w-full max-w-2xl animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="rounded-[2.2rem] border border-white/10 bg-white/5 p-8">
              <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="mt-5 h-10 w-24 animate-pulse rounded-full bg-white/10" />
              <div className="mt-5 space-y-3">
                <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
                <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="app-shell -mt-10">
        <div className="rounded-[2.5rem] border border-black/6 bg-white p-8 shadow-[0_26px_90px_rgba(15,23,42,0.08)]">
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="h-14 animate-pulse rounded-[1.3rem] bg-black/5 lg:col-span-2" />
            <div className="h-14 animate-pulse rounded-[1.3rem] bg-black/5" />
            <div className="h-14 animate-pulse rounded-[1.3rem] bg-black/5" />
            <div className="h-14 animate-pulse rounded-[1.3rem] bg-black/5" />
          </div>
        </div>
      </section>

      <section className="app-shell page-section pb-0">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <CatalogCardSkeleton />
          <CatalogCardSkeleton />
          <CatalogCardSkeleton />
        </div>
      </section>
    </div>
  );
}
