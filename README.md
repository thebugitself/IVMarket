# IVM — ID-Networkers Vulnerable Marketplace

> **THIS APPLICATION IS INTENTIONALLY INSECURE.**
> **For security training and penetration testing labs ONLY.**
> **Do NOT deploy in production or on public networks.**

---

## Tujuan Lab

Lab ini dirancang untuk **memahami kerentanan web application** berdasarkan **OWASP Top 10**.
Fokus utama bukan pada mencari flag, melainkan:

1. **Menemukan** kerentanan yang ada
2. **Memahami** mengapa kerentanan tersebut berbahaya
3. **Mengeksploitasi** untuk membuktikan dampaknya
4. **Mengetahui** cara mitigasi yang benar

---

## Quick Start
```bash
git clone https://github.com/thebugitself/IVMarket.git
```
```bash
docker compose up --build
```

| Service   | URL                          | Credentials           |
|-----------|------------------------------|-----------------------|
| Frontend  | http://localhost              | —                     |
| Backend   | http://localhost:3001         | —                     |
| MySQL     | localhost:3306               | root / rootpassword   |
| Redis     | localhost:6379               | (no password)         |

### Default Accounts

| Username   | Password     | Role  |
|------------|-------------|-------|
| admin      | admin123    | admin |
| john_doe   | password123 | user  |
| jane_smith | password123 | user  |
| bob_wilson | password123 | user  |

---

## Project Structure

```
├── docker-compose.yml        # All services
├── init.sql                  # Database schema + seed data
├── cheat-sheet.txt           # Vulnerability guide & exploit reference
├── vulnerabilities.md        # Detailed OWASP vulnerability map
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js             # All API endpoints (intentionally broken)
│   └── uploads/              # Public upload directory
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── App.css
        ├── context/AuthContext.jsx
        └── components/
            ├── Navbar.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── Marketplace.jsx
            ├── ProductDetail.jsx
            ├── Profile.jsx
            ├── AddProduct.jsx
            ├── Search.jsx
            ├── Checkout.jsx
            ├── Wallet.jsx
            ├── Orders.jsx
            ├── AdminDashboard.jsx
            ├── AdminUsers.jsx
            ├── AdminLogs.jsx
            ├── AdminPing.jsx
            └── AdminExport.jsx
```

---

See [vulnerabilities.md](vulnerabilities.md) for full details and [cheat-sheet.txt](cheat-sheet.txt) for exploit guidance.

---

## License

This project is provided as-is for educational purposes only. Use responsibly.
