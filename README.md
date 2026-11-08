# DinoEdu Space

DinoEdu Space adalah aplikasi React, TypeScript, dan Vite. Frontend memakai Supabase untuk autentikasi dan layanan aplikasi, termasuk Edge Functions.

## Menjalankan secara lokal

1. Pasang dependensi:

   ```bash
   npm ci
   ```

2. Buat `.env.local` di folder proyek dan isi variabel frontend:

   ```dotenv
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
   ```

   `VITE_DINOMATH_PDF_URL` dan URL/judul `VITE_DINOMATH_SERIES_2_*` sampai `VITE_DINOMATH_SERIES_4_*` bersifat opsional.

3. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

## Deploy frontend ke Cloudflare Pages

Hubungkan repository GitHub ini ke Cloudflare Pages, lalu atur:

| Pengaturan | Nilai |
| --- | --- |
| Production branch | `master` |
| Root directory | `/` (folder repository) |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Node.js version | Dibaca dari `.node-version` (`22.23.4`) |

Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di **Settings → Environment variables** untuk Production dan Preview. Tambahkan `VITE_DINOMATH_*` hanya jika memakai URL PDF atau seri DinoMath lain. Setelah GitHub terhubung, push ke branch `master` akan memulai deployment.

`public/_redirects` mengatur fallback SPA agar URL aplikasi seperti `/app/cv`, `/app/surat`, dan `/app/soal` tetap membuka aplikasi saat dimuat langsung. Untuk deploy manual, jalankan `npm.cmd ci`, `npm.cmd run build`, lalu `npx.cmd wrangler pages deploy dist --project-name <NAMA_PROYEK_PAGES>` dari PowerShell.

Nilai dengan awalan `VITE_` dimasukkan ke bundle frontend dan dapat dilihat pengguna. Gunakan hanya URL Supabase dan publishable key di sana. Jangan memasukkan `SUPABASE_SERVICE_ROLE_KEY`, API key Gemini, atau secret Midtrans ke environment frontend.

Untuk menyiapkan perubahan lokal, meninjau file yang akan dikirim, lalu memicu deployment Cloudflare melalui integrasi GitHub:

```powershell
git status --short
git diff --check
git add -- README.md src supabase/functions supabase/migrations .node-version public/_redirects
git diff --cached --stat
git commit -m "Unify DinoAI credits and fix Cloudflare build"
git push origin master
```

Perintah `git add` di atas sengaja tidak mengambil file sementara `supabase/.temp`.

## Deploy Supabase

### Aturan kuota dan kredit DinoAI

Supabase menjadi sumber kebenaran untuk saldo, reservasi, pemakaian, dan refund.
Kuota harian memakai zona waktu WITA (Asia/Makassar), direset pukul 00.00, dan
tidak diakumulasikan. Paket aktif menentukan kuota harian: Gratis 5 kredit,
anggota NUMEA EDU yang disetujui 15 kredit, dan Supporter aktif 30 kredit.
Supporter aktif mendapat prioritas jika pengguna juga anggota NUMEA EDU.

| Fitur AI | Biaya |
| --- | ---: |
| Chat teks DinoAI | 1 kredit |
| Chat dengan lampiran, gambar, atau suara | 2 kredit |
| CV, Surat Lamaran, Soal, Modul Ajar, LKPD, Rubrik, Evaluasi | 2 kredit per hasil |
| Analisis coretan AI DinoLab | 2 kredit per analisis |

Kuota harian digunakan lebih dahulu. Jika sisa kuota harian kurang dari biaya
fitur, sistem memakai kredit pembelian untuk menutup selisih. Kredit tidak cukup
berarti permintaan ditolak sebelum dikirim ke Gemini. Kredit baru dicatat sebagai
pemakaian setelah reservasi berhasil; bila layanan AI gagal, reservasi dikembalikan.
Setiap fitur mencatat reservasi dengan labelnya sendiri agar riwayat pemakaian dan
refund dapat ditelusuri.

Belajar dan memakai simulasi interaktif DinoLab tidak memakai kredit. Hanya
tindakan **Analisis AI** pada canvas yang menggunakan 2 kredit. DinoLab
menampilkan sisa kuota harian dan kredit pembelian sebelum tindakan tersebut.
Semua fitur juga memakai batas operasional bersama 50 permintaan per hari dan
2 permintaan per menit.

Pastikan URL frontend produksi sudah ditambahkan ke **Authentication → URL Configuration** pada proyek Supabase: isi Site URL dan Redirect URLs agar login email kembali ke domain aplikasi.

Ganti `<PROJECT_REF>` dengan Project ID dari Supabase Dashboard → **Settings → General**. Perintah berikut ditujukan untuk PowerShell dan memakai CLI yang sudah tercatat di `package.json`:

```powershell
Set-Location C:\Users\ACER\dinoedu-space
$ProjectRef = "<PROJECT_REF>"
npx.cmd supabase login
npx.cmd supabase link --project-ref $ProjectRef
npx.cmd supabase migration list --linked
npx.cmd supabase db push --linked --dry-run
```

Periksa daftar migrasi pada dry run, lalu terapkan migrasi:

```powershell
npx.cmd supabase db push --linked
```

Deploy Edge Functions yang memakai aturan kredit bersama:

```powershell
$Functions = @(
  "dinoai-chat",
  "dinoai-cv",
  "dinoai-surat",
  "dinoai-soal",
  "dinoai-modul-ajar",
  "dinoai-lkpd",
  "dinoai-rubrik",
  "dinoai-evaluasi",
  "midtrans-create-token-payment"
)
foreach ($FunctionName in $Functions) {
  npx.cmd supabase functions deploy $FunctionName --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { throw "Deploy function gagal: $FunctionName" }
}
```

Atur secret server melalui **Supabase Dashboard → Edge Functions → Secrets**. Gemini membutuhkan `GEMINI_API_KEY_DINO_AI`; fitur pembayaran Midtrans membutuhkan `MIDTRANS_SERVER_KEY`. `GEMINI_MODEL` dapat diatur opsional. Jangan menaruh secret tersebut di `.env.local` dengan awalan `VITE_`, di repository, atau di pengaturan hosting frontend. Setelah deploy, pastikan URL notifikasi Midtrans menunjuk ke Edge Function webhook yang digunakan oleh konfigurasi pembayaran proyek.

## Perintah proyek

- `npm run dev` — server pengembangan Vite.
- `npm run build` — pemeriksaan TypeScript dan build produksi ke `dist`.
- `npm run preview` — sajikan hasil build lokal.
- `npm run lint` — jalankan ESLint.
