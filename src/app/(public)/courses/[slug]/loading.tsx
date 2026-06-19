export default function CourseLoading() {
  return (
    <div className="app-shell pb-20 pt-10 sm:pt-12 lg:pt-14">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <div className="rounded-[2.8rem] border border-black/6 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)]">
            <div className="h-4 w-32 animate-pulse rounded-full bg-black/5" />
            <div className="mt-6 flex gap-2">
              <div className="h-8 w-24 animate-pulse rounded-full bg-black/5" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-black/5" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-black/5" />
            </div>
            <div className="mt-6 h-24 w-full max-w-4xl animate-pulse rounded-[2rem] bg-black/5" />
            <div className="mt-5 h-6 w-full max-w-3xl animate-pulse rounded-full bg-black/5" />
            <div className="mt-10 grid gap-4 sm:grid-cols-4">
              <div className="h-28 animate-pulse rounded-[1.8rem] bg-black/5" />
              <div className="h-28 animate-pulse rounded-[1.8rem] bg-black/5" />
              <div className="h-28 animate-pulse rounded-[1.8rem] bg-black/5" />
              <div className="h-28 animate-pulse rounded-[1.8rem] bg-black/5" />
            </div>
          </div>

          <div className="h-[420px] animate-pulse rounded-[2.5rem] border border-black/6 bg-black/5" />
        </div>

        <div className="rounded-[2.4rem] border border-black/6 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="h-4 w-24 animate-pulse rounded-full bg-black/5" />
          <div className="mt-5 h-12 w-40 animate-pulse rounded-full bg-black/5" />
          <div className="mt-6 space-y-3">
            <div className="h-16 animate-pulse rounded-[1.4rem] bg-black/5" />
            <div className="h-16 animate-pulse rounded-[1.4rem] bg-black/5" />
            <div className="h-16 animate-pulse rounded-[1.4rem] bg-black/5" />
            <div className="h-16 animate-pulse rounded-[1.4rem] bg-black/5" />
          </div>
          <div className="mt-6 h-14 animate-pulse rounded-full bg-black/5" />
        </div>
      </div>
    </div>
  );
}
