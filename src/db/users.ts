import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email?: string, name?: string, phone?: string) {
  if (!process.env.SQL_HOST) {
    return { uid, email: email || null, name: name || null, phone: phone || null };
  }
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
    console.warn("Notice: Database user sync skipped or offline:", error);
    return { uid, email: email || null, name: name || null, phone: phone || null };
  }
}

export async function getUserProfile(uid: string) {
  if (!process.env.SQL_HOST) {
    return null;
  }
  try {
    const res = await db.select().from(users).where(eq(users.uid, uid));
    return res[0] || null;
  } catch (error) {
    console.warn("Notice: Failed to query user profile from Cloud SQL:", error);
    return null;
  }
}
