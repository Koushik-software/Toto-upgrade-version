import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email?: string, name?: string, phone?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email: email || null,
        name: name || null,
        phone: phone || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email || null,
          name: name || null,
          phone: phone || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database user sync failed:", error);
    throw new Error("Database user sync failed. Please try again later.", { cause: error });
  }
}

export async function getUserProfile(uid: string) {
  try {
    const res = await db.select().from(users).where(eq(users.uid, uid));
    return res[0] || null;
  } catch (error) {
    console.error("Failed to query user profile:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
