import { Skeleton, SkeletonText } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="ui-shell min-h-screen">
      <div className="mx-auto flex h-[68px] max-w-page items-center justify-between border-b border-line px-5 sm:px-7">
        <Skeleton className="h-6 w-24" />
        <div className="hidden items-center gap-6 md:flex">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      <div className="mx-auto grid max-w-page gap-12 px-5 pb-16 pt-28 sm:px-7 lg:grid-cols-[1.06fr_.94fr] lg:pt-36">
        <div>
          <Skeleton className="mb-5 h-3 w-40" />
          <Skeleton className="mb-3 h-14 w-full max-w-xl" />
          <Skeleton className="mb-6 h-14 w-4/5 max-w-lg" />
          <SkeletonText lines={2} className="max-w-md" />
          <div className="mt-8 flex gap-3">
            <Skeleton className="h-11 w-40 rounded-lg" />
            <Skeleton className="h-11 w-32 rounded-lg" />
          </div>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="mb-2 h-5 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden min-h-[27rem] items-center justify-center lg:flex">
          <Skeleton className="h-80 w-64 rotate-2 rounded-lg" />
        </div>
      </div>

      <div className="mx-auto max-w-page border-t border-line px-5 py-16 sm:px-7 sm:py-20">
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-8 h-9 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-line bg-card p-5">
              <Skeleton className="mb-8 h-9 w-9 rounded-lg" />
              <Skeleton className="mb-2 h-5 w-2/3" />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
