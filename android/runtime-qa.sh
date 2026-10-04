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

if [[ -f runtime-window.xml ]]; then
  if grep -Eq 'ERR_NAME_NOT_RESOLVED|Webpage not available' runtime-window.xml; then
    echo 'Chromium network error page detected'
    exit 1
  fi

  if ! grep -Eq 'Time\+|אקדמיית הזמן|ילדים|הורים' runtime-window.xml; then
    echo 'Expected Time+ login UI was not visible'
    cat runtime-window.xml
    exit 1
  fi
fi

if grep -Eq 'FATAL EXCEPTION|AndroidRuntime: FATAL|Process: com.yanivsa.timeplus.*FATAL' runtime-logcat.txt; then
  echo 'Fatal Android runtime error detected'
  exit 1
fi

echo 'Android runtime QA passed.'
