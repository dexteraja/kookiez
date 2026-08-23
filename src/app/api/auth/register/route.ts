import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { hashPassword, validPassword } from "@/lib/password";

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(160), password: z.string() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validPassword(parsed.data.password)) return NextResponse.json({ error: "Nama, email, dan password minimal 8 karakter wajib diisi." }, { status: 400 });
  try {
    const { db } = await connectToDatabase();
    const email = parsed.data.email.toLowerCase();
    const users = db.collection("users");
    if (await users.findOne({ email })) return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    await users.insertOne({ email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), role: "member", createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Database belum tersedia." }, { status: 503 }); }
}
