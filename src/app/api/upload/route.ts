import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// PENTING: implementasi ini menyimpan file ke folder public/uploads di server —
// cocok untuk development lokal, TAPI tidak cocok untuk hosting serverless
// (Vercel, dll) karena filesystem-nya read-only/sementara di produksi.
// Untuk produksi asli, ganti isi handler ini dengan upload ke storage
// eksternal seperti Cloudinary, S3, atau Supabase Storage, lalu kembalikan
// URL publiknya dengan bentuk response yang sama: { url, name }.

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${safeName}`, name: file.name });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}