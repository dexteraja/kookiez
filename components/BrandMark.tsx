import Image from "next/image";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Kookiez.">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#0038FF] shadow-[0_6px_16px_rgba(0,56,255,.16)]">
        <Image src="/Kookiez.webp" alt="" width={38} height={38} className="h-full w-full object-contain" priority={compact} />
      </span>
      {!compact && <span className="font-heading text-[17px] font-semibold tracking-[-0.03em] text-[#111827]">kookiez<span className="text-[#0038FF]">.</span></span>}
    </span>
  );
}
