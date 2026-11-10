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

sealed class WalletUiState {
    object Idle : WalletUiState()
    object Loading : WalletUiState()
    data class SessionCreated(val session: YouPiSessionInfo) : WalletUiState()
    data class UtrVerified(val session: YouPiSessionInfo) : WalletUiState()
    data class Error(val message: String) : WalletUiState()
}

class PassengerViewModel(
    private val repository: PassengerRepository
) : ViewModel() {

    private val _walletState = MutableStateFlow<WalletUiState>(WalletUiState.Idle)
    val walletState: StateFlow<WalletUiState> = _walletState.asStateFlow()

    private val _walletBalance = MutableStateFlow(0.0)
    val walletBalance = _walletBalance.asStateFlow()

    private val _currentSession = MutableStateFlow<YouPiSessionInfo?>(null)
    val currentSession = _currentSession.asStateFlow()

    fun rechargeWallet(amount: Double) {
        viewModelScope.launch {
            _walletState.value = WalletUiState.Loading
            when (val result = repository.createPaymentSession(amount, null)) {
                is NetworkResult.Success -> {
                    _currentSession.value = result.data
                    _walletState.value = WalletUiState.SessionCreated(result.data)
                }
                is NetworkResult.Error -> {
                    _walletState.value = WalletUiState.Error(result.message)
                }
                is NetworkResult.Loading -> Unit
            }
        }
    }

    fun submitUtr(sessionId: String, utr: String) {
        viewModelScope.launch {
            _walletState.value = WalletUiState.Loading
            when (val result = repository.submitUtr(sessionId, utr)) {
                is NetworkResult.Success -> {
                    _currentSession.value = result.data
                    _walletBalance.value += result.data.amount
                    _walletState.value = WalletUiState.UtrVerified(result.data)
                }
                is NetworkResult.Error -> {
                    _walletState.value = WalletUiState.Error(result.message)
                }
                is NetworkResult.Loading -> Unit
            }
        }
    }

    fun resetWalletState() {
        _walletState.value = WalletUiState.Idle
    }
}
