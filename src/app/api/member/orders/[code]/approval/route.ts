import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { appendOrderEvent } from "@/lib/order-events";
import { z } from "zod";

const ApprovalSchema = z.object({
  action: z.enum(["approved", "revision_requested"]),
  message: z.string().trim().max(2000).optional().default(""),
  deliverableId: z.string().trim().min(1).max(100),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const parsed = ApprovalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Persetujuan project tidak valid." }, { status: 400 });

  const code = (await params).code.toUpperCase();
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code, $or: [{ userId: access.user.id }, { customerEmail: access.user.email }] });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  const deliverables = Array.isArray(order.deliverables) ? order.deliverables : [];
  const deliverable = deliverables.find((item) => String((item as { id?: string }).id) === parsed.data.deliverableId) as { id?: string; approvalStatus?: string } | undefined;
  if (!deliverable) return NextResponse.json({ error: "File project tidak ditemukan." }, { status: 404 });

  const now = new Date();
  await db.collection("orders").updateOne(
    { _id: order._id, "deliverables.id": parsed.data.deliverableId },
    {
      $set: {
        "deliverables.$.approvalStatus": parsed.data.action,
        "deliverables.$.approvalMessage": parsed.data.message,
        "deliverables.$.approvedAt": now,
        updatedAt: now,
        status: parsed.data.action === "approved" ? "done" : "review",
      },
    } as never
  );
  await appendOrderEvent(db, code, {
    type: parsed.data.action,
    label: parsed.data.action === "approved" ? "Customer menyetujui hasil project" : "Customer meminta revisi hasil project",
    actor: "customer",
    actorName: order.customerName,
    metadata: { deliverableId: parsed.data.deliverableId, message: parsed.data.message },
  });
  return NextResponse.json({ ok: true, action: parsed.data.action });
}
