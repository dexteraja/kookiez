import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { code } = await params;
    const { db } = await connectToDatabase();

    const order = await db.collection("orders").findOne({ code: code.toUpperCase() });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = user ? (order.userId === user.id || order.customerEmail === user.email) : false;
    const isAdmin = user?.role === "admin";
    const hasFullAccess = isOwner || isAdmin;

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

    const baseResponse = {
      code: order.code,
      status: order.status,
      service: order.service,
      budgetLabel: order.budgetLabel,
      deadline: order.deadline,
      queuePosition: position,
      maxSlots,
      activeSlots: activeOrders.length,
      availableSlots: Math.max(0, maxSlots - activeOrders.length),
      paymentStatus: order.paymentStatus ?? "pending",
      dpAmount: order.dpAmount ?? null,
      remainingAmount: order.remainingAmount ?? null,
      paidAmount: order.paidAmount ?? 0,
    };

    if (!hasFullAccess) {
      return NextResponse.json(baseResponse);
    }

    return NextResponse.json({
      ...baseResponse,
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
      paymentHistory: order.paymentHistory ?? [],
    });
  } catch (error) {
    console.error("GET /api/orders/[code] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
