import { Skeleton, SkeletonText } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F9F9FB]">
      {/* Navbar placeholder */}
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <div className="hidden md:flex items-center gap-7">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-9 w-32 rounded-2xl" />
      </div>

      {/* Hero placeholder */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-16">
        <Skeleton className="h-3 w-40 mb-5" />
        <Skeleton className="h-11 w-full max-w-2xl mb-3" />
        <Skeleton className="h-11 w-2/3 max-w-xl mb-6" />
        <SkeletonText lines={2} className="max-w-lg mb-9" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-44 rounded-2xl" />
          <Skeleton className="h-12 w-28 rounded-2xl" />
        </div>
      </div>

      {/* Work grid placeholder */}
      <div className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1A1A1E]/10">
        <Skeleton className="h-3 w-28 mb-2" />
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#1A1A1E]/10 overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="p-4">
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
