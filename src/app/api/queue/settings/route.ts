import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UpdateQueueSettingsSchema } from "@/lib/validation";
import { sseBroadcaster } from "@/lib/sse/broadcaster";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const QUEUE_KEY = "global";

export async function GET() {
  try {
    const { db } = await connectToDatabase();

    let settings = await db.collection("queue_settings").findOne({ key: QUEUE_KEY }) as {
      key: string; maxSlots: number; note: string; createdAt: Date; updatedAt: Date;
    } | null;

    if (!settings) {
      const defaultSettings = {
        key: QUEUE_KEY,
        maxSlots: 9,
        note: "Menerima proyek baru minggu ini.",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection("queue_settings").insertOne(defaultSettings);
      settings = defaultSettings;
    }

    // Always derive capacity from orders. The cached counter can drift after retries or status changes.
    const activeOrders = await db.collection("orders").countDocuments({
      status: { $in: ["pending", "progress"] },
    });
    await db.collection("queue_settings").updateOne(
      { key: QUEUE_KEY },
      { $set: { activeSlots: activeOrders, updatedAt: new Date() } }
    );

    return NextResponse.json({
      maxSlots: settings.maxSlots,
      activeSlots: activeOrders,
      availableSlots: Math.max(0, settings.maxSlots - activeOrders),
      note: settings.note,
    });
  } catch (error) {
    console.error("GET /api/queue/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const access = await requireAdmin();
    if ("response" in access) return access.response;

    const body = await req.json();
    const parsed = UpdateQueueSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const { maxSlots, note } = parsed.data;

    const result = await db
      .collection("queue_settings")
      .findOneAndUpdate(
        { key: QUEUE_KEY },
        {
          $set: { maxSlots, note, updatedAt: new Date() },
          $setOnInsert: { key: QUEUE_KEY, createdAt: new Date() },
        },
        { upsert: true, returnDocument: "after" }
      );

    const activeOrders = await db
      .collection("orders")
      .countDocuments({ status: { $in: ["pending", "progress"] } });

    sseBroadcaster.broadcast({
      type: "slot_update",
      data: {
        maxSlots,
        activeSlots: activeOrders,
        availableSlots: Math.max(0, maxSlots - activeOrders),
        note,
      },
    });

    return NextResponse.json({
      maxSlots,
      activeSlots: activeOrders,
      availableSlots: Math.max(0, maxSlots - activeOrders),
      note,
    });
  } catch (error) {
    console.error("PUT /api/queue/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
