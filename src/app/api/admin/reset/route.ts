import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";

const RESET_CONFIRMATION = "RESET";
const applicationCollections = [
  "orders",
  "promo_codes",
  "site_settings",
  "site_config",
  "queue_settings",
  "login_otps",
  "otp_verified",
  "auth_events",
  "files.files",
  "files.chunks",
];

export async function DELETE(request: NextRequest) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const body = await request.json().catch(() => null) as { confirmation?: string } | null;
  if (body?.confirmation !== RESET_CONFIRMATION) {
    return NextResponse.json({ error: `Ketik ${RESET_CONFIRMATION} untuk mengonfirmasi.` }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const backupId = new Date().toISOString().replace(/[:.]/g, "-");
    const backupCollection = db.collection("database_backups");
    for (const collectionName of applicationCollections) {
      const documents = await db.collection(collectionName).find({}).toArray();
      for (const document of documents) await backupCollection.insertOne({ backupId, collectionName, document, createdAt: new Date() });
    }
    await backupCollection.createIndex({ backupId: 1, createdAt: -1 });
    const result: Record<string, number> = {};
    for (const collectionName of applicationCollections) {
      const deleted = await db.collection(collectionName).deleteMany({});
      result[collectionName] = deleted.deletedCount;
    }
    return NextResponse.json({ ok: true, backupId, deleted: result });
  } catch (error) {
    console.error("DELETE /api/admin/reset error:", error);
    return NextResponse.json({ error: "Database gagal direset." }, { status: 500 });
  }
}
