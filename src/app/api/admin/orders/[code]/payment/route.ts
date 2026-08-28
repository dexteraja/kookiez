import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentActionSchema } from "@/lib/validation";
import { appendOrderEvent } from "@/lib/order-events";
import { emailTemplate, sendMail } from "@/lib/mailer";

// Valid transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  confirm_dp: ["dp_pending"],          // dp_pending → dp_paid
  confirm_full: ["pending"],           // pending → paid
  confirm_settlement: ["settlement_pending"], // settlement_pending → paid
  reject: ["dp_pending", "pending", "settlement_pending"], // any pending → rejected
};

const ACTION_RESULTS: Record<string, string> = {
  confirm_dp: "dp_paid",
  confirm_full: "paid",
  confirm_settlement: "paid",
  reject: "rejected",
};

const ACTION_LABELS: Record<string, string> = {
  confirm_dp: "DP dikonfirmasi admin",
  confirm_full: "Pembayaran penuh dikonfirmasi admin",
  confirm_settlement: "Pelunasan dikonfirmasi admin",
  reject: "Pembayaran ditolak admin",
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = PaymentActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Aksi pembayaran tidak valid." }, { status: 400 });

  const code = (await params).code.toUpperCase();
  const { action, note } = parsed.data;
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });

  const currentPaymentStatus = order.paymentStatus ?? "pending";
  const validFrom = VALID_TRANSITIONS[action];
  if (!validFrom || !validFrom.includes(currentPaymentStatus)) {
    return NextResponse.json({ error: `Tidak bisa melakukan "${action}" dari status "${currentPaymentStatus}".` }, { status: 409 });
  }

  const newPaymentStatus = ACTION_RESULTS[action];
  const now = new Date();

  // Calculate paid amount
  let paidAmount = order.paidAmount ?? 0;
  let paymentAmount: number | null = null;
  if (action === "confirm_dp") {
    paymentAmount = order.dpAmount ?? order.finalAmount ?? 0;
    paidAmount += paymentAmount;
  } else if (action === "confirm_full") {
    paymentAmount = order.finalAmount ?? 0;
    paidAmount = paymentAmount;
  } else if (action === "confirm_settlement") {
    paymentAmount = order.remainingAmount ?? 0;
    paidAmount += paymentAmount;
  }

  const paymentEvent = {
    id: crypto.randomUUID(),
    action,
    amount: paymentAmount,
    previousStatus: currentPaymentStatus,
    newStatus: newPaymentStatus,
    note: note || "",
    actor: access.user.name ?? access.user.email ?? "admin",
    createdAt: now,
  };

  await db.collection("orders").updateOne(
    { code },
    {
      $set: { paymentStatus: newPaymentStatus, paidAmount, updatedAt: now },
      $push: { paymentHistory: paymentEvent },
    } as never
  );

  await appendOrderEvent(db, code, {
    type: "payment_" + action,
    label: ACTION_LABELS[action] + (note ? ` — ${note}` : ""),
    actor: "admin",
    actorName: access.user.name ?? undefined,
    metadata: { action, paymentAmount: String(paymentAmount ?? 0), newPaymentStatus },
  });

  // Send email notification
  if (order.customerEmail) {
    const statusLabel = newPaymentStatus === "paid" ? "Lunas" : newPaymentStatus === "dp_paid" ? "DP Diterima" : newPaymentStatus === "rejected" ? "Ditolak" : newPaymentStatus;
    sendMail({
      to: order.customerEmail,
      subject: `Pembayaran order ${code} — ${statusLabel}`,
      text: `Status pembayaran order ${code} diperbarui menjadi: ${statusLabel}.${note ? ` Catatan: ${note}` : ""}`,
      html: emailTemplate({
        title: "Status pembayaran diperbarui",
        preheader: `Order ${code}`,
        greeting: `Halo ${order.customerName || ""},`,
        body: `Status pembayaran order kamu telah diperbarui.${note ? `<br/><br/>Catatan: ${note}` : ""}`,
        details: [
          ["Kode order", code],
          ["Status pembayaran", statusLabel],
          ...(paymentAmount != null ? [["Nominal", `Rp ${paymentAmount.toLocaleString("id-ID")}`]] : []),
        ] as [string, string][],
        closing: newPaymentStatus === "dp_paid" && order.remainingAmount
          ? `Sisa pelunasan: Rp ${order.remainingAmount.toLocaleString("id-ID")}. Silakan lunasi setelah project selesai.`
          : "Terima kasih.",
      }),
    }).catch((err) => console.error("Payment email failed:", err));
  }

  return NextResponse.json({ ok: true, paymentStatus: newPaymentStatus, paidAmount });
}
