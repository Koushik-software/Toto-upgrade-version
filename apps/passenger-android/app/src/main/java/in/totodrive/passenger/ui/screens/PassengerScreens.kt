package in.totodrive.passenger.ui.screens

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
import in.totodrive.passenger.data.model.*
import in.totodrive.passenger.ui.viewmodel.BookingUiState
import in.totodrive.passenger.ui.viewmodel.BookingViewModel
import in.totodrive.passenger.ui.viewmodel.WalletUiState
import in.totodrive.passenger.ui.viewmodel.PassengerViewModel

// Custom Brand Colors
val TotoEmerald = Color(0xFF059669)
val TotoEmeraldDark = Color(0xFF047857)
val TotoBgGray = Color(0xFFF9FAFB)
val TotoCardBorder = Color(0xFFE5E7EB)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PassengerHomeScreen(
    bookingViewModel: BookingViewModel,
    passengerViewModel: PassengerViewModel,
    onNavigateToWallet: () -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToSupport: () -> Unit,
    onLogout: () -> Unit
) {
    val uiState by bookingViewModel.uiState.collectAsState()
    val pickupAddress by bookingViewModel.pickupAddress.collectAsState()
    val destinationAddress by bookingViewModel.destinationAddress.collectAsState()

    var showFareSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "TOTO",
                            fontWeight = FontWeight.Black,
                            color = TotoEmerald,
                            fontSize = 20.sp
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Drive",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1F2937),
                            fontSize = 20.sp
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToWallet) {
                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = "Wallet", tint = Color(0xFF374151))
                    }
                    IconButton(onClick = onNavigateToHistory) {
                        Icon(Icons.Default.History, contentDescription = "History", tint = Color(0xFF374151))
                    }
                    IconButton(onClick = onNavigateToSupport) {
                        Icon(Icons.Default.HelpOutline, contentDescription = "Support", tint = Color(0xFF374151))
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
                .background(TotoBgGray)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Map Placeholder Viewport
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE2E8F0))
                ) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = TotoEmerald, modifier = Modifier.size(48.dp))
                            Text("Interactive Map Engine", fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                            Text("Live GPS & Nearby Toto Captains", fontSize = 12.sp, color = Color(0xFF64748B))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Ride Search Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Where are you heading?",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = Color(0xFF111827)
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = pickupAddress,
                            onValueChange = { bookingViewModel.setPickup(it, 22.5726, 88.3639) },
                            label = { Text("Pickup Location") },
                            leadingIcon = { Icon(Icons.Default.MyLocation, contentDescription = null, tint = TotoEmerald) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = destinationAddress,
                            onValueChange = { bookingViewModel.setDestination(it, 22.5850, 88.3750) },
                            label = { Text("Destination") },
                            leadingIcon = { Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFFEF4444)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = {
                                bookingViewModel.calculateFare(distanceKm = 4.5)
                                showFareSheet = true
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = TotoEmerald),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Calculate Toto Fare", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    }
                }

                // Active Ride or Fare breakdown view
                when (val state = uiState) {
                    is BookingUiState.FareCalculated -> {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5))
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("Toto E-Rickshaw", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                        Text("${state.fare.distanceKm} km · Fast & Eco-Friendly", fontSize = 12.sp, color = Color(0xFF047857))
                                    }
                                    Text("₹${state.fare.totalFare.toInt()}", fontWeight = FontWeight.Black, fontSize = 22.sp, color = TotoEmeraldDark)
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = {
                                        bookingViewModel.bookRide(
                                            userId = "user_demo",
                                            pickupAddress = pickupAddress.ifBlank { "Howrah Station" },
                                            pickupLat = 22.5726,
                                            pickupLng = 88.3639,
                                            destinationAddress = destinationAddress.ifBlank { "Salt Lake Sector V" },
                                            destinationLat = 22.5850,
                                            destinationLng = 88.3750,
                                            fare = state.fare.totalFare,
                                            distanceKm = state.fare.distanceKm
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = TotoEmeraldDark),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Book Toto Now", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                    is BookingUiState.ActiveRide -> {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Ride Status: ${state.ride.status}", fontWeight = FontWeight.Bold, color = TotoEmerald)
                                    Text("OTP: ${state.ride.otp ?: "----"}", fontWeight = FontWeight.Black, color = Color(0xFFDC2626))
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Destination: ${state.ride.destinationAddress}", fontSize = 14.sp)
                                Text("Fare: ₹${state.ride.fare.toInt()}", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)

                                Spacer(modifier = Modifier.height(12.dp))
                                OutlinedButton(
                                    onClick = { bookingViewModel.cancelRide(state.ride.id, "Changed my plans") },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626))
                                ) {
                                    Text("Cancel Ride")
                                }
                            }
                        }
                    }
                    is BookingUiState.Error -> {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(state.message, color = Color(0xFFDC2626), fontSize = 13.sp)
                    }
                    else -> Unit
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PassengerWalletScreen(
    passengerViewModel: PassengerViewModel,
    onNavigateBack: () -> Unit
) {
    val walletState by passengerViewModel.walletState.collectAsState()
    var rechargeAmount by remember { mutableStateOf("200") }
    var utrInput by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Toto Drive Wallet", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(TotoBgGray)
                .padding(16.dp)
        ) {
            // Balance Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Available Wallet Balance", color = Color(0xFF9CA3AF), fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("₹${passengerViewModel.walletBalance.toInt()}", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Black)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("YouPI Sovereign Peer-to-Peer Escrow", color = Color(0xFF34D399), fontSize = 11.sp, fontWeight = FontWeight.Medium)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            when (val state = walletState) {
                is WalletUiState.Idle -> {
                    Text("Recharge Amount", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(100, 200, 300, 500).forEach { amt ->
                            OutlinedButton(
                                onClick = { rechargeAmount = amt.toString() },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    containerColor = if (rechargeAmount == amt.toString()) Color(0xFFE07A00) else Color.White,
                                    contentColor = if (rechargeAmount == amt.toString()) Color.White else Color(0xFF374151)
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("+₹$amt", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = rechargeAmount,
                        onValueChange = { rechargeAmount = it.filter { ch -> ch.isDigit() } },
                        label = { Text("Custom Amount (₹)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            val amt = rechargeAmount.toDoubleOrNull() ?: 200.0
                            passengerViewModel.rechargeWallet(amt)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE07A00)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Open YouPI Payment Gateway (₹$rechargeAmount)", fontWeight = FontWeight.Bold)
                    }
                }

                is WalletUiState.Loading -> {
                    Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = TotoEmerald)
                    }
                }

                is WalletUiState.SessionCreated -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("YouPI Gateway Session", fontWeight = FontWeight.Black, fontSize = 16.sp, color = TotoEmerald)
                            Text("Order ID: ${state.session.orderId}", fontSize = 12.sp, color = Color.Gray)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Amount Payable: ₹${state.session.amount.toInt()}", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text("Beneficiary: ${state.session.merchantUpiId}", fontSize = 12.sp, color = Color(0xFF4B5563))

                            Spacer(modifier = Modifier.height(14.dp))
                            Text("Step 1: Pay using your UPI app", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            Spacer(modifier = Modifier.height(6.dp))
                            Button(
                                onClick = { /* Intent to upiUri */ },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F2937))
                            ) {
                                Text("Open UPI App")
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Step 2: Enter 12-Digit Bank UTR", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            Spacer(modifier = Modifier.height(6.dp))
                            OutlinedTextField(
                                value = utrInput,
                                onValueChange = { utrInput = it.take(20) },
                                placeholder = { Text("e.g. 432109876543") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                singleLine = true
                            )

                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    if (utrInput.length >= 8) {
                                        passengerViewModel.submitUtr(state.session.id, utrInput)
                                    }
                                },
                                enabled = utrInput.length >= 8,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = TotoEmerald)
                            ) {
                                Text("Submit UTR & Settle Wallet", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                is WalletUiState.UtrVerified -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5))
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = "Success", tint = TotoEmerald, modifier = Modifier.size(48.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Recharge Successful!", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = TotoEmeraldDark)
                            Text("₹${state.session.amount.toInt()} credited to wallet", fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { passengerViewModel.resetWalletState() },
                                colors = ButtonDefaults.buttonColors(containerColor = TotoEmeraldDark)
                            ) {
                                Text("Done")
                            }
                        }
                    }
                }

                is WalletUiState.Error -> {
                    Text("Error: ${state.message}", color = Color(0xFFDC2626), fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(onClick = { passengerViewModel.resetWalletState() }) {
                        Text("Try Again")
                    }
                }
            }
        }
    }
}
