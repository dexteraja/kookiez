import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { z } from "zod";
import { appendOrderEvent } from "@/lib/order-events";

const schema = z.object({ id: z.string().uuid(), status: z.enum(["accepted", "in_progress", "completed", "rejected"]) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Status revisi tidak valid." }, { status: 400 });
  const code = (await params).code.toUpperCase();
  const { db } = await connectToDatabase();
  const result = await db.collection("orders").updateOne({ code, "revisionRequests.id": parsed.data.id }, { $set: { "revisionRequests.$.status": parsed.data.status, "revisionRequests.$.updatedAt": new Date(), updatedAt: new Date() } });
  if (!result.matchedCount) return NextResponse.json({ error: "Revisi tidak ditemukan." }, { status: 404 });
  await appendOrderEvent(db, code, { type: "revision_status_changed", label: `Status revisi menjadi ${parsed.data.status}`, actor: "admin", actorName: access.user.name ?? undefined, metadata: { revisionId: parsed.data.id, status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}