import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({ onlinePaymentEnabled: settings.onlinePaymentEnabled });
  } catch {
    return NextResponse.json({ onlinePaymentEnabled: false });
  }
}
