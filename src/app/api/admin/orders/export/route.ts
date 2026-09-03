import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const { db } = await connectToDatabase();
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const status = request.nextUrl.searchParams.get("status");
  const escapedSearch = search?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = {
    ...(status && status !== "all" ? { status } : {}),
    ...(escapedSearch ? { $or: [{ code: { $regex: escapedSearch, $options: "i" } }, { service: { $regex: escapedSearch, $options: "i" } }, { customerName: { $regex: escapedSearch, $options: "i" } }, { customerEmail: { $regex: escapedSearch, $options: "i" } }] } : {}),
  };
  const orders = await db.collection("orders").find(query).sort({ createdAt: -1 }).limit(5000).project({
    _id: 0, code: 1, status: 1, service: 1, customerName: 1, customerEmail: 1,
    amount: 1, paidAmount: 1, paymentStatus: 1, deadline: 1, createdAt: 1, updatedAt: 1,
  }).toArray();
  const headers = ["Kode", "Status", "Layanan", "Customer", "Email", "Total", "Terbayar", "Status pembayaran", "Deadline", "Dibuat", "Diperbarui"];
  const rows = orders.map((order) => [
    order.code, order.status, order.service, order.customerName, order.customerEmail,
    order.amount, order.paidAmount ?? 0, order.paymentStatus ?? "pending", order.deadline,
    order.createdAt, order.updatedAt,
  ].map(csvCell).join(","));
  const csv = [headers.map(csvCell).join(","), ...rows].join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kookiez-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
