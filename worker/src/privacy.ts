export function renderPrivacyPolicyHtml(): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time+ | מדיניות פרטיות - Privacy Policy</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.8);
      --border: rgba(255, 255, 255, 0.1);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-glow: rgba(56, 189, 248, 0.2);
      --accent: #a855f7;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem 1rem;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(12px);
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #0284c7, #7c3aed);
      color: white;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.35rem 0.9rem;
      border-radius: 9999px;
      margin-bottom: 0.75rem;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 2rem;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    section {
      margin-bottom: 2rem;
    }
    h2 {
      font-size: 1.3rem;
      color: var(--primary);
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    p, ul {
      color: #cbd5e1;
      margin-bottom: 0.75rem;
    }
    ul {
      padding-right: 1.5rem;
    }
    li {
      margin-bottom: 0.5rem;
    }
    .highlight-box {
      background: rgba(56, 189, 248, 0.08);
      border-right: 4px solid var(--primary);
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    footer {
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
      margin-top: 2rem;
      text-align: center;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    a {
      color: var(--primary);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .lang-toggle {
      font-size: 0.85rem;
      margin-top: 1rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">מערכת משפחתית Time+</div>
      <h1>מדיניות פרטיות (Privacy Policy)</h1>
      <p class="subtitle">עודכן לאחרונה: 30 בספטמבר 2026</p>
    </header>

    <div class="highlight-box">
      <strong>תקציר ברור ופשוט:</strong> אפליקציית <strong>Time+</strong> היא מערכת משפחתית פנימית לניהול משימות ודקות מסך. איננו אוספים מידע אישי מזהה מילדים, איננו מציגים פרסומות מכל סוג שהוא, איננו עוקבים אחרי המשתמשים, ואיננו מוכרים או חולקים מידע עם אף גורם שלישי.
    </div>

    <section>
      <h2>1. ייעוד המערכת והגנה על ילדים</h2>
      <p>
        אפליקציית Time+ פותחה עבור משפחות במטרה לעודד הרגלים חיוביים וניהול מאוזן של זמני מסך. האפליקציה תוכננה בהתאם לסטנדרטים המחמירים ביותר להגנת פרטיות ילדים ברשת (כולל עמידה בכללי COPPA ומדיניות המשפחות של Google Play).
      </p>
    </section>

    <section>
      <h2>2. המידע הנשמר במערכת</h2>
      <p>המידע הנשמר במערכת הוא מינימלי ומשמש באופן בלעדי לתפקוד שירותי האפליקציה עבור המשפחה:</p>
      <ul>
        <li><strong>פרופיל משפחתי וילדים:</strong> שם פרטי או כינוי של בני המשפחה, אווטאר שנבחר וצבע מועדף. אין צורך ואין דרישה להזנת שם מלא, כתובת, גיל מדויק או מספרי תעודת זהות.</li>
        <li><strong>קוד גישה (PIN):</strong> קודי הגישה אינם נשמרים כטקסט קריא. הם נשמרים בצורה מוצפנת חד-כיוונית ומגובבת (Cryptographic Hash עם Salt ייחודי ו-Pepper סודי) כך שאף גורם אינו יכול לראות את הקוד המקורי.</li>
        <li><strong>משימות ומאזן דקות:</strong> שמות המשימות שההורים יצרו, סטטוס ביצוע המשימות, מאזן דקות המסך ורישומי היסטוריה של צבירה וניצול דקות.</li>
        <li><strong>צילומי אישור (אופציונלי):</strong> במידה וההורה הפעיל דרישת צילום למשימה מסוימת, התמונה נשמרת אך ורק לצורך אישור המשימה על ידי ההורה בתוך החשבון המשפחתי.</li>
      </ul>
    </section>

    <section>
      <h2>3. מה איננו אוספים?</h2>
      <ul>
        <li>❌ איננו אוספים מיקום גיאוגרפי (GPS או מיקום מדויק).</li>
        <li>❌ איננו אוספים פרטי קשר של ילדים (ללא אימייל, ללא טלפון, ללא רשימת אנשי קשר).</li>
        <li>❌ איננו אוספים מזהי פרסום (Advertising IDs) או מזהי מכשיר ייחודיים.</li>
        <li>❌ איננו מתקינים סקריפטים של מעקב (No Trackers, No Third-Party Analytics SDKs).</li>
      </ul>
    </section>

    <section>
      <h2>4. ללא פרסומות (Zero Ads)</h2>
      <p>
        אפליקציית Time+ נקייה לחלוטין מפרסומות. אין פרסומות באפליקציה, אין פרסומות מותאמות אישית, ואין שום ממשק לרשתות פרסום.
      </p>
    </section>

    <section>
      <h2>5. אבטחת מידע והצפנה</h2>
      <p>
        כל המידע המועבר בין האפליקציה בטלפון (אנדרואיד) או בדפדפן (Web) לבין השרתים מוצפן בתקן המחמיר ביותר באמצעות HTTPS / TLS 1.3. הנתונים מאוחסנים בענן מאובטח של Cloudflare עם בקרת גישה קפדנית.
      </p>
    </section>

    <section>
      <h2>6. שליטת הורים ומחיקת מידע</h2>
      <p>
        להורים יש שליטה מלאה בנתונים בכל עת. הורה רשאי לערוך או למחוק כל משימה, רישום שימוש או פרופיל ילד ישירות מממשק הניהול של האפליקציה. כמו כן, ניתן לפנות למפתח בדוא"ל בכל עת לבקש מחיקה מוחלטת של כל נתוני המשפחה מהשרתים.
      </p>
    </section>

    <section>
      <h2>7. יצירת קשר</h2>
      <p>
        לכל שאלה, הבהרה או בקשה בנושא פרטיות ואבטחת נתונים, ניתן לפנות למפתח המערכת:
        <br>
        <strong>יניב ס. (Time+ Developer)</strong>
        <br>
        דוא"ל: <a href="mailto:yanivsa@gmail.com">yanivsa@gmail.com</a>
      </p>
    </section>

    <footer>
      <p>© 2026 Time+ • כל הזכויות שמורות • נועד לשימוש משפחתי אחראי ומאוזן</p>
    </footer>
  </div>
</body>
</html>`;
}
