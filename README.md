# THREE MISTER - Management System & Accounting

Aplikasi sistem manajemen operasional dan akuntansi keuangan **THREE MISTER**, terintegrasi dengan Google Sheets, dilengkapi dashboard Accurate Online style, Jurnal Umum, Buku Besar, Neraca Saldo, Laporan Keuangan (Laba Rugi, Neraca, Arus Kas), Kalkulator HPP Kaos, dan Ekspor Laporan PDF Profesional.

---

## 🔐 Solusi Error: `Firebase: Error (auth/unauthorized-domain)`

Jika Anda melihat pesan error:
```
Firebase: Error (auth/unauthorized-domain)
```
saat menekan tombol **Masuk Dengan Google** setelah aplikasi di-deploy (misalnya ke GitHub Pages `https://username.github.io/...` atau domain khusus):

### Mengapa Ini Terjadi?
Firebase Authentication memiliki fitur keamanan bernama **Authorized Domains (Domain yang Diotorisasi)**. Firebase secara default **hanya mengizinkan** login dari domain bawaan (`localhost`, `*.firebaseapp.com`, `*.web.app`). Ketika aplikasi dibuka dari domain baru (seperti GitHub Pages atau domain kustom Anda), Firebase akan memblokir otorisasi sampai domain tersebut didaftarkan.

### Cara Memperbaiki (Langkah 1 Menit):

1. **Buka Firebase Console Authentication Settings**:
   👉 [https://console.firebase.google.com/project/gen-lang-client-0924079852/authentication/settings](https://console.firebase.google.com/project/gen-lang-client-0924079852/authentication/settings)
2. Klik tab **Authorized domains** (Domain yang diotorisasi).
3. Klik tombol **Add domain** (Tambah domain).
4. Masukkan domain deployment GitHub Pages Anda:
   - Ketik: **`threemister.github.io`** (atau cukup **`github.io`**).
5. Klik **Save** (Simpan).
6. Buka kembali aplikasi di [https://threemister.github.io/Sytem-Three-Mister/](https://threemister.github.io/Sytem-Three-Mister/) dan klik **Masuk Dengan Google**. Login dan integrasi Google Sheets langsung aktif 100%!

> 💡 **Tip:** Anda juga dapat langsung mengklik tombol **"Masuk Mode Demo Offline"** pada halaman login kapan saja untuk menggunakan seluruh fitur pencatatan, kalkulator HPP, jurnal, neraca saldo, dan cetak PDF tanpa terhambat otorisasi awan.

---

## 🚀 Panduan Push ke GitHub Pages (threemister/Sytem-Three-Mister)

Aplikasi ini telah dilengkapi alur kerja otomatis `.github/workflows/static.yml` dan konfigurasi Vite `base: './'`.

### Perintah Push Pembaruan:
Di terminal proyek ini:
```bash
git remote add origin https://github.com/threemister/Sytem-Three-Mister.git
git branch -M main
git push -u origin main
```
3. Di halaman repository GitHub Anda:
   - Masuk ke **Settings** > **Pages**.
   - Pada bagian **Build and deployment > Source**, pilih **GitHub Actions**.
4. GitHub Actions akan otomatis melakukan build dan menerbitkan aplikasi ke:
   `https://USERNAME.github.io/NAMA-REPO/`

---

## 📊 Fitur Utama Sistem

- **Dashboard Accurate Online Style**: Ringkasan saldo kas & bank, piutang, persediaan, laba kotor, laba bersih, serta grafik arus kas dan pendapatan vs beban.
- **Daftar Akun (COA)**: Manajemen hierarki akun lengkap dengan saldo normal Debit/Kredit dan saldo awal.
- **Transaksi & Jurnal Otomatis**: Formulir input transaksi double-entry dengan pembuatan jurnal otomatis tanpa selisih.
- **Buku Besar & Neraca Saldo**: Pelacakan mutasi debit-kredit per akun serta verifikasi keseimbangan neraca.
- **Laporan Keuangan Komprehensif**: Laporan Laba Rugi, Neraca, Perubahan Modal, dan Arus Kas.
- **Ekspor PDF & Cetak**: Cetak dan unduh dokumen PDF resmi Ringkasan Keuangan (Laba Rugi & Neraca) dengan kop resmi THREE MISTER.
- **Kalkulator HPP Produk Kaos**: Perhitungan HPP per pcs meliputi bahan kain, jahit, sablon/DTF, label, packaging, dan overhead.
- **Sinkronisasi Google Sheets Real-time**: Otomatis menyimpan dan mencadangkan data ke Google Sheets pengguna.
