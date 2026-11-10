package in.totodrive.captain.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import in.totodrive.captain.data.model.*
import in.totodrive.captain.data.repository.CaptainRepository
import in.totodrive.captain.data.repository.CaptainResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class CaptainDutyState {
    object Offline : CaptainDutyState()
    object OnlineSearching : CaptainDutyState()
    data class IncomingRequest(val offer: IncomingRideOffer) : CaptainDutyState()
    data class EnRouteToPickup(val rideId: String, val offer: IncomingRideOffer) : CaptainDutyState()
    data class ArrivedAtPickup(val rideId: String, val offer: IncomingRideOffer) : CaptainDutyState()
    data class TripInProgress(val rideId: String, val offer: IncomingRideOffer) : CaptainDutyState()
    data class TripCompleted(val summary: CompleteRideResponse) : CaptainDutyState()
    data class Error(val message: String) : CaptainDutyState()
}

class CaptainShiftViewModel(
    private val repository: CaptainRepository
) : ViewModel() {

    private val _dutyState = MutableStateFlow<CaptainDutyState>(CaptainDutyState.Offline)
    val dutyState: StateFlow<CaptainDutyState> = _dutyState.asStateFlow()

    private val _isOnline = MutableStateFlow(false)
    val isOnline = _isOnline.asStateFlow()

    private val _activeOffer = MutableStateFlow<IncomingRideOffer?>(null)
    val activeOffer = _activeOffer.asStateFlow()

    fun toggleShift(captainId: String, online: Boolean, lat: Double, lng: Double) {
        viewModelScope.launch {
            when (val result = repository.toggleOnline(captainId, online, lat, lng)) {
                is CaptainResult.Success -> {
                    _isOnline.value = result.data
                    _dutyState.value = if (result.data) CaptainDutyState.OnlineSearching else CaptainDutyState.Offline
                }
                is CaptainResult.Error -> {
                    _dutyState.value = CaptainDutyState.Error(result.message)
                }
                is CaptainResult.Loading -> Unit
            }
        }
    }

    fun receiveIncomingOffer(offer: IncomingRideOffer) {
        if (_isOnline.value && _dutyState.value is CaptainDutyState.OnlineSearching) {
            _activeOffer.value = offer
            _dutyState.value = CaptainDutyState.IncomingRequest(offer)
        }
    }

    fun acceptOffer(captainId: String, lat: Double, lng: Double) {
        val offer = _activeOffer.value ?: return
        viewModelScope.launch {
            when (val result = repository.acceptRide(offer.rideId, captainId, lat, lng)) {
                is CaptainResult.Success -> {
                    _dutyState.value = CaptainDutyState.EnRouteToPickup(offer.rideId, offer)
                }
                is CaptainResult.Error -> {
                    _dutyState.value = CaptainDutyState.Error(result.message)
                }
                is CaptainResult.Loading -> Unit
            }
        }
    }

    fun markArrived(lat: Double, lng: Double) {
        val offer = _activeOffer.value ?: return
        val currentRideId = offer.rideId
        viewModelScope.launch {
            when (val result = repository.markArrived(currentRideId, lat, lng)) {
                is CaptainResult.Success -> {
                    _dutyState.value = CaptainDutyState.ArrivedAtPickup(currentRideId, offer)
                }
                is CaptainResult.Error -> {
                    _dutyState.value = CaptainDutyState.Error(result.message)
                }
                is CaptainResult.Loading -> Unit
            }
        }
    }

    fun verifyOtpAndStart(otp: String) {
        val offer = _activeOffer.value ?: return
        val currentRideId = offer.rideId
        viewModelScope.launch {
            when (val result = repository.startRide(currentRideId, otp)) {
                is CaptainResult.Success -> {
                    _dutyState.value = CaptainDutyState.TripInProgress(currentRideId, offer)
                }
                is CaptainResult.Error -> {
                    _dutyState.value = CaptainDutyState.Error(result.message)
                }
                is CaptainResult.Loading -> Unit
            }
        }
    }

    fun completeTrip(paymentMode: String = "ONLINE") {
        val offer = _activeOffer.value ?: return
        val currentRideId = offer.rideId
        viewModelScope.launch {
            when (val result = repository.completeRide(currentRideId, paymentMode)) {
                is CaptainResult.Success -> {
                    _dutyState.value = CaptainDutyState.TripCompleted(result.data)
                    _activeOffer.value = null
                }
                is CaptainResult.Error -> {
                    _dutyState.value = CaptainDutyState.Error(result.message)
                }
                is CaptainResult.Loading -> Unit
            }
        }
    }

    fun resetToOnlineSearching() {
        _activeOffer.value = null
        _dutyState.value = CaptainDutyState.OnlineSearching
    }
}
