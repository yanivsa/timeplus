package com.yanivsa.timeplus

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat

class TimePlusAlarmService : Service() {

    companion object {
        const val ACTION_START = "com.yanivsa.timeplus.action.ALARM_SERVICE_START"
        const val ACTION_STOP = "com.yanivsa.timeplus.action.ALARM_SERVICE_STOP"
        const val CHANNEL_ID = "timeplus_usage_alarm"
        private const val NOTIFICATION_ID = 51002
    }

    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        createAlarmChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopAlarm()
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildAlarmNotification())
        startAlarmSound()
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        stopAlarm()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createAlarmChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Time+ סיום זמן מסך",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "צלצול חזק ומתמשך כאשר זמן המסך מסתיים"
                enableVibration(false)
                setSound(null, null)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildAlarmNotification(): android.app.Notification {
        val openIntent = PendingIntent.getActivity(
            this,
            51003,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = PendingIntent.getService(
            this,
            51004,
            Intent(this, TimePlusAlarmService::class.java).apply { action = ACTION_STOP },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("הזמן נגמר")
            .setContentText("זמן המסך הסתיים. לחץ כדי לחזור ל-Time+.")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(openIntent)
            .addAction(android.R.drawable.ic_media_pause, "עצור צלצול", stopIntent)
            .build()
    }

    private fun startAlarmSound() {
        if (player?.isPlaying == true) return

        val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        player = MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            setDataSource(this@TimePlusAlarmService, alarmUri)
            isLooping = true
            prepare()
            start()
        }

        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (vibrator?.hasVibrator() == true) {
            val pattern = longArrayOf(0, 700, 300, 700, 300, 1200)
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        }

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "TimePlus:UsageAlarm"
        ).apply {
            setReferenceCounted(false)
            acquire(10 * 60 * 1000L)
        }
    }

    private fun stopAlarm() {
        runCatching { player?.stop() }
        runCatching { player?.release() }
        player = null

        runCatching { vibrator?.cancel() }
        vibrator = null

        if (wakeLock?.isHeld == true) {
            runCatching { wakeLock?.release() }
        }
        wakeLock = null

        stopForeground(STOP_FOREGROUND_REMOVE)
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .cancel(NOTIFICATION_ID)
    }
}
