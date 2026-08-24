import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { readFile } from "@/lib/file-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const file = await readFile((await params).id);
    if (!file) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
    return new NextResponse(new Uint8Array(file.body), { headers: { "Content-Type": file.contentType, "Content-Disposition": `attachment; filename="${String(file.filename).replace(/[^a-zA-Z0-9._-]/g, "_")}"` } });
  } catch {
    return NextResponse.json({ error: "File tidak dapat dibaca." }, { status: 404 });
  }
}
