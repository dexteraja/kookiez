import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function enforceRateLimit(request: Request, key: string, limit: number, windowMs = 60000) {
  const result = rateLimit(`${key}:${getClientIp(request)}`, limit, windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))) } },
  );
}

export function hasBodyWithinLimit(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return !contentLength || contentLength <= maxBytes;
}
