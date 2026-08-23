import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { hashPassword, validPassword } from "@/lib/password";
import { normalizeEmail } from "@/lib/users";

const createAdminSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(160), password: z.string() });

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const { db } = await connectToDatabase();
  const users = await db.collection("users").find({ role: "admin" }).sort({ createdAt: 1 }).project({ passwordHash: 0 }).toArray();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = createAdminSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validPassword(parsed.data.password)) return NextResponse.json({ error: "Data admin tidak valid." }, { status: 400 });
  const email = normalizeEmail(parsed.data.email);
  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    await db.collection("users").insertOne({ email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), role: "admin", status: "active", failedLoginCount: 0, createdAt: now, updatedAt: now });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate")) return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    return NextResponse.json({ error: "Admin gagal dibuat." }, { status: 500 });
  }
}
