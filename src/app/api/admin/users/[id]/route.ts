import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  if (!ObjectId.isValid(params.id) || params.id === access.user.id) return NextResponse.json({ error: "Akun tidak dapat diubah." }, { status: 400 });
  const body = await request.json().catch(() => null) as { status?: "active" | "disabled" } | null;
  if (body?.status !== "active" && body?.status !== "disabled") return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  const { db } = await connectToDatabase();
  if (body.status === "disabled") {
    const activeAdmins = await db.collection("users").countDocuments({ role: "admin", status: { $ne: "disabled" } });
    if (activeAdmins <= 1) return NextResponse.json({ error: "Admin terakhir tidak dapat dinonaktifkan." }, { status: 409 });
  }
  const result = await db.collection("users").updateOne({ _id: new ObjectId(params.id), role: "admin" }, { $set: { status: body.status, updatedAt: new Date() } });
  if (!result.matchedCount) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
