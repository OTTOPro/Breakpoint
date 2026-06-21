package expo.modules.breakpointble

import android.content.Intent
import android.os.Bundle
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * BreakpointBle — Android proximity.
 *
 * Connectionless: the phone advertises the session UUID as a service AND scans
 * for that same service UUID. The actual radio work runs in a foreground
 * service ([ProximityForegroundService]) so scanning stays reliable with the
 * screen off. The native layer only emits raw `{ rssi, at }`; all zone/trend
 * logic lives in JS.
 */
class BreakpointBleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BreakpointBle")

    Events("onPeerSignal")

    Function("hello") {
      "hello from breakpoint-ble (Android)"
    }

    Function("startProximity") { sessionUuid: String ->
      val context = appContext.reactContext ?: return@Function
      ProximityForegroundService.signalListener = { rssi, at ->
        sendEvent("onPeerSignal", Bundle().apply {
          putInt("rssi", rssi)
          putDouble("at", at)
        })
      }
      val intent = Intent(context, ProximityForegroundService::class.java).apply {
        action = ProximityForegroundService.ACTION_START
        putExtra(ProximityForegroundService.EXTRA_SESSION_UUID, sessionUuid)
      }
      context.startForegroundService(intent)
    }

    Function("stopProximity") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(context, ProximityForegroundService::class.java).apply {
        action = ProximityForegroundService.ACTION_STOP
      }
      context.startService(intent)
      ProximityForegroundService.signalListener = null
    }

    OnDestroy {
      val context = appContext.reactContext ?: return@OnDestroy
      context.stopService(Intent(context, ProximityForegroundService::class.java))
      ProximityForegroundService.signalListener = null
    }
  }
}
