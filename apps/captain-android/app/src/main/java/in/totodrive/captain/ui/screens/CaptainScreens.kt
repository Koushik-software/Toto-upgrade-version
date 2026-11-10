package in.totodrive.captain.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import in.totodrive.captain.data.model.*
import in.totodrive.captain.ui.viewmodel.CaptainDutyState
import in.totodrive.captain.ui.viewmodel.CaptainShiftViewModel
import in.totodrive.captain.ui.viewmodel.CaptainEarningsViewModel

val TotoCaptainGreen = Color(0xFF059669)
val TotoCaptainDarkGreen = Color(0xFF065F46)
val TotoAmber = Color(0xFFD97706)
val TotoBg = Color(0xFFF8FAFC)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaptainShiftScreen(
    shiftViewModel: CaptainShiftViewModel,
    earningsViewModel: CaptainEarningsViewModel,
    captainId: String = "drv_live_a",
    onNavigateToEarnings: () -> Unit,
    onNavigateToDocuments: () -> Unit,
    onLogout: () -> Unit
) {
    val dutyState by shiftViewModel.dutyState.collectAsState()
    val isOnline by shiftViewModel.isOnline.collectAsState()
    val todayEarnings by earningsViewModel.todayEarnings.collectAsState()

    var otpInput by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("TOTO", fontWeight = FontWeight.Black, color = TotoCaptainGreen, fontSize = 20.sp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Captain", fontWeight = FontWeight.Bold, color = Color(0xFF1E293B), fontSize = 20.sp)
                        }
                        Text(
                            text = if (isOnline) "🟢 ONLINE · RECEIVING RIDES" else "⚪ OFFLINE",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isOnline) TotoCaptainGreen else Color.Gray
                        )
                    }
                },
                actions = {
                    AssistChip(
                        onClick = onNavigateToEarnings,
                        label = { Text("₹${todayEarnings.toInt()}", fontWeight = FontWeight.Bold) },
                        leadingIcon = { Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = TotoCaptainGreen) },
                        modifier = Modifier.padding(end = 8.dp)
                    )
                    IconButton(onClick = onNavigateToDocuments) {
                        Icon(Icons.Default.FolderShared, contentDescription = "Documents", tint = Color(0xFF475569))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(TotoBg)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Online/Offline Shift Switch Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = if (isOnline) Color(0xFFECFDF5) else Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = if (isOnline) "Duty Shift Active" else "You are Currently Offline",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = if (isOnline) TotoCaptainDarkGreen else Color(0xFF1E293B)
                            )
                            Text(
                                text = if (isOnline) "GPS broadcast active · Accepting rides" else "Go online to start receiving passenger bookings",
                                fontSize = 12.sp,
                                color = Color(0xFF64748B)
                            )
                        }
                        Switch(
                            checked = isOnline,
                            onCheckedChange = { online ->
                                shiftViewModel.toggleShift(captainId, online, 22.5726, 88.3639)
                            },
                            colors = SwitchDefaults.colors(checkedThumbColor = TotoCaptainGreen)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Interactive Shift State Console
                when (val state = dutyState) {
                    is CaptainDutyState.Offline -> {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.PowerSettingsNew, contentDescription = null, modifier = Modifier.size(64.dp), tint = Color.LightGray)
                                Spacer(modifier = Modifier.height(12.dp))
                                Text("Toggle the switch above to start your shift", fontWeight = FontWeight.Medium, color = Color(0xFF64748B))
                            }
                        }
                    }

                    is CaptainDutyState.OnlineSearching -> {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    CircularProgressIndicator(color = TotoCaptainGreen, strokeWidth = 3.dp)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text("Searching for Nearby Passengers...", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    Text("Howrah / Kolkata E-Rickshaw Zone", fontSize = 12.sp, color = Color(0xFF64748B))
                                }
                            }
                        }
                    }

                    is CaptainDutyState.IncomingRequest -> {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("⚡ NEW RIDE OFFER", fontWeight = FontWeight.Black, color = TotoAmber, fontSize = 14.sp)
                                    Text("₹${state.offer.fare.toInt()}", fontWeight = FontWeight.Black, fontSize = 24.sp, color = TotoCaptainDarkGreen)
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                                Text("Passenger: ${state.offer.passengerName}", fontWeight = FontWeight.SemiBold)
                                Text("Pickup: ${state.offer.pickupAddress}", fontSize = 14.sp, color = Color(0xFF334155))
                                Text("Dropoff: ${state.offer.destinationAddress}", fontSize = 14.sp, color = Color(0xFF334155))
                                Text("Distance: ${state.offer.distanceKm} km", fontSize = 13.sp, color = Color(0xFF64748B))

                                Spacer(modifier = Modifier.height(16.dp))

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    OutlinedButton(
                                        onClick = { shiftViewModel.resetToOnlineSearching() },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Reject")
                                    }
                                    Button(
                                        onClick = { shiftViewModel.acceptOffer(captainId, 22.5726, 88.3639) },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(containerColor = TotoCaptainGreen)
                                    ) {
                                        Text("ACCEPT", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }

                    is CaptainDutyState.EnRouteToPickup -> {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Navigating to Pickup", fontWeight = FontWeight.Bold, color = TotoCaptainGreen, fontSize = 16.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Pickup Address: ${state.offer.pickupAddress}", fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(16.dp))

                                Button(
                                    onClick = { shiftViewModel.markArrived(22.5726, 88.3639) },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = TotoCaptainGreen)
                                ) {
                                    Text("Mark Arrived at Pickup (Within 120m)", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    is CaptainDutyState.ArrivedAtPickup -> {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Passenger Pickup Verification", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text("Ask passenger for their 4-digit ride OTP", fontSize = 12.sp, color = Color(0xFF64748B))
                                Spacer(modifier = Modifier.height(12.dp))

                                OutlinedTextField(
                                    value = otpInput,
                                    onValueChange = { otpInput = it },
                                    label = { Text("Enter 4-Digit OTP") },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true
                                )
                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = { shiftViewModel.verifyOtpAndStart(otpInput) },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = TotoCaptainGreen)
                                ) {
                                    Text("Verify OTP & Start Ride", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    is CaptainDutyState.TripInProgress -> {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("🚕 Trip in Progress", fontWeight = FontWeight.Bold, color = TotoCaptainGreen, fontSize = 16.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Destination: ${state.offer.destinationAddress}", fontSize = 14.sp)
                                Text("Expected Fare: ₹${state.offer.fare.toInt()}", fontWeight = FontWeight.SemiBold)
                                Spacer(modifier = Modifier.height(16.dp))

                                Button(
                                    onClick = { shiftViewModel.completeTrip("ONLINE") },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                                ) {
                                    Text("Complete Trip & Collect Payment", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    is CaptainDutyState.TripCompleted -> {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5))
                        ) {
                            Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = TotoCaptainGreen, modifier = Modifier.size(48.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Trip Successfully Completed!", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Spacer(modifier = Modifier.height(12.dp))
                                Text("Net Captain Earnings: ₹${state.summary.captainEarnings.toInt()}", fontWeight = FontWeight.Black, fontSize = 20.sp, color = TotoCaptainDarkGreen)
                                Text("Platform Fee: ₹${state.summary.platformFee.toInt()}", fontSize = 12.sp, color = Color(0xFF64748B))

                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { shiftViewModel.resetToOnlineSearching() },
                                    colors = ButtonDefaults.buttonColors(containerColor = TotoCaptainGreen)
                                ) {
                                    Text("Back to Shift Search")
                                }
                            }
                        }
                    }

                    is CaptainDutyState.Error -> {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2))
                        ) {
                            Text(
                                text = state.message,
                                color = Color(0xFFDC2626),
                                modifier = Modifier.padding(16.dp),
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
