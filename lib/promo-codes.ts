import { connectToDatabase, ensureIndexes } from "@/lib/mongodb";

export type PromoCode = {
  _id?: string;
  code: string;
  percent: number;
  packageIds: string[];
  startsAt: Date;
  expiresAt: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function findPromoCode(code: string, packageId: string, now = new Date()) {
  const { db } = await connectToDatabase();
  await ensureIndexes();
  return db.collection<PromoCode>("promo_codes").findOne({
    code: code.trim().toUpperCase(),
    packageIds: packageId,
    active: true,
    startsAt: { $lte: now },
    expiresAt: { $gt: now },
  });
}

export async function listPromoCodes() {
  const { db } = await connectToDatabase();
  await ensureIndexes();
  return db.collection<PromoCode>("promo_codes").find({}).sort({ createdAt: -1 }).toArray();
}
