import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
  try {
    const { db } = await connectToDatabase();
    const orders = await db.collection("orders").find({ customerEmail: email }).sort({ createdAt: -1 }).limit(30).toArray();
    return NextResponse.json({ orders: orders.map(({ _id, ...order }) => order) });
  } catch { return NextResponse.json({ error: "Database belum tersedia." }, { status: 503 }); }
}
