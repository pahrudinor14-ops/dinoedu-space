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

## Deploy frontend

Frontend dapat dipasang di layanan hosting static yang mendukung Vite.

1. Hubungkan repository GitHub dan pilih branch produksi (`master` saat panduan ini dibuat).
2. Atur perintah instalasi `npm ci`, perintah build `npm run build`, dan folder hasil `dist`.
3. Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` pada environment variables untuk environment produksi. Tambahkan variabel `VITE_DINOMATH_*` bila memakai URL PDF atau seri DinoMath lain.
4. Atur fallback SPA pada layanan hosting agar path aplikasi seperti `/app/cv`, `/app/surat`, dan `/app/soal` menyajikan `index.html`. Gunakan aturan rewrite/fallback yang sesuai dengan penyedia hosting.
5. Deploy branch produksi. Untuk mencoba hasil build secara lokal, jalankan:

   ```bash
   npm run build
   npm run preview
   ```

Nilai dengan awalan `VITE_` dimasukkan ke bundle frontend dan dapat dilihat pengguna. Gunakan hanya URL Supabase dan publishable key di sana. Jangan memasukkan `SUPABASE_SERVICE_ROLE_KEY`, API key Gemini, atau secret Midtrans ke environment frontend.

## Deploy Supabase

Pastikan URL frontend produksi sudah ditambahkan ke **Authentication → URL Configuration** pada proyek Supabase: isi Site URL dan Redirect URLs agar login email kembali ke domain aplikasi.

Untuk menerapkan migrasi database yang belum ada di proyek tujuan:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Tinjau file migrasi di `supabase/migrations` dan target proyek sebelum menjalankan `db push`.

Deploy Edge Functions setelah perubahan fungsi atau saat menyiapkan proyek baru:

```bash
supabase functions deploy dinoai-chat
supabase functions deploy dinoai-cv
supabase functions deploy midtrans-create-payment
supabase functions deploy midtrans-create-token-payment
supabase functions deploy midtrans-payment-status
supabase functions deploy midtrans-payment-webhook
supabase functions deploy midtrans-token-payment-status
supabase functions deploy midtrans-token-webhook
supabase functions deploy midtrans-webhook
```

Atur secret server melalui **Supabase Dashboard → Edge Functions → Secrets**. Gemini membutuhkan `GEMINI_API_KEY_DINO_AI`; fitur pembayaran Midtrans membutuhkan `MIDTRANS_SERVER_KEY`. `GEMINI_MODEL` dapat diatur opsional. Jangan menaruh secret tersebut di `.env.local` dengan awalan `VITE_`, di repository, atau di pengaturan hosting frontend. Setelah deploy, pastikan URL notifikasi Midtrans menunjuk ke Edge Function webhook yang digunakan oleh konfigurasi pembayaran proyek.

## Perintah proyek

- `npm run dev` — server pengembangan Vite.
- `npm run build` — pemeriksaan TypeScript dan build produksi ke `dist`.
- `npm run preview` — sajikan hasil build lokal.
- `npm run lint` — jalankan ESLint.
