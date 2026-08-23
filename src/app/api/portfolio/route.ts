import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const value = await db.collection("site_config").findOne({ key: "portfolio" });
    return NextResponse.json({ items: value?.items ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
