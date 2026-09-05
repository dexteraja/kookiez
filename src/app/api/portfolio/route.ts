import { NextResponse } from "next/server";
import { listPortfolioItems } from "@/lib/portfolio-repo";

export async function GET() {
  try {
    const items = await listPortfolioItems();
    const payload = items.map((item) => ({
      id: item.id,
      judul: item.judul,
      // Nama klien disembunyikan dari publik jika ditandai sebagai samaran oleh admin.
      klien: item.klienSamaran ? "Klien Rahasia" : item.klien,
      kategori: item.kategori,
      tahun: item.createdAt.slice(0, 4),
      image: `/api/portfolio/image/${item.imageId}`,
      deskripsi: item.deskripsi,
    }));
    return NextResponse.json({ items: payload }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Gagal memuat portofolio:", err);
    return NextResponse.json({ items: [] });
  }
}
