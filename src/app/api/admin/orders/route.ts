import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { auth } from "@/auth";

const QUEUE_KEY = "global";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const settings = await db.collection("queue_settings").findOne({ key: QUEUE_KEY });
    const maxSlots = settings?.maxSlots ?? 9;

    const orders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const activeSlots = await db.collection("orders").countDocuments({
      status: { $in: ["pending", "progress"] },
    });

    return NextResponse.json({
      maxSlots,
      activeSlots,
      availableSlots: Math.max(0, maxSlots - activeSlots),
      note: settings?.note ?? "",
      orders: orders.map((o) => ({
        code: o.code,
        status: o.status,
        service: o.service,
        budgetLabel: o.budgetLabel,
        deadline: o.deadline,
        plan: o.plan,
        method: o.method,
        amount: o.amount,
        isCustom: o.isCustom,
        briefScope: o.briefScope,
        briefRefs: o.briefRefs,
        fileNames: o.fileNames,
        queuePosition: o.queuePosition,
        createdAt: o.createdAt,
        customerEmail: o.customerEmail,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
