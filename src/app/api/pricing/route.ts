import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { DEFAULT_PRICING, mergePricing } from "@/lib/pricing";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const setting = await db.collection("site_settings").findOne({ key: "pricing" });
    return NextResponse.json({ pricing: mergePricing(setting?.value ?? DEFAULT_PRICING) });
  } catch {
    return NextResponse.json({ pricing: DEFAULT_PRICING });
  }
}
