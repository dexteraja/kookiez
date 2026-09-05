import { NextResponse } from "next/server";
import { readFile } from "@/lib/file-storage";

/**
 * Endpoint PUBLIK (tanpa login) untuk menyajikan gambar karya portofolio.
 * Beda dengan /api/files/[id] yang mewajibkan login — gambar karya memang
 * harus bisa dilihat siapa saja di halaman utama.
 * Gambar disimpan di GridFS dengan metadata { kind: "portfolio" } supaya
 * hanya gambar portofolio yang bisa diakses lewat rute ini.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const file = await readFile((await params).id);
    if (!file) return NextResponse.json({ error: "Gambar tidak ditemukan." }, { status: 404 });
    const metadata = file.metadata as { kind?: string } | undefined;
    if (metadata?.kind !== "portfolio") {
      return NextResponse.json({ error: "Gambar tidak ditemukan." }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Gambar tidak dapat dibaca." }, { status: 404 });
  }
}
