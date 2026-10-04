#!/usr/bin/env bash
set -euo pipefail

chmod +x android/gradlew
android/gradlew -p android assembleDebug --no-daemon
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Prevent the Android 13+ notification permission dialog from masking the app
# during automated runtime QA.
adb shell pm grant com.yanivsa.timeplus android.permission.POST_NOTIFICATIONS || true

adb logcat -c
adb shell am force-stop com.yanivsa.timeplus
adb shell am start -W -n com.yanivsa.timeplus/.MainActivity
sleep 20

adb shell dumpsys activity activities > runtime-activity.txt
adb shell uiautomator dump /sdcard/timeplus-window.xml || true
adb pull /sdcard/timeplus-window.xml runtime-window.xml || true
adb exec-out screencap -p > runtime-screen.png
adb logcat -d > runtime-logcat.txt

grep -q 'com.yanivsa.timeplus/.MainActivity' runtime-activity.txt

# UIAutomator can expose a WebView as one opaque node. Since debug builds enable
# WebView debugging, use the DevTools socket to verify the real loaded origin.
APP_PID="$(adb shell pidof com.yanivsa.timeplus | tr -d '\r')"
if [[ -z "$APP_PID" ]]; then
  echo 'Time+ process is not running'
  exit 1
fi

adb forward tcp:9222 "localabstract:webview_devtools_remote_$APP_PID"
sleep 2
curl --fail --silent --show-error http://127.0.0.1:9222/json > runtime-devtools.json

if ! grep -q 'timeplus-app.pages.dev' runtime-devtools.json; then
  echo 'Primary Pages origin was not loaded in the WebView'
  cat runtime-devtools.json
  exit 1
fi

if [[ -f runtime-window.xml ]] && grep -Eq 'ERR_NAME_NOT_RESOLVED|Webpage not available' runtime-window.xml; then
  echo 'Chromium network error page detected'
  exit 1
fi

if grep -Eq 'FATAL EXCEPTION|AndroidRuntime: FATAL|Process: com.yanivsa.timeplus.*FATAL' runtime-logcat.txt; then
  echo 'Fatal Android runtime error detected'
  exit 1
fi

# Verify Firebase can mint a native FCM registration token on the Android image.
# The token itself is never printed or uploaded.
FCM_READY=0
for _ in $(seq 1 30); do
  if adb shell run-as com.yanivsa.timeplus cat shared_prefs/timeplus_push.xml 2>/dev/null | grep -q 'name="fcm_token"'; then
    FCM_READY=1
    break
  fi
  sleep 2
done
if [[ "$FCM_READY" != "1" ]]; then
  echo 'Firebase Messaging did not produce a native FCM token'
  exit 1
fi

# Simulate the two deep-link paths that native FCM notifications use.
for TARGET_PATH in /child /parent; do
  adb shell am start -W -n com.yanivsa.timeplus/.MainActivity --es notification_url "$TARGET_PATH" >/dev/null
  sleep 5
  APP_PID="$(adb shell pidof com.yanivsa.timeplus | tr -d '\r')"
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
  adb forward tcp:9222 "localabstract:webview_devtools_remote_$APP_PID" >/dev/null
  OUT_FILE="runtime-devtools-$(echo "$TARGET_PATH" | tr -d '/').json"
  curl --fail --silent --show-error http://127.0.0.1:9222/json > "$OUT_FILE"
  grep -q "https://timeplus-app.pages.dev$TARGET_PATH" "$OUT_FILE"
done

echo 'Android runtime QA passed, including native FCM token acquisition and notification deep-link routing.'
