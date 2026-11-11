/* Placeholder loading dengan bentuk yang mengikuti layout akhir. */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-ink/[0.07] ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-card/60 to-transparent" />
    </div>
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-4 ${className}`}>
      <Skeleton className="mb-3 h-32 w-full rounded-lg" />
      <Skeleton className="mb-2 h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
