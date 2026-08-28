import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { JoinQueueSchema } from "@/lib/validation";
import { sseBroadcaster } from "@/lib/sse/broadcaster";
import { requireUser } from "@/lib/auth-helpers";
import { getSiteSettings } from "@/lib/site-settings-repository";
import { DEFAULT_PRICING, mergePricing, calculateDiscountedAmount } from "@/lib/pricing";
import { findPromoCode } from "@/lib/promo-codes";
import { emailTemplate, sendMail } from "@/lib/mailer";
import { appendOrderEvent } from "@/lib/order-events";
import { ObjectId } from "mongodb";
import { enforceRateLimit } from "@/lib/security";

function generateOrderCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KKZ-${code}`;
}

export async function POST(req: NextRequest) {
  try {
    const limited = enforceRateLimit(req, "join", 5, 60 * 1000);
    if (limited) return limited;
    const access = await requireUser();
    if ("response" in access) return access.response;
    const customerEmail = access.user.email;
    if (!customerEmail) return NextResponse.json({ error: "Email akun tidak tersedia." }, { status: 401 });
    const userId = access.user.id;

    const body = await req.json();
    const parsed = JoinQueueSchema.safeParse({
      ...body,
      customerEmail,
      idempotencyKey: body?.idempotencyKey ?? req.headers.get("x-idempotency-key") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const data = parsed.data;
    if (data.fileUrls.length !== data.fileNames.length && data.fileUrls.length > 0) {
      return NextResponse.json({ error: "Lampiran belum siap. Silakan unggah ulang file yang bermasalah." }, { status: 400 });
    }
    if (data.fileUrls.length > 0) {
      const fileIds = data.fileUrls.map((fileUrl) => fileUrl.split("/").pop() ?? "");
      if (fileIds.some((fileId) => !ObjectId.isValid(fileId))) {
        return NextResponse.json({ error: "Referensi lampiran tidak valid." }, { status: 400 });
      }
      const ownedFiles = await db.collection("files.files").countDocuments({
        _id: { $in: fileIds.map((fileId) => new ObjectId(fileId)) },
        "metadata.userId": userId,
        "metadata.kind": "brief",
      });
      if (ownedFiles !== fileIds.length) {
        return NextResponse.json({ error: "Sebagian lampiran tidak dapat diverifikasi. Silakan unggah ulang." }, { status: 400 });
      }
    }
    const siteSettings = await getSiteSettings();
    const pricingSetting = await db.collection("site_settings").findOne({ key: "pricing" });
    const pricing = mergePricing(pricingSetting?.value ?? DEFAULT_PRICING);
    const packagePricing = pricing[data.packageId as keyof typeof pricing];
    const packagePromoPercent = packagePricing?.promoPercent ?? 0;
    let promoCodePercent = 0;
    const normalizedPromoCode = data.promoCode.toUpperCase();
    if (normalizedPromoCode) {
      if (!packagePricing || packagePricing.base === null) return NextResponse.json({ error: "Kode promo tidak berlaku untuk paket ini." }, { status: 400 });
      const promo = await findPromoCode(normalizedPromoCode, data.packageId);
      if (!promo) return NextResponse.json({ error: "Kode promo tidak berlaku atau sudah kedaluwarsa." }, { status: 400 });
      promoCodePercent = promo.percent;
    }
    const priceSnapshot = packagePricing?.base == null ? null : calculateDiscountedAmount(packagePricing.base, packagePromoPercent, promoCodePercent, data.plan);
    const finalAmount = priceSnapshot?.finalAmount ?? null;

    const settingsCollection = db.collection("queue_settings");
    const ordersCollection = db.collection("orders");
    let settings = await settingsCollection.findOne({ key: "global" });
    if (!settings) {
      await settingsCollection.updateOne(
        { key: "global" },
        { $setOnInsert: { key: "global", maxSlots: 9, activeSlots: 0, note: "" } },
        { upsert: true }
      );
      settings = await settingsCollection.findOne({ key: "global" });
    }
    const maxSlots = settings?.maxSlots ?? 9;
    const activeCount = await ordersCollection.countDocuments({
      status: { $in: ["pending", "progress"] },
    });
    if (data.idempotencyKey) {
      const existing = await ordersCollection.findOne({ idempotencyKey: data.idempotencyKey, userId });
      if (existing) {
        return NextResponse.json({
          code: existing.code,
          paymentRoute: existing.paymentRoute ?? (siteSettings.onlinePaymentEnabled ? "online_pending" : "whatsapp_fallback"),
          whatsappUrl: existing.whatsappUrl,
          queuePosition: existing.queuePosition,
          activeSlots: activeCount,
          availableSlots: Math.max(0, maxSlots - activeCount),
          maxSlots,
        }, { status: 200 });
      }
    }
    if (activeCount >= maxSlots) {
      return NextResponse.json({ error: "Queue is full. No slots available." }, { status: 409 });
    }

    const reservedCount = activeCount + 1;
    const queuePosition = reservedCount;
    const orderCode = generateOrderCode();
    const whatsappText = [
      siteSettings.whatsappFallbackMessage,
      "",
      `Kode order: ${orderCode}`,
      `Nama: ${data.customerName}`,
      `Email: ${customerEmail}`,
      "Nomor member: -",
      `Layanan: ${data.service}`,
      `Paket: ${data.budgetLabel || "-"}`,
      `Deadline: ${data.deadline || "Fleksibel"}`,
      `Nominal: ${finalAmount == null ? "Custom" : finalAmount}`,
      `Promo: ${normalizedPromoCode || "-"}`,
      `Rencana pembayaran: ${data.plan}`,
      `Metode: ${data.method}`,
      `Brief: ${data.briefScope}`,
      `Referensi: ${data.briefRefs || "-"}`,
      `File: ${data.fileNames.length ? data.fileNames.join(", ") : "-"}`,
    ].join("\n");
    const whatsappUrl = `https://wa.me/${siteSettings.whatsappCsNumber}?text=${encodeURIComponent(whatsappText)}`;

    const orderDoc = {
      code: orderCode,
      createdAt: new Date(),
      service: data.service,
      budgetLabel: data.budgetLabel,
      deadline: data.deadline,
      plan: data.plan,
      method: data.method,
      amount: finalAmount,
      baseAmount: priceSnapshot?.subtotal ?? null,
      subtotal: priceSnapshot?.subtotal ?? null,
      discountAmount: priceSnapshot?.discountAmount ?? 0,
      finalAmount,
      dpAmount: data.plan === "deposit" ? finalAmount : null,
      remainingAmount: data.plan === "deposit" && priceSnapshot ? (priceSnapshot.subtotal - priceSnapshot.discountAmount - (finalAmount ?? 0)) : null,
      paidAmount: 0,
      paymentHistory: [],
      packagePromoPercent,
      promoCode: normalizedPromoCode || null,
      promoCodePercent,
      isCustom: data.isCustom,
      packageId: data.packageId,
      customerName: data.customerName,
      briefScope: data.briefScope,
      briefRefs: data.briefRefs,
      fileNames: data.fileNames,
      fileUrls: data.fileUrls,
      status: "pending",
      paymentRoute: siteSettings.onlinePaymentEnabled ? "online_pending" : "whatsapp_fallback",
      paymentStatus: data.plan === "deposit" ? "dp_pending" : "pending",
      queuePosition,
      customerEmail: data.customerEmail,
      userId,
      idempotencyKey: data.idempotencyKey,
      whatsappUrl,
      events: [{ id: crypto.randomUUID(), type: "order_created", label: "Order dibuat", actor: "system", createdAt: new Date() }],
    };
    try {
      await ordersCollection.insertOne(orderDoc);
    } catch (insertError) {
      await settingsCollection.updateOne({ key: "global" }, { $inc: { activeSlots: -1 } });
      throw insertError;
    }

    // Recount after the insert so every client receives the same source-of-truth value.
    const updatedActiveCount = await ordersCollection.countDocuments({
      status: { $in: ["pending", "progress"] },
    });
    await settingsCollection.updateOne(
      { key: "global" },
      { $set: { activeSlots: updatedActiveCount, updatedAt: new Date() } }
    );

    sendMail({
      to: customerEmail,
      subject: `Order ${orderCode} diterima - Kookiez`,
      text: `Halo ${data.customerName}, order ${orderCode} sudah diterima. Total: ${finalAmount == null ? "Custom" : finalAmount}.`,
      html: emailTemplate({ title: "Order berhasil diterima", preheader: `Order ${orderCode}`, greeting: `Halo ${data.customerName}, terima kasih sudah mempercayakan project kamu kepada Kookiez.`, body: "Order kamu sudah tercatat dan akan segera kami review.", details: [["Kode order", orderCode], ["Layanan", data.service], ["Budget", data.budgetLabel || "Custom"], ["Total", finalAmount == null ? "Custom" : String(finalAmount)], ["Tenggat", data.deadline || "Fleksibel"]], closing: "Simpan kode order ini untuk melacak progres project kamu." }),
    }).catch((error) => console.error("Order confirmation email failed:", error));

    sseBroadcaster.broadcast({
      type: "new_order",
      data: {
        code: orderCode,
        service: data.service,
        queuePosition,
        activeSlots: updatedActiveCount,
        availableSlots: Math.max(0, maxSlots - updatedActiveCount),
        maxSlots,
        paymentRoute: orderDoc.paymentRoute,
        whatsappUrl: orderDoc.paymentRoute === "whatsapp_fallback" ? whatsappUrl : undefined,
      },
    });

    return NextResponse.json(
      {
        code: orderCode,
        queuePosition,
        activeSlots: updatedActiveCount,
        availableSlots: Math.max(0, maxSlots - updatedActiveCount),
        maxSlots,
        paymentRoute: orderDoc.paymentRoute,
        whatsappUrl: orderDoc.paymentRoute === "whatsapp_fallback" ? whatsappUrl : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/queue/join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
