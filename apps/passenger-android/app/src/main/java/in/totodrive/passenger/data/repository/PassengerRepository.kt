package in.totodrive.passenger.data.repository

import in.totodrive.passenger.data.api.PassengerApiService
import in.totodrive.passenger.data.model.*
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

sealed class NetworkResult<out T> {
    data class Success<out T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val code: String? = null) : NetworkResult<Nothing>()
    object Loading : NetworkResult<Nothing>()
}

class PassengerRepository(
    private val api: PassengerApiService,
    private val tokenProvider: () -> String?
) {

    private val authHeader: String
        get() = tokenProvider()?.let { "Bearer $it" } ?: ""

    suspend fun calculateFare(
        vehicleType: String,
        distanceKm: Double,
        promoCode: String? = null
    ): NetworkResult<FareBreakdown> {
        return try {
            val response = api.calculateFare(
                FareCalculationRequest(
                    vehicleType = vehicleType,
                    distanceKm = distanceKm,
                    promoCode = promoCode
                )
            )
            if (response.isSuccessful && response.body()?.success == true) {
                NetworkResult.Success(response.body()!!.fare)
            } else {
                NetworkResult.Error("Failed to calculate fare: ${response.message()}")
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error calculating fare")
        }
    }

    suspend fun bookRide(request: CreateRideRequest): NetworkResult<ActiveRideRecord> {
        return try {
            val response = api.bookRide(request, authHeader)
            if (response.isSuccessful && response.body()?.success == true && response.body()?.ride != null) {
                NetworkResult.Success(response.body()!!.ride!!)
            } else {
                val err = response.body()?.message ?: response.errorBody()?.string() ?: "Booking rejected"
                NetworkResult.Error(err, response.body()?.code)
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error booking ride")
        }
    }

    suspend fun cancelRide(rideId: String, reason: String): NetworkResult<Boolean> {
        return try {
            val response = api.cancelRide(rideId, CancelRideRequest(reason = reason), authHeader)
            if (response.isSuccessful) {
                NetworkResult.Success(true)
            } else {
                NetworkResult.Error("Failed to cancel ride")
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error cancelling ride")
        }
    }

    suspend fun createPaymentSession(amount: Double, rideId: String?): NetworkResult<YouPiSessionInfo> {
        return try {
            val userId = "user" // resolved via token context
            val response = api.createYouPiSession(
                CreateYouPiSessionRequest(userId = userId, amount = amount, rideId = rideId),
                authHeader
            )
            if (response.isSuccessful && response.body()?.success == true) {
                NetworkResult.Success(response.body()!!.session)
            } else {
                NetworkResult.Error("Failed to initiate payment session")
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error initiating payment")
        }
    }

    suspend fun submitUtr(sessionId: String, utr: String): NetworkResult<YouPiSessionInfo> {
        return try {
            val response = api.submitUtr(SubmitUtrRequest(sessionId, utr), authHeader)
            if (response.isSuccessful && response.body()?.success == true && response.body()?.session != null) {
                NetworkResult.Success(response.body()!!.session!!)
            } else {
                NetworkResult.Error(response.body()?.message ?: "UTR submission failed")
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error submitting UTR")
        }
    }

    /**
     * Connect to Server-Sent Events (SSE) realtime dispatch stream
     */
    fun listenToRealtimeEvents(baseUrl: String, userId: String): Flow<String> = flow {
        val client = OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build()

        val url = "${baseUrl}api/realtime/events?role=passenger&userId=$userId"
        val request = Request.Builder()
            .url(url)
            .addHeader("Accept", "text/event-stream")
            .build()

        val factory = EventSources.createFactory(client)
        factory.newEventSource(request, object : EventSourceListener() {
            override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
                // Emit SSE string payload downstream to Coroutine Flow
            }
            override fun onFailure(eventSource: EventSource, t: Throwable?, response: okhttp3.Response?) {
                // Reconnect or notify error
            }
        })
    }.flowOn(Dispatchers.IO)
}
