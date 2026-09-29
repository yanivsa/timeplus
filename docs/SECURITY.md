# TIME+ Security Architecture & Controls

TIME+ is built with high standards for family privacy, economic ledger integrity, and resistance to unauthorized access or tampering.

---

## 1. Authentication & Password Security

### 1.1 Multi-Iteration PBKDF2 Hashing
- **Algorithm**: PBKDF2 with HMAC-SHA-256.
- **Iterations**: 100,000 iterations.
- **Salt**: 16 bytes of cryptographically secure random bytes generated per user via Web Crypto (`crypto.getRandomValues`).
- **Pepper**: Server-side secret pepper (`SESSION_PEPPER`) mixed into the key derivation step, protecting against offline dictionary attacks even if the database is leaked.
- **Constant-Time Verification**: Password/PIN comparison uses constant-time byte-by-byte comparison to eliminate timing side-channel attacks.

### 1.2 Rate Limiting & Lockout Protection
- Login attempts are tracked in the `rate_limits` table in Cloudflare D1.
- **Threshold**: After 5 failed attempts within 15 minutes for an IP or account target, subsequent login attempts are rejected with HTTP 429 and a lockout duration response.
- Exponential backoff is applied to prevent brute-forcing child or parent PINs.

---

## 2. Session Management & Authorization

### 2.1 HttpOnly Session Cookies
- Sessions are stored as 256-bit cryptographically random tokens (`crypto.getRandomValues`).
- Session cookies are marked with:
  - `HttpOnly`: Prevents client-side scripts (XSS) from reading session tokens.
  - `Secure`: Transmitted strictly over HTTPS.
  - `SameSite=Lax`: Protects against Cross-Site Request Forgery (CSRF).
  - `Path=/`: Scoped to the single origin.

### 2.2 Role-Based Access Control (RBAC)
- **Parent Role**: Access to parent oversight APIs (`/api/parent/*`), template configuration, approvals, manual adjustments, and audit reports.
- **Child Role**: Scoped strictly to the authenticated child's own data (`/api/child/*`). Children are strictly blocked with HTTP 403 if attempting to call `/api/parent/*`.
- **Strict Privacy Across Children**: Children cannot view each other's balances, tasks, or request histories. There is no shared unauthenticated child endpoint.

---

## 3. Financial & Ledger Integrity

### 3.1 Immutable Append-Only Ledger
- The `minute_transactions` table enforces an append-only accounting ledger.
- Existing ledger rows are never updated or deleted by application logic.
- Corrections and refunds are recorded as new compensating transactions (`refund` or `manual_adjustment`) with mandatory audit notes.

### 3.2 Concurrency & Double-Credit Prevention
- Task approvals and screen requests check their current state in the database before transitioning (`status = 'submitted'` for tasks, `status = 'pending'` for screen requests).
- Duplicate approval submissions return HTTP 409 or ignore subsequent attempts without minting duplicate minutes.

---

## 4. Android Native Shell Hardening

The native Android APK (`com.yanivsa.timeplus`) incorporates strict security controls:

### 4.1 Strict Host Allowlist
- The WebView overrides `shouldOverrideUrlLoading` to allow navigation strictly within `https://timeplus.yanivsa.workers.dev`.
- Any external URL navigation is intercepted and safely delegated to the system browser via `Intent.ACTION_VIEW`.

### 4.2 Cleartext Traffic Prohibition
- `android:usesCleartextTraffic="false"` is enforced in `AndroidManifest.xml`.
- No unencrypted HTTP requests are permitted under any circumstances.

### 4.3 Safe File Handling
- Photo evidence uploads use Android's `ActivityResultContracts.GetContent()` via `WebChromeClient.onShowFileChooser`.
- Only `image/*` MIME types are accepted, preventing arbitrary file execution or unintended file disclosure.
