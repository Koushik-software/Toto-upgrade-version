package in.totodrive.passenger.data.model

import com.google.gson.annotations.SerializedName

data class GeoPoint(
    @SerializedName("lat") val lat: Double,
    @SerializedName("lng") val lng: Double,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String = ""
)

data class FareCalculationRequest(
    @SerializedName("vehicleType") val vehicleType: String = "toto",
    @SerializedName("distanceKm") val distanceKm: Double,
    @SerializedName("estimatedDurationMins") val estimatedDurationMins: Int? = null,
    @SerializedName("promoCode") val promoCode: String? = null
)

data class FareCalculationResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("fare") val fare: FareBreakdown
)

data class FareBreakdown(
    @SerializedName("baseFare") val baseFare: Int,
    @SerializedName("distanceFare") val distanceFare: Double,
    @SerializedName("timeFare") val timeFare: Double,
    @SerializedName("waitingCharge") val waitingCharge: Double,
    @SerializedName("bookingFee") val bookingFee: Int,
    @SerializedName("tax") val tax: Double,
    @SerializedName("discount") val discount: Double,
    @SerializedName("finalFare") val finalFare: Int,
    @SerializedName("platformCommission") val platformCommission: Int,
    @SerializedName("driverEarnings") val driverEarnings: Int
)

data class CreateRideRequest(
    @SerializedName("userId") val userId: String,
    @SerializedName("userName") val userName: String,
    @SerializedName("userPhone") val userPhone: String,
    @SerializedName("pickup") val pickup: GeoPoint,
    @SerializedName("dropoff") val dropoff: GeoPoint,
    @SerializedName("vehicleType") val vehicleType: String = "toto",
    @SerializedName("paymentMethod") val paymentMethod: String = "cash",
    @SerializedName("promoCode") val promoCode: String? = null,
    @SerializedName("targetDriverId") val targetDriverId: String? = null
)

data class RideResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("ride") val ride: ActiveRideRecord?,
    @SerializedName("message") val message: String?,
    @SerializedName("code") val code: String?
)

data class ActiveRideRecord(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("userName") val userName: String,
    @SerializedName("userPhone") val userPhone: String,
    @SerializedName("driverId") val driverId: String?,
    @SerializedName("driverName") val driverName: String?,
    @SerializedName("driverPhone") val driverPhone: String?,
    @SerializedName("vehicleNumber") val vehicleNumber: String?,
    @SerializedName("vehicleModel") val vehicleModel: String?,
    @SerializedName("vehicleType") val vehicleType: String,
    @SerializedName("pickup") val pickup: GeoPoint,
    @SerializedName("dropoff") val dropoff: GeoPoint,
    @SerializedName("distanceKm") val distanceKm: Double,
    @SerializedName("finalFare") val finalFare: Int,
    @SerializedName("status") val status: String,
    @SerializedName("otp") val otp: String?,
    @SerializedName("paymentMethod") val paymentMethod: String,
    @SerializedName("paymentStatus") val paymentStatus: String,
    @SerializedName("driverLocation") val driverLocation: DriverLiveLocation?,
    @SerializedName("createdAt") val createdAt: String
)

data class DriverLiveLocation(
    @SerializedName("lat") val lat: Double,
    @SerializedName("lng") val lng: Double,
    @SerializedName("heading") val heading: Double = 0.0,
    @SerializedName("speed") val speed: Double = 0.0,
    @SerializedName("timestamp") val timestamp: Long = 0L
)

data class CancelRideRequest(
    @SerializedName("actor") val actor: String = "customer",
    @SerializedName("reason") val reason: String
)

data class SubmitRatingRequest(
    @SerializedName("rideId") val rideId: String,
    @SerializedName("fromUserId") val fromUserId: String,
    @SerializedName("toUserId") val toUserId: String,
    @SerializedName("fromRole") val fromRole: String = "customer",
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String? = null
)
