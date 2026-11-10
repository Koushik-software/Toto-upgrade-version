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
    console.error("Failed to save ride in Cloud SQL:", error);
    throw new Error("Failed to persist ride record. Please try again later.", { cause: error });
  }
}

export async function getUserRides(userId: string) {
  try {
    return await db.select().from(rides).where(eq(rides.userId, userId)).orderBy(desc(rides.createdAt));
  } catch (error) {
    console.error("Failed to fetch rides from Cloud SQL:", error);
    throw new Error("Failed to retrieve rides. Please try again later.", { cause: error });
  }
}
