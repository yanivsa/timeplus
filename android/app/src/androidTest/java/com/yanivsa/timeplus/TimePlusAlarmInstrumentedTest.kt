package com.yanivsa.timeplus

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TimePlusAlarmInstrumentedTest {

    private val context: Context
        get() = InstrumentationRegistry.getInstrumentation().targetContext

    @After
    fun cleanup() {
        context.stopService(Intent(context, TimePlusAlarmService::class.java))
    }

    @Test
    fun alarmKeepsRingingUntilExplicitDismissal() {
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        val sessionId = "qa-alarm-session"

        val startIntent = Intent(context, TimePlusAlarmService::class.java).apply {
            action = TimePlusAlarmService.ACTION_START
            putExtra(TimePlusUsageAlarm.EXTRA_SESSION_ID, sessionId)
        }
        ContextCompat.startForegroundService(context, startIntent)
        waitForNotificationState(notificationManager, expectedActive = true)

        assertTrue(
            "Time-up alarm foreground notification should be active after service start",
            hasActiveAlarmNotification(notificationManager)
        )

        // This is what WebView/server synchronization does after the session is
        // finalized. It may cancel a pending schedule, but it must not silence an
        // alarm that is already ringing.
        TimePlusUsageAlarm.cancel(context)
        Thread.sleep(500)
        assertTrue(
            "Session synchronization must not silence an already-ringing alarm",
            hasActiveAlarmNotification(notificationManager)
        )

        // The alarm stops only through an explicit dismissal action.
        val stopIntent = Intent(context, TimePlusAlarmService::class.java).apply {
            action = TimePlusAlarmService.ACTION_STOP
        }
        context.startService(stopIntent)
        waitForNotificationState(notificationManager, expectedActive = false)

        assertFalse(
            "Alarm notification should disappear after explicit dismissal",
            hasActiveAlarmNotification(notificationManager)
        )
    }

    private fun waitForNotificationState(
        notificationManager: NotificationManager,
        expectedActive: Boolean
    ) {
        repeat(30) {
            if (hasActiveAlarmNotification(notificationManager) == expectedActive) return
            Thread.sleep(100)
        }
    }

    private fun hasActiveAlarmNotification(notificationManager: NotificationManager): Boolean {
        return notificationManager.activeNotifications.any { statusBarNotification ->
            statusBarNotification.notification.extras
                .getCharSequence(Notification.EXTRA_TITLE)
                ?.toString() == "הזמן נגמר"
        }
    }
}
