package in.totodrive.captain

import in.totodrive.captain.data.model.*
import in.totodrive.captain.data.repository.CaptainResult
import org.junit.Assert.*
import org.junit.Test

class CaptainAppTest {

    @Test
    fun testCaptainRegistrationModel() {
        val req = CaptainRegisterRequest(
            name = "Ramesh Mondal",
            phone = "9876543210",
            vehicleNumber = "WB-01-ET-9876",
            vehicleType = "TOTO_REGULAR",
            pin = "1234",
            city = "Kolkata"
        )

        assertEquals("Ramesh Mondal", req.name)
        assertEquals("WB-01-ET-9876", req.vehicleNumber)
        assertEquals("TOTO_REGULAR", req.vehicleType)
    }

    @Test
    fun testDocumentRecordVerificationStatus() {
        val doc = CaptainDocumentRecord(
            id = "doc_01",
            captainId = "cap_101",
            documentType = "DRIVING_LICENSE",
            documentNumber = "DL-WB-202400912",
            status = "VERIFIED",
            rejectionReason = null,
            uploadedAt = "2026-11-06T10:00:00Z"
        )

        assertEquals("VERIFIED", doc.status)
        assertNull(doc.rejectionReason)
    }

    @Test
    fun testIncomingOfferAndFeeBreakdown() {
        val offer = IncomingRideOffer(
            rideId = "ride_777",
            passengerId = "usr_45",
            passengerName = "Amit Das",
            pickupAddress = "Howrah AC Market",
            pickupLatitude = 22.585,
            pickupLongitude = 88.342,
            destinationAddress = "Burrabazar",
            destinationLatitude = 22.589,
            destinationLongitude = 88.355,
            fare = 80.0,
            distanceKm = 2.4,
            estimatedMinutes = 10
        )

        assertEquals(80.0, offer.fare, 0.01)
        assertEquals(2.4, offer.distanceKm, 0.01)

        val platformFee = offer.fare * 0.10
        val netEarnings = offer.fare - platformFee

        assertEquals(8.0, platformFee, 0.01)
        assertEquals(72.0, netEarnings, 0.01)
    }

    @Test
    fun testCaptainResultEncapsulation() {
        val success: CaptainResult<Boolean> = CaptainResult.Success(true)
        assertTrue(success is CaptainResult.Success)
        assertTrue((success as CaptainResult.Success).data)

        val err: CaptainResult<Boolean> = CaptainResult.Error("GPS signal degraded")
        assertTrue(err is CaptainResult.Error)
        assertEquals("GPS signal degraded", (err as CaptainResult.Error).message)
    }
}
