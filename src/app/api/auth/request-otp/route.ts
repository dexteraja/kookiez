import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json({ error: "OTP tidak diperlukan untuk login password." }, { status: 410 });
}
