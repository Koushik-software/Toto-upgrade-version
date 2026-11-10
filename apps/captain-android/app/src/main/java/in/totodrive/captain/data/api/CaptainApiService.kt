package in.totodrive.captain.data.api

import in.totodrive.captain.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface CaptainApiService {

    // --- Captain Registration & Authentication ---
    @POST("api/captains/register")
    suspend fun register(@Body request: CaptainRegisterRequest): Response<CaptainAuthResponse>

    @POST("api/captains/login")
    suspend fun login(@Body request: CaptainLoginRequest): Response<CaptainAuthResponse>

    @GET("api/captains/{id}/profile")
    suspend fun getProfile(
        @Path("id") captainId: String,
        @Header("Authorization") token: String
    ): Response<CaptainProfile>

    // --- Document Verification ---
    @POST("api/captains/{id}/documents")
    suspend fun uploadDocument(
        @Path("id") captainId: String,
        @Body request: CaptainDocumentUploadRequest,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    @GET("api/captains/{id}/documents")
    suspend fun getDocuments(
        @Path("id") captainId: String,
        @Header("Authorization") token: String
    ): Response<List<CaptainDocumentRecord>>

    // --- Online Availability & GPS Telemetry ---
    @POST("api/drivers/{id}/toggle-online")
    suspend fun toggleOnline(
        @Path("id") captainId: String,
        @Body request: ToggleOnlineRequest,
        @Header("Authorization") token: String
    ): Response<ToggleOnlineResponse>

    @POST("api/drivers/{id}/location")
    suspend fun updateLocation(
        @Path("id") captainId: String,
        @Body request: DriverLocationUpdate,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    // --- Ride Dispatch Lifecycle ---
    @POST("api/rides/{id}/accept")
    suspend fun acceptRide(
        @Path("id") rideId: String,
        @Body request: AcceptRideRequest,
        @Header("Authorization") token: String
    ): Response<AcceptRideResponse>

    @POST("api/rides/{id}/reject")
    suspend fun rejectRide(
        @Path("id") rideId: String,
        @Body request: Map<String, String>,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    @POST("api/rides/{id}/arrived")
    suspend fun markArrived(
        @Path("id") rideId: String,
        @Body request: ArrivedRideRequest,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    @POST("api/rides/{id}/start")
    suspend fun startRide(
        @Path("id") rideId: String,
        @Body request: StartRideRequest,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    @POST("api/rides/{id}/complete")
    suspend fun completeRide(
        @Path("id") rideId: String,
        @Body request: CompleteRideRequest,
        @Header("Authorization") token: String
    ): Response<CompleteRideResponse>

    // --- Earnings & History ---
    @GET("api/wallets/captain/{id}")
    suspend fun getEarnings(
        @Path("id") captainId: String,
        @Header("Authorization") token: String
    ): Response<CaptainEarningsSummary>

    @GET("api/rides")
    suspend fun getTripHistory(
        @Query("role") role: String = "driver",
        @Query("driverId") captainId: String,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>
}
