package in.totodrive.passenger

import in.totodrive.passenger.data.model.*
import in.totodrive.passenger.data.repository.NetworkResult
import org.junit.Assert.*
import org.junit.Test

class PassengerAppTest {

    @Test
    fun testFareCalculationModel() {
        val breakdown = FareBreakdown(
            baseFare = 20.0,
            distanceFare = 35.0,
            timeFare = 5.0,
            surgeMultiplier = 1.0,
            discount = 10.0,
            totalFare = 50.0,
            distanceKm = 3.5,
            durationMin = 12
        )

        assertEquals(50.0, breakdown.totalFare, 0.01)
        assertEquals(3.5, breakdown.distanceKm, 0.01)
        assertTrue(breakdown.discount > 0)
    }

    @Test
    fun testActiveRideStateTransition() {
        val ride = ActiveRideRecord(
            id = "ride_101",
            status = "REQUESTED",
            passengerId = "usr_001",
            pickupAddress = "Howrah Station",
            pickupLatitude = 22.585,
            pickupLongitude = 88.342,
            destinationAddress = "Park Street",
            destinationLatitude = 22.553,
            destinationLongitude = 88.351,
            fare = 60.0,
            distanceKm = 4.2,
            otp = "4821"
        )

        assertEquals("REQUESTED", ride.status)
        assertEquals("4821", ride.otp)
        assertNull(ride.captainId)

        val acceptedRide = ride.copy(status = "ACCEPTED", captainId = "drv_live_a")
        assertEquals("ACCEPTED", acceptedRide.status)
        assertEquals("drv_live_a", acceptedRide.captainId)
    }

    @Test
    fun testYouPiPaymentSessionModel() {
        val session = YouPiSessionInfo(
            sessionId = "yupi_sess_999",
            paymentUrl = "upi://pay?pa=totodrive@upi&pn=TotoDrive&am=100.00",
            qrData = "upi://pay?pa=totodrive@upi&pn=TotoDrive&am=100.00",
            amount = 100.0,
            status = "PENDING",
            expiresAt = "2026-11-06T12:00:00Z"
        )

        assertEquals(100.0, session.amount, 0.01)
        assertEquals("PENDING", session.status)
        assertTrue(session.paymentUrl.startsWith("upi://"))
    }

    @Test
    fun testNetworkResultEncapsulation() {
        val success: NetworkResult<String> = NetworkResult.Success("AUTH_TOKEN_XYZ")
        assertTrue(success is NetworkResult.Success)
        assertEquals("AUTH_TOKEN_XYZ", (success as NetworkResult.Success).data)

        val error: NetworkResult<String> = NetworkResult.Error("Network Timeout", "504")
        assertTrue(error is NetworkResult.Error)
        assertEquals("504", (error as NetworkResult.Error).code)
    }
}
