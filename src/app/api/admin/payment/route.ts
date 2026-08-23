import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPaymentSettings, savePaymentSettings } from "@/lib/auth-helpers";

export async function GET() { return NextResponse.json(await getPaymentSettings()); }
export async function PUT(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const body = await request.json();
  const number = String(body.whatsappCsNumber ?? "").replace(/[^0-9]/g, "");
  if (!number || number.length < 8) return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
  return NextResponse.json(await savePaymentSettings({ onlinePaymentEnabled: body.onlinePaymentEnabled === true, whatsappCsNumber: number }));
}
