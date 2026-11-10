package in.totodrive.passenger.data.api

import in.totodrive.passenger.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface PassengerApiService {

    // --- Authentication ---
    @POST("api/auth/sms-gateway/send")
    suspend fun sendOtp(@Body request: SendOtpRequest): Response<SendOtpResponse>

    @POST("api/auth/sms-gateway/verify")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): Response<VerifyOtpResponse>

    @GET("api/users/me")
    suspend fun getProfile(@Header("Authorization") token: String): Response<PassengerProfile>

    @DELETE("api/users/{id}")
    suspend fun deleteAccount(
        @Path("id") userId: String,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    // --- Fare & Ride Booking ---
    @POST("api/fare/calculate")
    suspend fun calculateFare(@Body request: FareCalculationRequest): Response<FareCalculationResponse>

    @POST("api/rides/request")
    suspend fun bookRide(
        @Body request: CreateRideRequest,
        @Header("Authorization") token: String
    ): Response<RideResponse>

    @GET("api/rides/active")
    suspend fun getActiveRide(
        @Query("userId") userId: String,
        @Query("role") role: String = "customer",
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    @GET("api/rides")
    suspend fun getRideHistory(
        @Query("role") role: String = "customer",
        @Query("requesterId") userId: String,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    @POST("api/rides/{id}/cancel")
    suspend fun cancelRide(
        @Path("id") rideId: String,
        @Body request: CancelRideRequest,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    @POST("api/ratings")
    suspend fun submitRating(
        @Body request: SubmitRatingRequest,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    // --- Wallet & YouPI-PG Payments ---
    @GET("api/wallets/user/{userId}")
    suspend fun getWallet(
        @Path("userId") userId: String,
        @Header("Authorization") token: String
    ): Response<WalletDetailsResponse>

    @POST("api/payments/youpi/create-session")
    suspend fun createYouPiSession(
        @Body request: CreateYouPiSessionRequest,
        @Header("Authorization") token: String
    ): Response<CreateYouPiSessionResponse>

    @POST("api/payments/youpi/submit-utr")
    suspend fun submitUtr(
        @Body request: SubmitUtrRequest,
        @Header("Authorization") token: String
    ): Response<SubmitUtrResponse>

    @GET("api/payments/youpi/session/{sessionId}")
    suspend fun getPaymentStatus(
        @Path("sessionId") sessionId: String,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    // --- Support & Notifications ---
    @POST("api/support/tickets")
    suspend fun submitSupportTicket(
        @Body request: SupportTicketRequest,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    @GET("api/notifications")
    suspend fun getNotifications(
        @Query("recipientType") type: String = "user",
        @Query("recipientId") userId: String,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>
}
