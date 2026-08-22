/* ------------------------------------------------------------------ */
/*  Penyimpanan pesanan — DEMO lokal pakai localStorage.                */
/*  Untuk produksi asli: ganti semua fungsi di sini dengan panggilan   */
/*  ke API/database sungguhan (mis. lewat /api/orders + Postgres/      */
/*  Supabase/dst). Bentuk fungsinya sengaja dibuat mirip supaya        */
/*  gampang di-swap nanti tanpa ubah komponen yang memakainya.         */
/* ------------------------------------------------------------------ */

export type OrderStatus = "pending" | "progress" | "review" | "done";

export interface StoredOrder {
  code: string;
  createdAt: string;
  service: string;
  budgetLabel: string;
  deadline: string;
  plan: string;
  method: string;
  amount: number | null;
  isCustom: boolean;
  briefScope: string;
  briefRefs: string;
  fileNames: string[];
  status: OrderStatus;
  customerEmail?: string | null;
}

const STORAGE_KEY = "kookiez_orders";
const DRAFT_KEY = "kookiez_order_draft";

function readAll(): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredOrder[]) : [];
  } catch {
    return [];
  }
}

function writeAll(orders: StoredOrder[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function generateOrderCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `KKZ-${code}`;
}

export function saveOrder(order: StoredOrder) {
  const all = readAll();
  all.unshift(order);
  writeAll(all);
}

export function getOrder(code: string): StoredOrder | null {
  const all = readAll();
  return all.find((o) => o.code.toLowerCase() === code.trim().toLowerCase()) ?? null;
}

export function getAllOrders(): StoredOrder[] {
  return readAll();
}

export function updateOrderStatus(code: string, status: OrderStatus) {
  const all = readAll();
  const idx = all.findIndex((o) => o.code === code);
  if (idx >= 0) {
    all[idx].status = status;
    writeAll(all);
  }
}

export interface OrderDraft {
  service: string | null;
  brief: { scope: string; refs: string };
  budget: string | null;
  deadline: string;
  updatedAt: string;
}

export function getOrderDraft(): OrderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as OrderDraft) : null;
  } catch {
    return null;
  }
}

export function saveOrderDraft(draft: OrderDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearOrderDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}
