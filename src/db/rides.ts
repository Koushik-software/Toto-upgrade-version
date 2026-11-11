import { db } from './index.ts';
import { rides } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export interface InsertRideData {
  id: string;
  userId?: string;
  driverId?: string;
  driverName?: string;
  pickupName: string;
  pickupAddress?: string;
  dropoffName: string;
  dropoffAddress?: string;
  distanceKm?: string;
  fare: number;
  status: string;
  paymentMethod?: string;
  couponDiscount?: number;
}

export async function saveRide(rideData: InsertRideData) {
  if (!process.env.SQL_HOST) {
    return rideData;
  }
  try {
    const result = await db.insert(rides)
      .values(rideData)
      .onConflictDoUpdate({
        target: rides.id,
        set: {
          status: rideData.status,
          fare: rideData.fare,
          driverId: rideData.driverId,
          driverName: rideData.driverName,
          paymentMethod: rideData.paymentMethod,
        }
      })
      .returning();
    return result[0];
  } catch (error) {
    console.warn("Notice: Cloud SQL ride save skipped or offline:", error);
    return rideData;
  }
}

export async function getUserRides(userId: string) {
  if (!process.env.SQL_HOST) {
    return [];
  }
  try {
    return await db.select().from(rides).where(eq(rides.userId, userId)).orderBy(desc(rides.createdAt));
  } catch (error) {
    console.warn("Notice: Cloud SQL rides query skipped or offline:", error);
    return [];
  }
}
