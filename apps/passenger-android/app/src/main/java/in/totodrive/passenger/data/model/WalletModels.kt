package in.totodrive.passenger.data.model

import com.google.gson.annotations.SerializedName

data class WalletDetailsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("wallet") val wallet: WalletInfo,
    @SerializedName("entries") val entries: List<LedgerItem>
)

data class WalletInfo(
    @SerializedName("id") val id: String,
    @SerializedName("balance") val balance: Double,
    @SerializedName("currency") val currency: String = "INR",
    @SerializedName("status") val status: String = "active"
)

data class LedgerItem(
    @SerializedName("id") val id: String,
    @SerializedName("transactionType") val transactionType: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("balanceAfter") val balanceAfter: Double,
    @SerializedName("description") val description: String,
    @SerializedName("createdAt") val createdAt: String
)

data class CreateYouPiSessionRequest(
    @SerializedName("userId") val userId: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("rideId") val rideId: String? = null,
    @SerializedName("notes") val notes: String? = null
)

data class CreateYouPiSessionResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("session") val session: YouPiSessionInfo
)

data class YouPiSessionInfo(
    @SerializedName("id") val id: String,
    @SerializedName("orderId") val orderId: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("status") val status: String,
    @SerializedName("merchantUpiId") val merchantUpiId: String,
    @SerializedName("upiIntentUrl") val upiIntentUrl: String,
    @SerializedName("qrSvg") val qrSvg: String,
    @SerializedName("expiresAt") val expiresAt: String
)

data class SubmitUtrRequest(
    @SerializedName("sessionId") val sessionId: String,
    @SerializedName("utr") val utr: String
)

data class SubmitUtrResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("session") val session: YouPiSessionInfo?
)
