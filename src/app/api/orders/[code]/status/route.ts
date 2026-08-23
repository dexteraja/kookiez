import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UpdateOrderStatusSchema } from "@/lib/validation";
import { sseBroadcaster } from "@/lib/sse/broadcaster";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const body = await req.json();
    const parsed = UpdateOrderStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const { status } = parsed.data;

    const result = await db
      .collection("orders")
      .findOneAndUpdate(
        { code: code.toUpperCase() },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

    if (!result) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const activeOrders = await db
      .collection("orders")
      .find({ status: { $in: ["pending", "progress"] } })
      .sort({ createdAt: 1 })
      .project({ code: 1 })
      .toArray();

    const settings = await db.collection("queue_settings").findOne({ key: "global" });
    const maxSlots = settings?.maxSlots ?? 9;

    for (let i = 0; i < activeOrders.length; i++) {
      await db
        .collection("orders")
        .updateOne(
          { code: activeOrders[i].code },
          { $set: { queuePosition: i + 1 } }
        );
    }

    sseBroadcaster.broadcast({
      type: "order_status",
      data: {
        code: code.toUpperCase(),
        status,
        activeSlots: activeOrders.length,
        availableSlots: Math.max(0, maxSlots - activeOrders.length),
        maxSlots,
      },
    });

    sseBroadcaster.broadcast({
      type: "queue_update",
      data: {
        activeSlots: activeOrders.length,
        availableSlots: Math.max(0, maxSlots - activeOrders.length),
        maxSlots,
      },
    });

    return NextResponse.json({
      code: result.code,
      status: result.status,
    });
  } catch (error) {
    console.error("PATCH /api/orders/[code]/status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
