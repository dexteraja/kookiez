import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storeImageFile, deleteFile } from "@/lib/file-storage";
import {
  deletePortfolioItem,
  insertPortfolioItem,
  isPortfolioCategory,
  listPortfolioItems,
  type PortfolioItemDoc,
} from "@/lib/portfolio-repo";

function isAdmin(session: unknown) {
  const user = (session as { user?: { role?: string } } | null)?.user;
  return user?.role === "admin";
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listPortfolioItems();
  return NextResponse.json({ items });
}

/**
 * Tambah satu karya baru lewat form (multipart/form-data):
 *   - image: File (gambar, wajib)
 *   - judul: string (judul karya)
 *   - klien: string (nama klien pemesan)
 *   - kategori: "logo" | "banner" | "poster" | "flyer" | "brosur"
 *   - klienSamaran: "true" | "false" (nama klien di atas adalah samaran)
 *   - deskripsi: string
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const formData = await req.formData();
    const judul = String(formData.get("judul") ?? "").trim();
    const klien = String(formData.get("klien") ?? "").trim();
    const kategori = String(formData.get("kategori") ?? "");
    const klienSamaran = String(formData.get("klienSamaran") ?? "false") === "true";
    const deskripsi = String(formData.get("deskripsi") ?? "").trim();
    const file = formData.get("image") as File | null;

    if (!judul || !klien) {
      return NextResponse.json({ error: "Judul dan nama klien wajib diisi." }, { status: 400 });
    }
    if (!isPortfolioCategory(kategori)) {
      return NextResponse.json({ error: "Kategori tidak valid." }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Gambar karya wajib diunggah." }, { status: 400 });
    }

    let stored;
    try {
      stored = await storeImageFile(file, { kind: "portfolio" });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mengunggah gambar." }, { status: 400 });
    }

    const newItem: PortfolioItemDoc = {
      id: crypto.randomUUID(),
      judul,
      klien,
      klienSamaran,
      kategori,
      deskripsi,
      imageId: stored.id,
      createdAt: new Date().toISOString(),
    };
    await insertPortfolioItem(newItem);
    const items = await listPortfolioItems();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Gagal menambah karya:", err);
    return NextResponse.json({ error: "Gagal menyimpan karya." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID karya tidak ditemukan." }, { status: 400 });
    const deleted = await deletePortfolioItem(id);
    if (deleted?.imageId) await deleteFile(deleted.imageId).catch(() => {});
    const items = await listPortfolioItems();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Gagal menghapus karya:", err);
    return NextResponse.json({ error: "Gagal menghapus karya." }, { status: 500 });
  }
}
