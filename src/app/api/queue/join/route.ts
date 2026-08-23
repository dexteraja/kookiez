import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { JoinQueueSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { sseBroadcaster } from "@/lib/sse/broadcaster";
import { auth } from "@/auth";
import { getPaymentSettings, whatsappUrl } from "@/lib/auth-helpers";

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
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`join:${ip}`, 5, 60000);

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const session = await auth();
    const customerEmail =
      (session?.user as { email?: string })?.email ?? null;

    const body = await req.json();
    const parsed = JoinQueueSchema.safeParse({
      ...body,
      customerEmail,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const data = parsed.data;

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
    if (activeCount >= maxSlots) {
      return NextResponse.json({ error: "Queue is full. No slots available." }, { status: 409 });
    }

    const reservedCount = activeCount + 1;
    const queuePosition = reservedCount;
    const orderCode = generateOrderCode();

    const paymentSettings = await getPaymentSettings();
    const orderDoc = {
      code: orderCode,
      createdAt: new Date(),
      service: data.service,
      budgetLabel: data.budgetLabel,
      deadline: data.deadline,
      plan: data.plan,
      method: data.method,
      amount: data.amount,
      isCustom: data.isCustom,
      briefScope: data.briefScope,
      briefRefs: data.briefRefs,
      fileNames: data.fileNames,
      status: "pending",
      queuePosition,
      customerEmail: data.customerEmail,
      paymentStatus: paymentSettings.onlinePaymentEnabled ? "online_pending" : "whatsapp_fallback",
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

    sseBroadcaster.broadcast({
      type: "new_order",
      data: {
        code: orderCode,
        service: data.service,
        queuePosition,
        activeSlots: updatedActiveCount,
        availableSlots: Math.max(0, maxSlots - updatedActiveCount),
        maxSlots,
      },
    });

    const customer = session?.user ? { name: session.user.name, email: customerEmail } : { email: customerEmail };
    const redirectUrl = paymentSettings.onlinePaymentEnabled ? null : whatsappUrl(orderDoc, customer, paymentSettings.whatsappCsNumber);
    return NextResponse.json(
      {
        code: orderCode,
        queuePosition,
        activeSlots: updatedActiveCount,
        availableSlots: Math.max(0, maxSlots - updatedActiveCount),
        maxSlots,
        paymentStatus: orderDoc.paymentStatus,
        whatsappUrl: redirectUrl,
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
