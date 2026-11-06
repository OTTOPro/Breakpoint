package expo.modules.breakpointble

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.ParcelUuid
import androidx.core.app.NotificationCompat

/**
 * Foreground service that runs connectionless BLE: advertises the session UUID
 * and scans for that same UUID. Each peer detection is forwarded raw (rssi +
 * epoch millis) through [signalListener]. No zone/trend logic here — that's JS.
 */
@SuppressLint("MissingPermission") // runtime perms requested in JS before start
class ProximityForegroundService : Service() {

  private var advertiser: BluetoothLeAdvertiser? = null
  private var scanner: BluetoothLeScanner? = null

  private val advertiseCallback = object : AdvertiseCallback() {
    override fun onStartFailure(errorCode: Int) {
      // Scanning may still work, but the peer will not hear this phone.
      errorListener?.invoke(ERROR_ADVERTISE_FAILED, errorCode)
    }
  }

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      val at = System.currentTimeMillis().toDouble()
      signalListener?.invoke(result.rssi, at)
    }

    override fun onBatchScanResults(results: MutableList<ScanResult>) {
      val at = System.currentTimeMillis().toDouble()
      for (result in results) signalListener?.invoke(result.rssi, at)
    }

    override fun onScanFailed(errorCode: Int) {
      errorListener?.invoke(ERROR_SCAN_FAILED, errorCode)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopProximity()
        stopSelf()
        return START_NOT_STICKY
      }
      else -> {
        // startForegroundService() requires this call even if we stop at once.
        startForeground(NOTIFICATION_ID, buildNotification())
        val sessionUuid = intent?.getStringExtra(EXTRA_SESSION_UUID)
        if (sessionUuid == null) {
          // No session to scan for: never sit in the foreground doing nothing.
          stopSelf()
          return START_NOT_STICKY
        }
        startProximity(sessionUuid)
      }
    }
    // Never restarted by the system after a kill: the JS session that owned
    // this scan is gone too, and a restart would bring the notification back
    // with no session behind it.
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    stopProximity()
    super.onDestroy()
  }

  private fun startProximity(sessionUuid: String) {
    val manager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val adapter = manager?.adapter
    if (adapter == null) {
      errorListener?.invoke(ERROR_UNSUPPORTED, null)
      return
    }
    if (!adapter.isEnabled) {
      errorListener?.invoke(ERROR_BLUETOOTH_OFF, null)
      return
    }

    try {
      startRadio(adapter.bluetoothLeAdvertiser, adapter.bluetoothLeScanner, sessionUuid)
    } catch (e: SecurityException) {
      // Permission revoked between the JS check and this call.
      stopProximity()
      errorListener?.invoke(ERROR_UNAUTHORIZED, null)
    }
  }

  private fun startRadio(
    leAdvertiser: BluetoothLeAdvertiser?,
    leScanner: BluetoothLeScanner?,
    sessionUuid: String,
  ) {
    val parcelUuid = ParcelUuid.fromString(sessionUuid)

    advertiser = leAdvertiser
    if (leAdvertiser == null) errorListener?.invoke(ERROR_ADVERTISE_FAILED, null)
    advertiser?.startAdvertising(
      AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
        .setConnectable(false)
        .build(),
      AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .addServiceUuid(parcelUuid)
        .build(),
      advertiseCallback,
    )

    scanner = leScanner
    if (leScanner == null) {
      errorListener?.invoke(ERROR_SCAN_FAILED, null)
      return
    }
    val filters = listOf(
      ScanFilter.Builder().setServiceUuid(parcelUuid).build(),
    )
    val settings = ScanSettings.Builder()
      .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
      .build()
    scanner?.startScan(filters, settings, scanCallback)
  }

  private fun stopProximity() {
    try {
      advertiser?.stopAdvertising(advertiseCallback)
      scanner?.stopScan(scanCallback)
    } catch (e: SecurityException) {
      // Permission already gone: the system has stopped the radio for us.
    }
    advertiser = null
    scanner = null
  }

  private fun buildNotification(): Notification {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Proximity",
        NotificationManager.IMPORTANCE_LOW,
      ).apply { setShowBadge(false) }
      nm.createNotificationChannel(channel)
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("BreakPoint")
      .setContentText("Finding your contact nearby…")
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }

  companion object {
    const val ACTION_START = "expo.modules.breakpointble.START"
    const val ACTION_STOP = "expo.modules.breakpointble.STOP"
    const val EXTRA_SESSION_UUID = "sessionUuid"

    private const val CHANNEL_ID = "breakpoint_proximity"
    private const val NOTIFICATION_ID = 4201

    const val ERROR_BLUETOOTH_OFF = "bluetooth_off"
    const val ERROR_UNAUTHORIZED = "unauthorized"
    const val ERROR_UNSUPPORTED = "unsupported"
    const val ERROR_ADVERTISE_FAILED = "advertise_failed"
    const val ERROR_SCAN_FAILED = "scan_failed"

    /** Set by the module; receives (rssi, epochMillis) for each detection. */
    @Volatile
    var signalListener: ((Int, Double) -> Unit)? = null

    /** Set by the module; receives (code, platform error code or null). */
    @Volatile
    var errorListener: ((String, Int?) -> Unit)? = null
  }
}
