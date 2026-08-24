import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const access = await requireUser();
    if ("response" in access) return access.response;
    const { code } = await params;
    const { db } = await connectToDatabase();

    const order = await db.collection("orders").findOne({ code: code.toUpperCase() });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.userId !== access.user.id && access.user.role !== "admin") {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke order ini." }, { status: 403 });
    }

    const activeOrders = await db
      .collection("orders")
      .find({ status: { $in: ["pending", "progress"] } })
      .sort({ createdAt: 1 })
      .project({ code: 1, createdAt: 1 })
      .toArray();

    let position = null;
    const idx = activeOrders.findIndex((o) => o.code === order.code);
    if (idx >= 0) {
      position = idx + 1;
    }

    const settings = await db.collection("queue_settings").findOne({ key: "global" });
    const maxSlots = settings?.maxSlots ?? 9;

    return NextResponse.json({
      code: order.code,
      status: order.status,
      service: order.service,
      budgetLabel: order.budgetLabel,
      deadline: order.deadline,
      plan: order.plan,
      method: order.method,
      amount: order.amount,
      customerName: order.customerName ?? null,
      isCustom: order.isCustom,
      briefScope: order.briefScope,
      briefRefs: order.briefRefs,
      fileNames: order.fileNames,
      fileUrls: order.fileUrls ?? [],
      deliverables: order.deliverables ?? [],
      createdAt: order.createdAt,
      queuePosition: position,
      maxSlots,
      activeSlots: activeOrders.length,
      availableSlots: Math.max(0, maxSlots - activeOrders.length),
    });
  } catch (error) {
    console.error("GET /api/orders/[code] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
