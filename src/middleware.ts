import { NextResponse, type NextRequest } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/") || !MUTATING_METHODS.has(request.method) || request.nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.next();
  try {
    if (new URL(origin).origin !== request.nextUrl.origin) return NextResponse.json({ error: "Origin request tidak diizinkan." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Origin request tidak valid." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
