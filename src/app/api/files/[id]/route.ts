import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { readFile } from "@/lib/file-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const file = await readFile((await params).id);
    if (!file) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
    const metadata = file.metadata as { userId?: string; orderCode?: string } | undefined;
    const isAdmin = access.user.role === "admin";
    let ownsFile = metadata?.userId === access.user.id;
    if (metadata?.orderCode) {
      const { db } = await connectToDatabase();
      const order = await db.collection("orders").findOne({ code: metadata.orderCode }, { projection: { userId: 1 } });
      ownsFile = order?.userId === access.user.id;
    }
    if (!isAdmin && !ownsFile) return NextResponse.json({ error: "Anda tidak memiliki akses ke file ini." }, { status: 403 });
    return new NextResponse(new Uint8Array(file.body), { headers: { "Content-Type": file.contentType, "Content-Disposition": `attachment; filename="${String(file.filename).replace(/[^a-zA-Z0-9._-]/g, "_")}"` } });
  } catch {
    return NextResponse.json({ error: "File tidak dapat dibaca." }, { status: 404 });
  }
}
