import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { orderOwnerFilter } from "@/lib/order-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const { db } = await connectToDatabase();
    const orders = await db.collection("orders").find(orderOwnerFilter(access.user.id, access.user.email)).sort({ createdAt: -1 }).limit(50).project({
      _id: 0, code: 1, status: 1, service: 1, budgetLabel: 1, deadline: 1,
      plan: 1, method: 1, amount: 1, isCustom: 1, paymentRoute: 1,
      paymentStatus: 1, queuePosition: 1, createdAt: 1, updatedAt: 1,
      deliverables: 1, revisionRequests: 1, events: 1, fileUrls: 1,
      dpAmount: 1, remainingAmount: 1, paidAmount: 1, paymentHistory: 1,
    }).toArray();
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
