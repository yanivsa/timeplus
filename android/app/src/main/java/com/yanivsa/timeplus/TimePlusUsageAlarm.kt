package com.yanivsa.timeplus

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
import kotlin.math.max

object TimePlusUsageAlarm {
    const val ACTION_FIRE = "com.yanivsa.timeplus.action.USAGE_ALARM_FIRE"
    const val ACTION_STOP = "com.yanivsa.timeplus.action.USAGE_ALARM_STOP"
    const val EXTRA_SESSION_ID = "session_id"

    private const val REQUEST_CODE = 51001
    private const val PREFS_NAME = "timeplus_usage_alarm"
    private const val KEY_SESSION_ID = "session_id"
    private const val KEY_TRIGGER_AT = "trigger_at"

    /**
     * Schedules the native alarm. Returns true when Android allowed an exact alarm.
     * On Android 12+ without exact-alarm access we still install an inexact fallback,
     * while MainActivity asks the user for the one-time system permission.
     */
    fun schedule(context: Context, triggerAtMillis: Long, sessionId: String): Boolean {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val safeTriggerAt = max(triggerAtMillis, System.currentTimeMillis() + 1_000L)
        val pendingIntent = firePendingIntent(context, sessionId)

        alarmManager.cancel(pendingIntent)

        val exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
        if (exactAllowed) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                safeTriggerAt,
                pendingIntent
            )
        } else {
            // Safety net until the one-time exact-alarm permission is granted.
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                safeTriggerAt,
                pendingIntent
            )
        }

        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_SESSION_ID, sessionId)
            .putLong(KEY_TRIGGER_AT, safeTriggerAt)
            .apply()

        return exactAllowed
    }

    fun cancel(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(firePendingIntent(context, null))
        context.stopService(Intent(context, TimePlusAlarmService::class.java))
        clearStored(context)
    }

    fun clearStored(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_SESSION_ID)
            .remove(KEY_TRIGGER_AT)
            .apply()
    }

    private fun firePendingIntent(context: Context, sessionId: String?): PendingIntent {
        val intent = Intent(context, TimePlusAlarmReceiver::class.java).apply {
            action = ACTION_FIRE
            sessionId?.let { putExtra(EXTRA_SESSION_ID, it) }
        }
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}

class TimePlusAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            TimePlusUsageAlarm.ACTION_STOP -> {
                context.stopService(Intent(context, TimePlusAlarmService::class.java))
                TimePlusUsageAlarm.clearStored(context)
            }

            TimePlusUsageAlarm.ACTION_FIRE -> {
                val serviceIntent = Intent(context, TimePlusAlarmService::class.java).apply {
                    action = TimePlusAlarmService.ACTION_START
                    putExtra(
                        TimePlusUsageAlarm.EXTRA_SESSION_ID,
                        intent.getStringExtra(TimePlusUsageAlarm.EXTRA_SESSION_ID).orEmpty()
                    )
                }
                ContextCompat.startForegroundService(context, serviceIntent)
                TimePlusUsageAlarm.clearStored(context)
            }
        }
    }
}
