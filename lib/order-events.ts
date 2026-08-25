import type { Db } from "mongodb";

export type OrderEvent = {
  id: string;
  type: string;
  label: string;
  actor: "customer" | "admin" | "system";
  actorName?: string;
  createdAt: Date;
  metadata?: Record<string, string>;
};

export async function appendOrderEvent(
  db: Db,
  code: string,
  event: Omit<OrderEvent, "id" | "createdAt">
) {
  await db.collection("orders").updateOne(
    { code },
    {
      $push: {
        events: {
          ...event,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        },
      },
    } as never
  );
}
