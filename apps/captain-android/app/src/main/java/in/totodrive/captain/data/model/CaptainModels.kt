package in.totodrive.captain.data.model

import com.google.gson.annotations.SerializedName

// --- Authentication & Registration ---
data class CaptainRegisterRequest(
    val name: String,
    val phone: String,
    val vehicleNumber: String,
    val vehicleType: String = "TOTO_REGULAR",
    val pin: String,
    val city: String = "Kolkata"
)

data class CaptainLoginRequest(
    val phone: String,
    val pin: String
)

data class CaptainAuthResponse(
    val success: Boolean,
    val token: String?,
    val captain: CaptainProfile?,
    val message: String? = null
)

data class CaptainProfile(
    val id: String,
    val name: String,
    val phone: String,
    val vehicleNumber: String,
    val vehicleType: String,
    val verificationStatus: String, // "PENDING", "APPROVED", "REJECTED"
    val isOnline: Boolean,
    val rating: Double,
    val totalTrips: Int,
    val walletBalance: Double,
    val isBlocked: Boolean = false
)

// --- Document Upload & Verification ---
data class CaptainDocumentUploadRequest(
    val documentType: String, // "DRIVING_LICENSE", "VEHICLE_RC", "INSURANCE", "POLLUTION", "AADHAAR"
    val documentNumber: String,
    val documentUrl: String,
    val expiryDate: String? = null
)

data class CaptainDocumentRecord(
    val id: String,
    val captainId: String,
    val documentType: String,
    val documentNumber: String,
    val status: String, // "PENDING", "VERIFIED", "REJECTED"
    val rejectionReason: String? = null,
    val uploadedAt: String
)

// --- Online Status & Location Tracking ---
data class ToggleOnlineRequest(
    val isOnline: Boolean,
    val latitude: Double,
    val longitude: Double
)

data class ToggleOnlineResponse(
    val success: Boolean,
    val isOnline: Boolean,
    val message: String? = null
)

data class DriverLocationUpdate(
    val latitude: Double,
    val longitude: Double,
    val heading: Float? = null,
    val speed: Float? = null,
    val accuracy: Float? = null,
    val batteryLevel: Int? = null,
    val isAvailable: Boolean = true
)

// --- Ride Lifecycle Models ---
data class IncomingRideOffer(
    val rideId: String,
    val passengerId: String,
    val passengerName: String,
    val pickupAddress: String,
    val pickupLatitude: Double,
    val pickupLongitude: Double,
    val destinationAddress: String,
    val destinationLatitude: Double,
    val destinationLongitude: Double,
    val fare: Double,
    val distanceKm: Double,
    val estimatedMinutes: Int,
    val timeoutSeconds: Int = 15
)

data class AcceptRideRequest(
    val captainId: String,
    val latitude: Double,
    val longitude: Double
)

data class AcceptRideResponse(
    val success: Boolean,
    val status: String,
    val rideId: String,
    val message: String? = null
)

data class ArrivedRideRequest(
    val latitude: Double,
    val longitude: Double
)

data class StartRideRequest(
    val otp: String
)

data class CompleteRideRequest(
    val finalDistanceKm: Double? = null,
    val paymentMode: String = "ONLINE" // "ONLINE", "CASH", "WALLET"
)

data class CompleteRideResponse(
    val success: Boolean,
    val rideId: String,
    val totalFare: Double,
    val captainEarnings: Double,
    val platformFee: Double,
    val message: String? = null
)

// --- Captain Earnings & Ledger ---
data class CaptainEarningsSummary(
    val todayEarnings: Double,
    val weeklyEarnings: Double,
    val walletBalance: Double,
    val completedTripsToday: Int,
    val acceptanceRate: Double,
    val transactions: List<CaptainTransactionItem>
)

data class CaptainTransactionItem(
    val id: String,
    val amount: Double,
    val type: String, // "CREDIT", "DEBIT", "PAYOUT"
    val description: String,
    val createdAt: String
)
