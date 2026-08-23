import { NextResponse } from "next/server";
import { auth, type Role } from "@/auth";

export type AuthenticatedUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: Role;
};

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as AuthenticatedUser;
}

export async function requireUser(): Promise<
  { user: AuthenticatedUser } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user?.email || !user.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

export async function requireAdmin(): Promise<
  { user: AuthenticatedUser } | { response: NextResponse }
> {
  const result = await requireUser();
  if ("response" in result) return result;
  if (result.user.role !== "admin") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}
