import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings-repository";
import { SiteSettingsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const settings = await getSiteSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = SiteSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await updateSiteSettings(parsed.data));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
