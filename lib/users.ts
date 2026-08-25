import { type Collection, type ObjectId } from "mongodb";
import { connectToDatabase, ensureIndexes } from "@/lib/mongodb";
import { hashPassword, verifyPassword } from "@/lib/password";

export type UserRole = "member" | "admin";
export type UserStatus = "active" | "disabled";

export type UserRecord = {
  _id?: ObjectId;
  email: string;
  name: string;
  passwordHash?: string;
  role: UserRole;
  status: UserStatus;
  failedLoginCount: number;
  lockoutUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function usersCollection(): Promise<Collection<UserRecord>> {
  const { db } = await connectToDatabase();
  await ensureIndexes();
  return db.collection<UserRecord>("users");
}

export async function getUserByEmail(email: string) {
  return (await usersCollection()).findOne({ email: normalizeEmail(email) });
}

export async function bootstrapAdminIfNeeded() {
  const emails = (process.env.AUTH_ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  const password = process.env.AUTH_ADMIN_PASSWORD;
  if (!emails.length || !password) return;

  const users = await usersCollection();
  if (await users.findOne({ role: "admin" })) return;
  const passwordHash = await hashPassword(password);
  const now = new Date();
  for (const email of emails) {
    await users.updateOne(
      { email },
      {
        $set: { name: email.split("@")[0], role: "admin", status: "active", passwordHash, updatedAt: now },
        $setOnInsert: { email, failedLoginCount: 0, createdAt: now },
      },
      { upsert: true },
    );
  }
}

export async function verifyUserPassword(email: string, password: string) {
  const users = await usersCollection();
  const user = await users.findOne({ email: normalizeEmail(email) });
  const { db } = await connectToDatabase();
  const recordAuthEvent = (event: string) => db.collection("auth_events").insertOne({ email: normalizeEmail(email), event, createdAt: new Date() }).catch(() => undefined);
  if (!user || user.status === "disabled" || !user.passwordHash) {
    await recordAuthEvent("login_failed");
    return null;
  }
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    await recordAuthEvent("login_blocked_lockout");
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    const lockoutUntil = failedLoginCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : undefined;
    await users.updateOne({ _id: user._id }, { $set: { failedLoginCount, ...(lockoutUntil ? { lockoutUntil } : {}), updatedAt: new Date() } });
    await recordAuthEvent(lockoutUntil ? "login_failed_lockout" : "login_failed");
    return null;
  }
  await users.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lastLoginAt: new Date(), updatedAt: new Date() }, $unset: { lockoutUntil: "" } });
  await recordAuthEvent("login_success");
  return user;
}
