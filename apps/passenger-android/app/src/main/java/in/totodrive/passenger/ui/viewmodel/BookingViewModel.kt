package in.totodrive.passenger.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import in.totodrive.passenger.data.model.*
import in.totodrive.passenger.data.repository.NetworkResult
import in.totodrive.passenger.data.repository.PassengerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class BookingUiState {
    object Idle : BookingUiState()
    object CalculatingFare : BookingUiState()
    data class FareCalculated(val fare: FareBreakdown) : BookingUiState()
    object BookingInProgress : BookingUiState()
    data class ActiveRide(val ride: ActiveRideRecord) : BookingUiState()
    data class Error(val message: String) : BookingUiState()
}

class BookingViewModel(
    private val repository: PassengerRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<BookingUiState>(BookingUiState.Idle)
    val uiState: StateFlow<BookingUiState> = _uiState.asStateFlow()

    private val _pickupAddress = MutableStateFlow("")
    val pickupAddress = _pickupAddress.asStateFlow()

    private val _destinationAddress = MutableStateFlow("")
    val destinationAddress = _destinationAddress.asStateFlow()

    private val _activeRide = MutableStateFlow<ActiveRideRecord?>(null)
    val activeRide = _activeRide.asStateFlow()

    fun setPickup(address: String, lat: Double, lng: Double) {
        _pickupAddress.value = address
    }

    fun setDestination(address: String, lat: Double, lng: Double) {
        _destinationAddress.value = address
    }

    fun calculateFare(
        vehicleType: String = "TOTO_REGULAR",
        distanceKm: Double,
        promoCode: String? = null
    ) {
        viewModelScope.launch {
            _uiState.value = BookingUiState.CalculatingFare
            when (val result = repository.calculateFare(vehicleType, distanceKm, promoCode)) {
                is NetworkResult.Success -> {
                    _uiState.value = BookingUiState.FareCalculated(result.data)
                }
                is NetworkResult.Error -> {
                    _uiState.value = BookingUiState.Error(result.message)
                }
                is NetworkResult.Loading -> Unit
            }
        }
    }

    fun bookRide(
        userId: String,
        pickupAddress: String,
        pickupLat: Double,
        pickupLng: Double,
        destinationAddress: String,
        destinationLat: Double,
        destinationLng: Double,
        fare: Double,
        distanceKm: Double,
        promoCode: String? = null
    ) {
        viewModelScope.launch {
            _uiState.value = BookingUiState.BookingInProgress
            val req = CreateRideRequest(
                passengerId = userId,
                pickupAddress = pickupAddress,
                pickupLatitude = pickupLat,
                pickupLongitude = pickupLng,
                destinationAddress = destinationAddress,
                destinationLatitude = destinationLat,
                destinationLongitude = destinationLng,
                fare = fare,
                distanceKm = distanceKm,
                vehicleType = "TOTO_REGULAR",
                promoCode = promoCode,
                idempotencyKey = "req_${userId}_${System.currentTimeMillis()}"
            )

            when (val result = repository.bookRide(req)) {
                is NetworkResult.Success -> {
                    _activeRide.value = result.data
                    _uiState.value = BookingUiState.ActiveRide(result.data)
                }
                is NetworkResult.Error -> {
                    _uiState.value = BookingUiState.Error(result.message)
                }
                is NetworkResult.Loading -> Unit
            }
        }
    }

    fun cancelRide(rideId: String, reason: String) {
        viewModelScope.launch {
            when (val result = repository.cancelRide(rideId, reason)) {
                is NetworkResult.Success -> {
                    _activeRide.value = null
                    _uiState.value = BookingUiState.Idle
                }
                is NetworkResult.Error -> {
                    _uiState.value = BookingUiState.Error(result.message)
                }
                is NetworkResult.Loading -> Unit
            }
        }
    }

    fun resetState() {
        _uiState.value = BookingUiState.Idle
    }
}
