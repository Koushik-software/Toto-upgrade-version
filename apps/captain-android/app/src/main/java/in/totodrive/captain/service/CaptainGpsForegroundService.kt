package in.totodrive.captain.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import in.totodrive.captain.data.api.CaptainApiService
import in.totodrive.captain.data.model.DriverLocationUpdate
import kotlinx.coroutines.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class CaptainGpsForegroundService : Service() {

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var captainId: String? = null
    private var authToken: String? = null

    private val api: CaptainApiService by lazy {
        Retrofit.Builder()
            .baseUrl("http://10.0.2.2:3000/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CaptainApiService::class.java)
    }

    companion object {
        const val CHANNEL_ID = "toto_captain_gps_channel"
        const val NOTIFICATION_ID = 2001
        const val EXTRA_CAPTAIN_ID = "extra_captain_id"
        const val EXTRA_TOKEN = "extra_token"

        fun startService(context: Context, captainId: String, token: String) {
            val intent = Intent(context, CaptainGpsForegroundService::class.java).apply {
                putExtra(EXTRA_CAPTAIN_ID, captainId)
                putExtra(EXTRA_TOKEN, token)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, CaptainGpsForegroundService::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    onNewLocation(location)
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        captainId = intent?.getStringExtra(EXTRA_CAPTAIN_ID)
        authToken = intent?.getStringExtra(EXTRA_TOKEN)

        startForeground(NOTIFICATION_ID, buildForegroundNotification())
        requestLocationUpdates()

        return START_STICKY
    }

    private fun requestLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 4000)
            .setMinUpdateIntervalMillis(2000)
            .setMaxUpdateDelayMillis(6000)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            stopSelf()
        }
    }

    private fun onNewLocation(loc: Location) {
        val id = captainId ?: return
        val token = authToken ?: return

        serviceScope.launch {
            try {
                api.updateLocation(
                    id,
                    DriverLocationUpdate(
                        latitude = loc.latitude,
                        longitude = loc.longitude,
                        heading = loc.bearing,
                        speed = loc.speed,
                        accuracy = loc.accuracy,
                        isAvailable = true
                    ),
                    "Bearer $token"
                )
            } catch (e: Exception) {
                // Transient network failure during transit - silent retry next cycle
            }
        }
    }

    private fun buildForegroundNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TOTO Captain: Shift Online")
            .setContentText("Transmitting high-precision GPS telemetry for instant passenger rides")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "TOTO Captain GPS Shift Telemetry",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notifies driver while GPS telemetry is active during duty"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceJob.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
