import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { storeFile } from "@/lib/file-storage";
import { isAllowedFile } from "@/lib/file-constraints";
import { enforceRateLimit, hasBodyWithinLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "upload", 20, 10 * 60 * 1000);
  if (limited) return limited;
  const access = await requireUser();
  if ("response" in access) return access.response;
  if (!hasBodyWithinLimit(req, 10 * 1024 * 1024 + 256 * 1024)) return NextResponse.json({ error: "Ukuran upload terlalu besar." }, { status: 413 });
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAllowedFile(file)) return NextResponse.json({ error: "Tipe atau ekstensi file tidak didukung." }, { status: 400 });
    const stored = await storeFile(file, { kind: "brief", userId: access.user.id! });
    return NextResponse.json({ url: `/api/files/${stored.id}`, id: stored.id, name: stored.name });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}