# Security release checklist — DinoEdu Space

Gunakan checklist ini pada environment staging sebelum mengarahkan domain global
ke production. Perubahan source code saja tidak mengaktifkan kontrol di project
Supabase atau Cloudflare.

## 1. Deploy source dengan urutan aman

1. Pastikan backup database terbaru dapat dipulihkan dan catat waktu pemulihannya.
2. Deploy seluruh Edge Function berikut dari commit yang sama:
   `dinoai-chat`, `dinoai-cv`, `dinoai-surat`, `dinoai-soal`,
   `dinoai-modul-ajar`, `dinoai-lkpd`, `dinoai-rubrik`, `dinoai-evaluasi`,
   `midtrans-create-payment`, `midtrans-create-token-payment`,
   `midtrans-payment-status`, dan `midtrans-token-payment-status`.
3. Terapkan migrasi `20261112010000_enforce_opt_in_mfa_step_up.sql` setelah
   function deploy selesai. Migrasi ini menambah policy RLS restrictive untuk
   `dinoai_chat_conversations` dan `ai_documents`.
4. Build dan deploy frontend dari commit yang sama. Pastikan file
   `public/_headers` ikut tersalin ke output static assets Cloudflare.
5. Jangan arahkan DNS/domain global ke deployment ini sampai seluruh pemeriksaan
   staging di bawah lolos.

Webhook `midtrans-payment-webhook`, `midtrans-webhook`, dan
`midtrans-token-webhook` memang tidak meminta sesi pengguna. Pastikan webhook
tetap memvalidasi signature, status transaksi, mata uang, jumlah, dan referensi
order sebelum mengubah hak akses atau saldo.

## 2. Uji autentikasi, akses, dan privasi

- Akun tanpa faktor MFA terverifikasi tetap dapat memakai fitur yang diizinkan.
- Akun dengan MFA terverifikasi: token AAL1 ditolak oleh semua function AI dan
  endpoint pembayaran pengguna dengan `403`/`mfa_required`; setelah OTP valid
  menghasilkan token AAL2, permintaan yang sama berfungsi.
- Uji kondisi layanan MFA/Auth gagal: endpoint sensitif harus menolak dengan
  `503`, bukan melanjutkan operasi.
- Dua akun terpisah tidak dapat membaca, mengubah, atau menghapus percakapan
  maupun dokumen satu sama lain melalui API Supabase.
- Uji peran admin dan anggota NUMEA pada staging. Setiap RPC admin harus
  memeriksa peran di database dan grant execute hanya diberikan kepada role
  yang diperlukan. Source repository ini tidak memuat definisi inti RPC NUMEA;
  validasi ini harus dilakukan pada schema project Supabase yang sebenarnya.
- Pastikan webhook gagal tertutup untuk signature salah, order tidak dikenal,
  status yang belum dibayar, nominal/mata uang salah, dan callback duplikat.

## 3. Periksa batas, konfigurasi, dan pemulihan

- Pastikan production/staging memakai project Supabase dan kunci Midtrans yang
  berbeda. Simpan service-role, Gemini, dan Midtrans server key hanya di secret
  Supabase; jangan menaruhnya di `VITE_*`, repository, atau artefak browser.
- Batasi Site URL dan Redirect URLs Supabase ke domain produksi serta staging
  yang benar. Pastikan email confirmation, reset password, dan perubahan email
  kembali hanya ke origin yang diizinkan.
- Pastikan header `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`, HSTS, dan CSP terlihat pada respons
  static production. `_headers` tidak mengubah respons yang dibuat Worker.
- Aktifkan proteksi branch `master`: wajibkan review/status checks, blokir force
  push, dan batasi siapa yang boleh deploy. Verifikasi build/deploy hanya berjalan
  dari commit yang disetujui.
- Pastikan backup otomatis, retensi yang memadai, prosedur restore, pemantauan
  error/function quota, dan kontak eskalasi tersedia sebelum trafik global.
- Validasi kapasitas kuota AI: kode saat ini membatasi seluruh pengguna bersama
  pada 50 permintaan/hari dan 2 permintaan/menit. Satu akun dapat ikut menghabiskan
  kapasitas bersama. Sebelum global, tetapkan batas adil per akun, proteksi abuse,
  dan alert untuk lonjakan/kapasitas habis sesuai kuota provider AI.
- Aktifkan alert untuk lonjakan kegagalan login/MFA, `403 mfa_required`, error
  Edge Function, kegagalan webhook, dan penurunan sisa kuota. Pastikan log tidak
  merekam bearer token, OTP, isi dokumen pengguna, atau secret.
- Jalankan pemindaian dependency pada lockfile dan tinjau perubahan transitive
  sebelum rilis; build production harus menggunakan `npm ci` dari lockfile.
- Jalankan smoke test login, MFA, CRUD dokumen, semua generator AI, pembayaran
  sandbox, webhook, dan deep link `/app/*` di staging desktop serta mobile.

## 4. Catatan rilis

Global publish belum dapat dinyatakan siap hanya dari perubahan kode: aturan
branch/deploy Cloudflare, konfigurasi Supabase, migration state, secret, backup,
dan hasil staging tidak tersedia di repository. Jangan menganggap checklist ini
selesai sampai bukti dari dashboard dan smoke test staging dicatat.
