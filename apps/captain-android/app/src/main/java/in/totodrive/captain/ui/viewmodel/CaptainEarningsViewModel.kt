package in.totodrive.captain.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import in.totodrive.captain.data.model.CaptainEarningsSummary
import in.totodrive.captain.data.model.CaptainTransactionItem
import in.totodrive.captain.data.repository.CaptainRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class EarningsUiState {
    object Loading : EarningsUiState()
    data class Success(val summary: CaptainEarningsSummary) : EarningsUiState()
    data class Error(val message: String) : EarningsUiState()
}

class CaptainEarningsViewModel(
    private val repository: CaptainRepository
) : ViewModel() {

    private val _earningsState = MutableStateFlow<EarningsUiState>(EarningsUiState.Loading)
    val earningsState: StateFlow<EarningsUiState> = _earningsState.asStateFlow()

    private val _todayEarnings = MutableStateFlow(0.0)
    val todayEarnings = _todayEarnings.asStateFlow()

    private val _walletBalance = MutableStateFlow(0.0)
    val walletBalance = _walletBalance.asStateFlow()

    fun loadEarnings(captainId: String) {
        viewModelScope.launch {
            _earningsState.value = EarningsUiState.Loading
            // Default demo ledger state
            val summary = CaptainEarningsSummary(
                todayEarnings = 420.0,
                weeklyEarnings = 2850.0,
                walletBalance = 1680.0,
                completedTripsToday = 7,
                acceptanceRate = 94.5,
                transactions = listOf(
                    CaptainTransactionItem("tx_01", 60.0, "CREDIT", "Trip payout #ride_101", "Today, 10:30 AM"),
                    CaptainTransactionItem("tx_02", 75.0, "CREDIT", "Trip payout #ride_102", "Today, 11:15 AM"),
                    CaptainTransactionItem("tx_03", -500.0, "PAYOUT", "Instant Bank Transfer", "Yesterday, 6:00 PM")
                )
            )
            _todayEarnings.value = summary.todayEarnings
            _walletBalance.value = summary.walletBalance
            _earningsState.value = EarningsUiState.Success(summary)
        }
    }
}
