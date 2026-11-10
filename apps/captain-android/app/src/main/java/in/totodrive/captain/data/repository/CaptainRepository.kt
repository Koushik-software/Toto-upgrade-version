package in.totodrive.captain.data.repository

import in.totodrive.captain.data.api.CaptainApiService
import in.totodrive.captain.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import java.util.concurrent.TimeUnit

sealed class CaptainResult<out T> {
    data class Success<out T>(val data: T) : CaptainResult<T>()
    data class Error(val message: String, val code: String? = null) : CaptainResult<Nothing>()
    object Loading : CaptainResult<Nothing>()
}

class CaptainRepository(
    private val api: CaptainApiService,
    private val tokenProvider: () -> String?
) {

    private val authHeader: String
        get() = tokenProvider()?.let { "Bearer $it" } ?: ""

    suspend fun register(request: CaptainRegisterRequest): CaptainResult<CaptainAuthResponse> {
        return try {
            val response = api.register(request)
            if (response.isSuccessful && response.body()?.success == true) {
                CaptainResult.Success(response.body()!!)
            } else {
                CaptainResult.Error(response.body()?.message ?: "Registration failed")
            }
        } catch (e: Exception) {
            CaptainResult.Error(e.message ?: "Network error during registration")
        }
    }

    suspend fun login(phone: String, pin: String): CaptainResult<CaptainAuthResponse> {
        return try {
            val response = api.login(CaptainLoginRequest(phone, pin))
            if (response.isSuccessful && response.body()?.success == true) {
                CaptainResult.Success(response.body()!!)
            } else {
                CaptainResult.Error(response.body()?.message ?: "Invalid phone or PIN")
            }
        } catch (e: Exception) {
            CaptainResult.Error(e.message ?: "Network error during login")
        }
    }

    suspend fun toggleOnline(captainId: String, isOnline: Boolean, lat: Double, lng: Double): CaptainResult<Boolean> {
        return try {
            val response = api.toggleOnline(
                captainId,
                ToggleOnlineRequest(isOnline, lat, lng),
                authHeader
            )
            if (response.isSuccessful && response.body()?.success == true) {
                CaptainResult.Success(response.body()!!.isOnline)
            } else {
                CaptainResult.Error(response.body()?.message ?: "Failed to change online status")
            }
        } catch (e: Exception) {
            CaptainResult.Error(e.message ?: "Network error toggling online status")
        }
    }

    suspend fun updateLocation(captainId: String, update: DriverLocationUpdate): CaptainResult<Boolean> {
        return try {
            val response = api.updateLocation(captainId, update, authHeader)
            if (response.isSuccessful) {
                CaptainResult.Success(true)
            } else {
                CaptainResult.Error("Location push failed: ${response.code()}")
            }
        } catch (e: Exception) {
            CaptainResult.Error(e.message ?: "Network error updating location")
        }
    }

    suspend fun acceptRide(rideId: String, captainId: String, lat: Double, lng: Double): CaptainResult<AcceptRideResponse> {
        return try {
            val response = api.acceptRide(
                rideId,
                AcceptRideRequest(captainId = captainId, latitude = lat, longitude = lng),
                authHeader
            )
            if (response.isSuccessful && response.body()?.success == true) {
                CaptainResult.Success(response.body()!!)
            } else {
                val err = response.body()?.message ?: "Ride already accepted by another captain"
                CaptainResult.Error(err)
            }
        } catch (e: Exception) {
            CaptainResult.Error(e.message ?: "Network error accepting ride")
        }
    }

    suspend fun markArrived(rideId: String, lat: Double, lng: Double): CaptainResult<Boolean> {
        return try {
            val response = api.markArrived(rideId, ArrivedRideRequest(lat, lng), authHeader)
            if (response.isSuccessful) {
                CaptainResult.Success(true)
            } else {
                CaptainResult.Error("Failed to mark arrival. Please ensure you are within 120m of pickup.")
            }
        } catch (e: Exception) {
            CaptainResult.Error(e.message ?: "Network error marking arrival")
        }
    }

    suspend fun startRide(rideId: String, otp: String): CaptainResult<Boolean> {
        return try {
            val response = api.startRide(rideId, StartRideRequest(otp), authHeader)
            if (response.isSuccessful) {
                CaptainResult.Success(true)
            } else {
                CaptainResult.Error("Incorrect 4-digit OTP provided by passenger")
            }
        } catch (e: Exception) {
            CaptainResult.Error(e.message ?: "Network error starting ride")
        }
    }

    suspend fun completeRide(rideId: String, paymentMode: String = "ONLINE"): CaptainResult<CompleteRideResponse> {
        return try {
            val response = api.completeRide(rideId, CompleteRideRequest(paymentMode = paymentMode), authHeader)
            if (response.isSuccessful && response.body()?.success == true) {
                CaptainResult.Success(response.body()!!)
            } else {
                CaptainResult.Error(response.body()?.message ?: "Failed to complete ride")
            }
        } catch (e: Exception) {
            CaptainResult.Error(e.message ?: "Network error completing ride")
        }
    }

    suspend fun uploadDocument(
        captainId: String,
        docType: String,
        docNumber: String,
        docUrl: String
    ): CaptainResult<Boolean> {
        return try {
            val response = api.uploadDocument(
                captainId,
                CaptainDocumentUploadRequest(documentType = docType, documentNumber = docNumber, documentUrl = docUrl),
                authHeader
            )
            if (response.isSuccessful) {
                CaptainResult.Success(true)
            } else {
                CaptainResult.Error("Document upload failed")
            }
        } catch (e: Exception) {
            CaptainResult.Error(e.message ?: "Network error uploading document")
        }
    }

    /**
     * Realtime SSE dispatch stream for incoming customer ride requests
     */
    fun listenToDispatchOffers(baseUrl: String, captainId: String): Flow<String> = flow {
        val client = OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build()

        val url = "${baseUrl}api/realtime/events?role=driver&driverId=$captainId"
        val request = Request.Builder()
            .url(url)
            .addHeader("Accept", "text/event-stream")
            .build()

        val factory = EventSources.createFactory(client)
        factory.newEventSource(request, object : EventSourceListener() {
            override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
                // Incoming ride broadcast dispatch offer
            }
            override fun onFailure(eventSource: EventSource, t: Throwable?, response: okhttp3.Response?) {
                // Handle retry
            }
        })
    }.flowOn(Dispatchers.IO)
}
