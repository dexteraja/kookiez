import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

const KEY = "portfolio";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // ~4MB per gambar, disimpan sebagai data URL di MongoDB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function isAdmin(session: unknown) {
  const user = (session as { user?: { role?: string } } | null)?.user;
  return user?.role === "admin";
}

interface PortfolioItem {
  id: string;
  judul: string;
  klien: string;
  kategori: string;
  tahun: string;
  span: "tall" | "normal";
  image: string;
  hue: string;
  deskripsi: string;
  createdAt: string;
}

async function getItems() {
  const { db } = await connectToDatabase();
  const value = await db.collection("site_config").findOne({ key: KEY });
  return (value?.items ?? []) as PortfolioItem[];
}

async function saveItems(items: PortfolioItem[]) {
  const { db } = await connectToDatabase();
  await db.collection("site_config").updateOne({ key: KEY }, { $set: { key: KEY, items, updatedAt: new Date() } }, { upsert: true });
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await getItems();
  return NextResponse.json({ items });
}

/**
 * Tambah satu karya baru lewat form (multipart/form-data):
 *   - image: File (gambar, wajib untuk karya baru)
 *   - judul: string (judul karya)
 *   - klien: string (nama klien pemesan)
 *   - deskripsi: string
 * Jauh lebih mudah diubah admin dibanding format JSON mentah.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const formData = await req.formData();
    const judul = String(formData.get("judul") ?? "").trim();
    const klien = String(formData.get("klien") ?? "").trim();
    const deskripsi = String(formData.get("deskripsi") ?? "").trim();
    const file = formData.get("image") as File | null;

    if (!judul || !klien) {
      return NextResponse.json({ error: "Judul dan nama klien wajib diisi." }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Gambar karya wajib diunggah." }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Format gambar harus JPG, PNG, WEBP, atau GIF." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Ukuran gambar maksimal 4 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const items = await getItems();
    const newItem: PortfolioItem = {
      id: crypto.randomUUID(),
      judul,
      klien,
      kategori: "lainnya",
      tahun: String(new Date().getFullYear()),
      span: "normal",
      image: dataUrl,
      hue: "#0038FF",
      deskripsi,
      createdAt: new Date().toISOString(),
    };
    items.unshift(newItem);
    await saveItems(items);
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
    const items = await getItems();
    const next = items.filter((item) => item.id !== id);
    await saveItems(next);
    return NextResponse.json({ items: next });
  } catch (err) {
    console.error("Gagal menghapus karya:", err);
    return NextResponse.json({ error: "Gagal menghapus karya." }, { status: 500 });
  }
}
