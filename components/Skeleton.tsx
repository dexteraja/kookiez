/* ------------------------------------------------------------------ */
/*  Skeleton placeholder — dipakai saat data/konten masih dimuat        */
/*  (mis. koneksi lambat), biar nggak nampilin layar kosong.            */
/*  Style-nya nyamain kayak website besar pada umumnya: blok abu-abu   */
/*  dengan animasi "shimmer" pelan.                                    */
/* ------------------------------------------------------------------ */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#1A1A1E]/8 relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
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
    <div className={`rounded-xl border border-[#1A1A1E]/10 p-4 ${className}`}>
      <Skeleton className="h-32 w-full mb-3" />
      <Skeleton className="h-3 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}