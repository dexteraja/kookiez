import { connectToDatabase } from "@/lib/mongodb";

export const PORTFOLIO_CATEGORIES = ["logo", "banner", "poster", "flyer", "brosur"] as const;
export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

export interface PortfolioItemDoc {
  id: string;
  judul: string;
  klien: string;
  klienSamaran: boolean;
  kategori: PortfolioCategory;
  deskripsi: string;
  imageId: string;
  createdAt: string;
}

const COLLECTION = "portfolio_items";

export function isPortfolioCategory(value: unknown): value is PortfolioCategory {
  return typeof value === "string" && (PORTFOLIO_CATEGORIES as readonly string[]).includes(value);
}

export async function listPortfolioItems(): Promise<PortfolioItemDoc[]> {
  const { db } = await connectToDatabase();
  const docs = await db.collection<PortfolioItemDoc>(COLLECTION).find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return docs;
}

export async function insertPortfolioItem(item: PortfolioItemDoc): Promise<void> {
  const { db } = await connectToDatabase();
  await db.collection<PortfolioItemDoc>(COLLECTION).insertOne(item);
}

export async function deletePortfolioItem(id: string): Promise<PortfolioItemDoc | null> {
  const { db } = await connectToDatabase();
  const doc = await db.collection<PortfolioItemDoc>(COLLECTION).findOne({ id });
  if (!doc) return null;
  await db.collection<PortfolioItemDoc>(COLLECTION).deleteOne({ id });
  return doc;
}
