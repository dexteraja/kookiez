import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="ui-shell min-h-screen text-[#1A1A1E] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#0038FF]/10 flex items-center justify-center mx-auto mb-6">
          <Search className="w-8 h-8 text-[#0038FF]" />
        </div>

        <p className="font-mono text-xs tracking-widest text-[#0038FF] mb-3">ERROR 404</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight mb-3">
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm text-[#1A1A1E]/50 mb-8 leading-relaxed">
          Halaman yang kamu cari mungkin sudah dipindah, dihapus, atau memang belum pernah ada.
          Yuk balik lagi ke beranda.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-[#0038FF] text-white font-medium px-6 py-3 rounded-2xl hover:bg-[#0030DB] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>
          <Link
            href="/lacak"
            className="inline-flex items-center justify-center gap-2 border border-[#1A1A1E]/15 text-[#1A1A1E] font-medium px-6 py-3 rounded-2xl hover:border-[#1A1A1E]/30 transition-colors"
          >
            Lacak Pesanan
          </Link>
        </div>
      </div>
    </div>
  );
}
