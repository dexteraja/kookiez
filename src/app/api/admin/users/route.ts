import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdmin, listAdmins, toggleAdmin, jsonSafe } from "@/lib/auth-helpers";

async function guard() { const session = await auth(); return session?.user?.role === "admin" && session.user.email ? session : null; }
export async function GET() { if (!(await guard())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 }); return NextResponse.json({ admins: jsonSafe(await listAdmins()) }); }
export async function POST(request: Request) { const session = await guard(); if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 }); try { const body = await request.json(); await createAdmin({ email: String(body.email), name: String(body.name ?? "Admin"), password: String(body.password) }); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuat admin" }, { status: 400 }); } }
export async function PATCH(request: Request) { const session = await guard(); if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 }); try { const body = await request.json(); await toggleAdmin(String(body.id), body.active === true, session.user.email!); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mengubah admin" }, { status: 400 }); } }
