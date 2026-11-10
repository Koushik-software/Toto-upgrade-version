package in.totodrive.passenger.data.model

import com.google.gson.annotations.SerializedName

data class SendOtpRequest(
    @SerializedName("phoneNumber") val phoneNumber: String
)

data class SendOtpResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("sessionId") val sessionId: String,
    @SerializedName("message") val message: String
)

data class VerifyOtpRequest(
    @SerializedName("sessionId") val sessionId: String,
    @SerializedName("code") val code: String
)

data class VerifyOtpResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("token") val token: String?,
    @SerializedName("user") val user: PassengerProfile?
)

data class PassengerProfile(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("phone") val phone: String,
    @SerializedName("email") val email: String? = null,
    @SerializedName("walletBalance") val walletBalance: Double = 0.0,
    @SerializedName("rating") val rating: Double = 5.0,
    @SerializedName("totalRides") val totalRides: Int = 0
)

data class SupportTicketRequest(
    @SerializedName("userId") val userId: String,
    @SerializedName("userName") val userName: String,
    @SerializedName("category") val category: String,
    @SerializedName("subject") val subject: String,
    @SerializedName("description") val description: String,
    @SerializedName("priority") val priority: String = "NORMAL"
)
