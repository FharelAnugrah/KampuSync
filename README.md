# Kampusync — One Campus, Connected Academics

Sistem Informasi Manajemen Akademik Terintegrasi berbasis **Next.js App Router + JavaScript + PostgreSQL (`pg` raw SQL, tanpa ORM) + Tailwind CSS**.

## Fitur Utama (MVP)
- **Autentikasi & RBAC Server-Side**: Login via Email / NIM / NIDN, sesi cookie bertanda tangan HMAC-SHA256, pemeriksaan peran dan kepemilikan data di server (`ADMIN`, `LECTURER`, `STUDENT`).
- **Admin Akademik**: Manajemen Fakultas, Program Studi, Mahasiswa (+ akun & Dosen Wali), Dosen, Mata Kuliah (+ prasyarat), Periode Akademik, Kelas Perkuliahan, Jadwal dengan deteksi bentrok otomatis, Kebijakan Akademik, Laporan & Ekspor CSV.
- **Mahasiswa**: Beranda ringkas, pengisian KRS dengan validasi prasyarat/bentrok/kapasitas/batas SKS, Jadwal Kuliah (daftar & kalender mingguan), Presensi QR/Kode, Nilai diterbitkan, KHS (IPS/IPK + cetak PDF), Kalender Akademik, dan Pengumuman.
- **Dosen & Dosen Wali**: Beranda mengajar, Kelas Saya, Jadwal Mengajar, Presensi Manual & QR Code, Pengelolaan Komponen/Bobot/Nilai & Publikasi (dengan log audit pasca-publikasi), serta Persetujuan/Penolakan KRS mahasiswa bimbingan.

## Menjalankan Proyek

### 1. Siapkan PostgreSQL Lokal
Buat database `kampusync` di PostgreSQL lokal (misalnya melalui pgAdmin), lalu salin `.env.example` ke `.env.local` dan sesuaikan `DATABASE_URL` dengan username dan password PostgreSQL Anda.

### 2. Jalankan Migrasi & Seed Data Demo
Anda dapat menjalankan skrip migrasi & seed lewat terminal:
```bash
npm run db:migrate
npm run db:seed
```
*(Alternatif: jalankan file `db/pgadmin_setup.sql` langsung melalui Query Tool di pgAdmin).*

### 3. Jalankan Aplikasi
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000).

### Akun Demo Sintetis (Password: `Kampusync123!`)
- **Admin Akademik**: `admin@kampusync.ac.id`
- **Dosen & Dosen Wali**: `ahmad.fauzi@kampusync.ac.id`
- **Mahasiswa**: `2024101001` (`nadia.putri@student.kampusync.ac.id`)

## Verifikasi Kode
```bash
npm test
npm run lint
npm run build
```
