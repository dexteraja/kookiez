import { MongoClient, type Db, type Filter, type Collection, type Document } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = "kookiez";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  const client = await MongoClient.connect(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCollection<T extends Document = any>(name: string): Collection<T> {
  // We need the db to be initialized first
  if (!cachedDb) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return cachedDb.collection<T>(name);
}

export async function ensureIndexes() {
  const { db } = await connectToDatabase();

  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ role: 1, status: 1 });
  await db.collection("auth_events").createIndex({ email: 1, createdAt: -1 });
  await db.collection("auth_events").createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
  await db.collection("site_settings").createIndex({ key: 1 }, { unique: true });
  await db.collection("orders").createIndex({ code: 1 }, { unique: true });
  await db.collection("orders").createIndex({ userId: 1, createdAt: -1 });
  await db.collection("orders").createIndex({ customerEmail: 1, createdAt: -1 });
  await db.collection("orders").createIndex({ status: 1 });
  await db.collection("orders").createIndex({ queuePosition: 1 });
  await db.collection("orders").createIndex({ createdAt: -1 });
  await db.collection("promo_codes").createIndex({ code: 1 }, { unique: true });
  await db.collection("promo_codes").createIndex({ active: 1, startsAt: 1, expiresAt: 1 });
}
