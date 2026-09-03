import type { Document, Filter } from "mongodb";

export function orderOwnerFilter(userId?: string | null, email?: string | null): Filter<Document> {
  const filters: Filter<Document>[] = [];
  if (userId) filters.push({ userId });
  if (email) filters.push({ customerEmail: email });
  return { $or: filters };
}

export function ownsOrder(order: Document | null, userId: string, email: string) {
  return Boolean(order && (order.userId === userId || order.customerEmail === email));
}
