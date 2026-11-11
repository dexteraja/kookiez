import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="ui-shell flex min-h-screen items-center justify-center px-5 py-10 text-ink sm:px-7">
      <div className="w-full max-w-xl">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink">
            kookiez<span className="text-accent">.</span>
          </Link>
          <span className="stamp">Error / 404</span>
        </div>

        <div className="docket relative overflow-hidden p-6 sm:p-10">
          <span className="crop crop-tl" />
          <span className="crop crop-tr" />
          <span className="crop crop-bl" />
          <span className="crop crop-br" />

          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <Search className="h-5 w-5 text-accent" />
          </div>

          <p className="kicker mb-3">Halaman tidak ditemukan</p>
          <p className="font-mono text-[clamp(5rem,18vw,9rem)] font-medium leading-[0.8] tracking-[-0.08em] text-accent">
            404
          </p>
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
            Lembar ini tidak ada di docket.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Halaman yang kamu cari mungkin sudah dipindah, dihapus, atau memang belum pernah ada.
            Kembali ke beranda atau cek status pesananmu.
          </p>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Link href="/" className="btn btn-primary">
              <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
            </Link>
            <Link href="/lacak" className="btn btn-secondary">
              Lacak pesanan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>Kookiez digital creative</span>
          <span>Ref. 404 / not found</span>
        </div>
      </div>
    </main>
  );
}
