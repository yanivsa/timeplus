> **DEPRECATED FOR THE CURRENT UPDATE:** This document describes the original 1.0.0 release. For the current Time+ 1.0.3 update, use `release-play/PLAY_CONSOLE_UPDATE_1.0.3_FOR_MUSE.md` only. Do not upload the old 1.0.0 bundle or create a new Play app.

# מדריך העלאה והפצה ל-Google Play Console (עבור Muse / יניב)
# Step-by-Step Google Play Console Guide for Time+

מדריך זה מיועד ל-**Muse** או **יניב** לצורך העלאת אפליקציית **Time+** לחשבון המפתח ב-Google Play והפצתה לקבוצת הבודקים המשפחתית הקיימת.

---

## נתוני יסוד (Metadata & Identifiers)

- **מזהה חשבון המפתח (Developer ID):** `6657095846037717804`
- **קישור ישיר לקונסול:** [Google Play Console](https://play.google.com/console/u/0/developers/6657095846037717804)
- **שם האפליקציה:** `Time+`
- **מזהה חבילה (Package Name / Application ID):** `com.yanivsa.timeplus`
- **גרסה נוכחית:** `1.0.0` (גרסת קוד / VersionCode: `1`)
- **קובץ החבילה להעלאה (AAB Bundle):** `release-play/timeplus-v1.0.0-release.aab`
- **מדיניות פרטיות באוויר (Privacy Policy URL):** `https://timeplus.yanivsa.workers.dev/privacy`
- **שרת ייצור / כתובת האפליקציה:** `https://timeplus.yanivsa.workers.dev`

---

## שלב 1: יצירת האפליקציה ב-Google Play Console

1. היכנסו ל-[Google Play Console](https://play.google.com/console/u/0/developers/6657095846037717804).
2. ודאו שבפינה השמאלית העליונה מסומן חשבון המפתח של יניב (`6657095846037717804`).
3. לחצו על כפתור **"Create app"** (יצירת אפליקציה):
   - **App name:** `Time+`
   - **Default language:** `Hebrew - he` (עברית)
   - **App or game:** `App` (אפליקציה)
   - **Free or paid:** `Free` (חינם)
   - סמנו את שתי הצהרות המדיניות של גוגל בתחתית העמוד (Declarations & US Export Laws).
   - לחצו על **"Create app"**.

---

## שלב 2: הגדרת משימות הדשבורד (Set up your app)

בדשבורד הראשי של האפליקציה, עברו על סעיפי החובה:

1. **מדיניות פרטיות (Privacy policy):**
   - הזינו את הכתובת: `https://timeplus.yanivsa.workers.dev/privacy`
   - לחצו על Save.
2. **גישה לאפליקציה (App access):**
   - בחרו: **"All or some functionality is restricted"** (חלק מהפונקציונליות מוגבלת).
   - הוסיפו פרטי גישה (Add credentials):
     - שם הוראה: `Family Test Account`
     - הוראות:
       ```text
       Time+ is a family screen-time management system.
       Parent login: Select "כניסת הורים", enter PIN: 1234
       Child login: Select child "איתמר", enter PIN: 1111
       No phone number or payment required.
       ```
3. **פרסומות (Ads):**
   - בחרו: **"No, my app does not contain ads"** (לא, האפליקציה אינה מכילה פרסומות).
4. **קהל יעד ותוכן (Target audience and content):**
   - סמנו קבוצות גיל: **`6-8`**, **`9-12`**, ו-**`13 ומעלה (הורים)`**.
   - הצהירו שהאפליקציה עומדת בכללי תוכנית המשפחות (Designed for Families).
5. **סיווג תוכן (Content rating):**
   - מלאו שאלון קצר (אימייל: `yanivsa@gmail.com`, קטגוריה: Utility / Productivity).
   - ענו "לא" על כל שאלות האלימות / הימורים / תכנים בלתי הולמים.
   - דירוג התוכן יאושר כ-Everyone / 3+.
6. **בטיחות נתונים (Data safety):**
   - הצהירו שהנתונים מוצפנים בהעברה (HTTPS).
   - אין שיתוף נתונים עם צד שלישי (No data shared).
   - נתונים נאספים: שם משתמש / אווטאר, סטטוס משימות (לצורך תפקוד האפליקציה בלבד).
   - מחיקת נתונים: הורים יכולים לבקש מחיקה (Yes).

---

## שלב 3: הזנת נכסי החנות (Main store listing)

גשו בתפריט הצדדי ל-**Grow > Store presence > Main store listing**:
- **Short description:**
  ```text
  מערכת משפחתית לניהול דקות מסך, משימות יומיות והרגלים באווירת קסמים.
  ```
- **Full description:** העתיקו את הטקסט המלא מקובץ `release-play/STORE_LISTING.md`.
- **App icon:** העלו את הקובץ `release-play/assets/icon-512.png` (512x512).
- **Feature graphic:** העלו את הקובץ `release-play/assets/feature-graphic.png` (1024x500).
- **Phone screenshots:** העלו את הקבצים `release-play/assets/screenshot-1.png` ו-`release-play/assets/screenshot-2.png`.

---

## שלב 4: יצירת גרסת בדיקות פנימית או סגורה (Internal / Closed Testing)

1. גשו בתפריט הצדדי ל-**Release > Testing > Internal testing** (או Closed testing).
2. **הגדרת רשימת הבודקים (Testers):**
   - עברו ללשונית **"Testers"**.
   - בחרו את **רשימת הבודקים הקיימת** של יניב מחשבון המפתח (אותה רשימת תפוצה / קבוצת מיילים ששימשה באפליקציות הקודמות של יניב).
   - לחצו על Save changes.
   - העתיקו את קישור ההצטרפות (Opt-in link / Join on Android) לשליחה למשפחה.
3. **יצירת גרסה (Create new release):**
   - לחצו על **"Create new release"**.
   - אם מופיעה הודעה על **Google Play App Signing**:
     - אשרו ל-Google Play לנהל את מפתח החתימה הראשי (Play App Signing).
     - החבילה כבר חתומה באמצעות ה-Upload Keystore הייעודי שנשמר בפרויקט.
   - העלו את קובץ ה-Bundle:
     `release-play/timeplus-v1.0.0-release.aab`
   - בשדה **Release name**: הזינו `1.0.0 (1)`.
   - בשדה **Release notes (עברית)**: העתיקו את ההערות מקובץ `release-play/STORE_LISTING.md`.
4. לחצו על **Next** ולאחר מכן **"Save and publish release"**.

---

## נקודות מפתח ארכיטקטוניות (Architecture Notes)

- **עדכונים דרך Git בלבד:** האפליקציה שהועלתה היא מעטפת אנדרואיד רזה (Native Thin Container) הטוענת ישירות את שרתי הייצור המאובטחים של Time+ בכתובת `https://timeplus.yanivsa.workers.dev`.
- כל שינוי עתידי בממשק, בלוגיקה העסקית, במשימות או בעולם הקסמים מתעדכן **אוטומטית** ברגע שמבצעים `git push` ונפרס ב-Cloudflare — **ללא צורך בהעלאת גרסה חדשה ל-Google Play**!
