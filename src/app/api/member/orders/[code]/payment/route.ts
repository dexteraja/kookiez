import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { appendOrderEvent } from "@/lib/order-events";
import { sseBroadcaster } from "@/lib/sse/broadcaster";

const PaymentSubmissionSchema = z.object({
  action: z.enum(["submit_dp", "submit_full", "submit_settlement"]),
  note: z.string().trim().min(1, "Catatan pembayaran wajib diisi.").max(500),
});

const VALID_STATUSES: Record<string, string> = {
  submit_dp: "dp_pending",
  submit_full: "pending",
  submit_settlement: "settlement_pending",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireUser();
  if ("response" in access) return access.response;

  const parsed = PaymentSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data konfirmasi pembayaran tidak valid." }, { status: 400 });

  const code = (await params).code.toUpperCase();
  const { action, note } = parsed.data;
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code, userId: access.user.id });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });

  const currentStatus = order.paymentStatus ?? "pending";
  if (VALID_STATUSES[action] !== currentStatus) {
    return NextResponse.json({ error: "Order belum berada pada tahap pembayaran ini." }, { status: 409 });
  }

  const now = new Date();
  const submission = {
    id: crypto.randomUUID(),
    action,
    amount: action === "submit_dp" ? order.dpAmount ?? order.finalAmount ?? 0 : action === "submit_settlement" ? order.remainingAmount ?? 0 : order.finalAmount ?? 0,
    previousStatus: currentStatus,
    newStatus: currentStatus,
    note,
    actor: "customer",
    createdAt: now,
  };

  await db.collection("orders").updateOne(
    { _id: order._id, paymentStatus: currentStatus },
    { $push: { paymentHistory: submission }, $set: { paymentSubmittedAt: now, updatedAt: now } } as never,
  );
  await appendOrderEvent(db, code, {
    type: "payment_submitted",
    label: "Customer mengirim konfirmasi pembayaran",
    actor: "customer",
    actorName: order.customerName,
    metadata: { action, note },
  });
  sseBroadcaster.broadcast({ type: "payment_update", data: { code, paymentStatus: currentStatus } });

  return NextResponse.json({ ok: true, submission });
}
