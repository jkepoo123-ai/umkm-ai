# AI UMKM Indonesia — Panduan Deploy

Struktur proyek:
```
umkm-ai/
├── index.html
├── schema/
│   └── schema.sql           ← struktur tabel database (users, sessions, contact_messages)
└── functions/
    └── api/
        ├── chat.js          ← chat AI (Gemini) + rate limit + memory percakapan
        ├── contact.js       ← simpan pesan form kontak ke database
        ├── register.js      ← daftar akun baru
        └── login.js         ← login + session cookie
```

---

## 1. Ambil API Key Groq
1. https://console.groq.com/keys → login/daftar (gratis) → **Create API Key** → salin (mulai dengan `gsk_...`).
2. Groq punya tier gratis dengan rate limit yang cukup besar dan responnya sangat cepat — cocok untuk chatbot seperti ini.

## 2. Push ke GitHub
```bash
git init
git add .
git commit -m "Initial commit: AI UMKM Indonesia"
git branch -M main
git remote add origin https://github.com/USERNAME/umkm-ai.git
git push -u origin main
```

## 3. Deploy ke Cloudflare Pages
1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pilih repo `umkm-ai`.
2. Build command: kosongkan. Build output directory: `/`.
3. **Save and Deploy**.

## 4. Buat Database D1 (untuk login & form kontak)
```bash
npx wrangler d1 create umkm-ai-db
```
Perintah di atas akan menampilkan `database_id` — catat itu. Lalu jalankan schema-nya:
```bash
npx wrangler d1 execute umkm-ai-db --remote --file=schema/schema.sql
```
Di dashboard Cloudflare Pages project-mu → **Settings** → **Functions** → **D1 database bindings** → **Add binding**:
- Variable name: `DB`
- D1 database: pilih `umkm-ai-db`

## 5. Buat KV Namespace (untuk rate limiting)
```bash
npx wrangler kv namespace create RATE_LIMIT_KV
```
Di dashboard → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**:
- Variable name: `RATE_LIMIT_KV`
- KV namespace: pilih namespace yang baru dibuat

## 6. Set Environment Variables
**Settings → Environment variables**, tambahkan (untuk Production, dan Preview kalau perlu):
| Name | Value |
|---|---|
| `GROQ_API_KEY` | API key dari langkah 1 |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` (opsional — model lain: `llama-3.1-8b-instant` untuk lebih cepat/hemat, cek daftar terbaru di console.groq.com) |
| `ALLOWED_ORIGIN` | `https://umkm-ai.pages.dev` (ganti sesuai domain final-mu — untuk izinkan chat dipanggil dari domain lain kalau perlu; untuk pemakaian normal di domain sendiri, bagian ini boleh dikosongkan) |

Setelah semua binding & variable diset, klik **Retry deployment**.

## 7. Selesai
- Buka `https://umkm-ai.pages.dev` (atau domain custom-mu).
- Coba chat AI (sekarang nyambung antar pertanyaan / ada memory).
- Coba **Daftar di sini** di modal login → buat akun → login pakai akun itu.
- Coba isi form Kontak → pesan tersimpan di tabel `contact_messages` di D1 (cek lewat `npx wrangler d1 execute umkm-ai-db --remote --command="SELECT * FROM contact_messages"`).

## Yang Sudah Diperbaiki
- ✅ Rate limiting per-IP (`chat.js`) — cegah spam menghabiskan kuota Gemini.
- ✅ CORS dibatasi ke domain sendiri, bukan `*`.
- ✅ Chat AI sekarang punya memory percakapan (nyambung antar pesan dalam satu sesi tab).
- ✅ Form kontak beneran tersimpan ke database (D1), bukan cuma `alert()`.
- ✅ Login & Daftar beneran terhubung ke database dengan password di-hash aman (PBKDF2), pakai session cookie httpOnly.
- ✅ Bagian **Tim Kami** ditandai jelas di `index.html` supaya gampang diganti nama/jabatannya.

## Masih Bisa Ditingkatkan Lagi (opsional, kalau mau serius produksi)
- Kirim email notifikasi tiap ada pesan kontak baru (butuh layanan seperti Resend/SendGrid + API key mereka).
- Halaman "profil user" setelah login (sekarang login cuma menyimpan session, belum ada halaman khusus member).
- Verifikasi email saat daftar akun.
- Logging/monitoring kalau Gemini API error atau kuota habis.
- Cek kuota gratis Gemini di https://ai.google.dev/pricing dan batas Cloudflare Pages/D1/KV di dashboard Cloudflare supaya tidak kena biaya tak terduga.
