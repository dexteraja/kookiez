import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

const KEY = "portfolio";

function isAdmin(session: unknown) {
  const user = (session as { user?: { role?: string } } | null)?.user;
  return user?.role === "admin";
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { db } = await connectToDatabase();
  const value = await db.collection("site_config").findOne({ key: KEY });
  return NextResponse.json({ items: value?.items ?? [] });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!Array.isArray(body.items) || body.items.length > 50) {
      return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
    }
    const items = body.items.map((item: Record<string, unknown>) => ({
      id: String(item.id ?? crypto.randomUUID()),
      klien: String(item.klien ?? ""),
      kategori: String(item.kategori ?? ""),
      tahun: String(item.tahun ?? ""),
      span: item.span === "tall" ? "tall" : "normal",
      image: String(item.image ?? ""),
      hue: String(item.hue ?? "from-honey-500 to-mocha-700"),
      deskripsi: String(item.deskripsi ?? ""),
    }));
    const { db } = await connectToDatabase();
    await db.collection("site_config").updateOne({ key: KEY }, { $set: { key: KEY, items, updatedAt: new Date() } }, { upsert: true });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "JSON tidak dapat diproses" }, { status: 400 });
  }
}
