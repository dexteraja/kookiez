export interface OrderDraft {
  service: string | null;
  brief: { scope: string; refs: string };
  budget: string | null;
  deadline: string;
  updatedAt: string;
}

const DRAFT_KEY = "kookiez_order_draft";

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
