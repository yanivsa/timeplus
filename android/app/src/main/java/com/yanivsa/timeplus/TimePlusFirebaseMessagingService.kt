package com.yanivsa.timeplus

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class TimePlusFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        const val CHANNEL_ID = "timeplus_updates"
        const val PREFS_NAME = "timeplus_push"
        const val KEY_FCM_TOKEN = "fcm_token"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(KEY_FCM_TOKEN, token)
            .apply()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val type = remoteMessage.data["type"].orEmpty()
        if (type == "screen_time_up") {
            val sessionId = remoteMessage.data["entityId"].orEmpty()

            // The exact local alarm is primary. The cloud push is a safety net.
            // If the same session already rang locally, do not ring again after
            // the child has dismissed it.
            if (sessionId.isNotBlank() && TimePlusUsageAlarm.wasHandled(this, sessionId)) {
                return
            }

            val serviceIntent = Intent(this, TimePlusAlarmService::class.java).apply {
                action = TimePlusAlarmService.ACTION_START
                putExtra(TimePlusUsageAlarm.EXTRA_SESSION_ID, sessionId)
            }

            try {
                ContextCompat.startForegroundService(this, serviceIntent)
                TimePlusUsageAlarm.markHandled(this, sessionId)
                TimePlusUsageAlarm.clearStored(this)
                return
            } catch (_: Exception) {
                // Fall through to a normal high-priority notification rather than
                // silently losing the expiry alert if Android blocks service start.
            }
        }

        createNotificationChannel()

        val title = remoteMessage.notification?.title
            ?: remoteMessage.data["title"]
            ?: "Time+"
        val body = remoteMessage.notification?.body
            ?: remoteMessage.data["body"]
            ?: ""
        val targetUrl = remoteMessage.data["url"] ?: "/"

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("notification_url", targetUrl)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()

        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        ) {
            NotificationManagerCompat.from(this).notify(
                (System.currentTimeMillis() and 0x0fffffff).toInt(),
                notification
            )
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Time+ התראות",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "בקשות זמן, אישורים ועדכוני משימות"
                enableVibration(true)
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
