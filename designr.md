# Kampusync — UI/UX Design Specification

> **Product:** Kampusync  
> **Design direction:** Professional university academic portal  
> **Reference:** myITS Portal / SI Akademik / myITS Presensi sebagai benchmark pola layanan  
> **Platform:** Responsive web application  
> **Frontend:** Next.js + TypeScript + Tailwind CSS + shadcn/ui

---

## 1. Design Goal

Membuat portal akademik yang terasa profesional, terstruktur, dan mudah dipahami oleh tiga kelompok pengguna utama: Admin Akademik, Dosen, dan Mahasiswa.

Kampusync mengambil inspirasi dari myITS pada sisi:
- portal terpusat untuk mengakses layanan;
- informasi yang disusun berdasarkan peran;
- akses cepat ke aktivitas akademik;
- dashboard yang merangkum informasi penting;
- alur akademik yang jelas dari perencanaan studi sampai hasil studi.

Kampusync tidak menyalin logo, identitas visual, ilustrasi, atau layout myITS secara persis. Identitas visual harus berdiri sendiri.

## 2. Prinsip UX

1. **Role-first:** navigasi dan informasi utama menyesuaikan role pengguna.
2. **Task-first:** aksi yang paling sering dilakukan harus mudah ditemukan.
3. **Clear status:** status KRS, presensi, dan nilai harus terlihat jelas.
4. **Progressive disclosure:** tampilkan ringkasan terlebih dahulu; detail muncul saat dibutuhkan.
5. **Consistency:** pola tabel, filter, form, modal, badge, dan notifikasi konsisten.
6. **Responsive:** dashboard tetap dapat digunakan pada layar kecil.
7. **Safe actions:** aksi berisiko seperti menonaktifkan akun atau mengubah data akademik memerlukan konfirmasi.
8. **Accessible:** navigasi keyboard, label form, fokus yang jelas, dan kontras teks yang cukup.

## 3. Information Architecture

### 3.1 Global shell

- Sidebar navigasi di desktop.
- Header berisi nama halaman, pencarian (bila relevan), notifikasi, dan menu profil.
- Breadcrumb untuk halaman bertingkat.
- Konten utama menggunakan lebar yang nyaman dibaca.
- Pada mobile, sidebar berubah menjadi drawer/menu navigasi.

### 3.2 Navigasi Mahasiswa

```text
Beranda
Akademik
  ├─ Kartu Rencana Studi (KRS)
  ├─ Jadwal Kuliah
  ├─ Presensi
  ├─ Nilai
  └─ Kartu Hasil Studi (KHS)
Informasi
  ├─ Kalender Akademik
  └─ Pengumuman
Profil
```

### 3.3 Navigasi Dosen

```text
Beranda
Pengajaran
  ├─ Kelas Saya
  ├─ Jadwal Mengajar
  ├─ Presensi
  └─ Pengelolaan Nilai
Perwalian
  └─ Persetujuan KRS
Profil
```

Menu Persetujuan KRS hanya ditampilkan untuk dosen yang memiliki mahasiswa bimbingan. Pemeriksaan hak akses tetap dilakukan di server.

### 3.4 Navigasi Admin Akademik

```text
Dashboard
Data Akademik
  ├─ Fakultas
  ├─ Program Studi
  ├─ Mahasiswa
  ├─ Dosen
  ├─ Mata Kuliah
  └─ Periode Akademik
Operasional
  ├─ Kelas Perkuliahan
  ├─ Jadwal
  └─ KRS
Laporan
Pengaturan
```

## 4. Visual Direction

### 4.1 Karakter visual

- Formal, modern, bersih, dan tidak terlalu dekoratif.
- Dominan warna netral dengan satu warna primer brand.
- Gunakan ruang kosong secara terukur; hindari area kosong besar yang tidak memiliki fungsi.
- Gunakan ikon sederhana dan konsisten.
- Hindari terlalu banyak warna status dalam satu layar.

### 4.2 Palet warna awal

Palet ini adalah rekomendasi awal untuk identitas Kampusync, bukan palet resmi ITS.

| Token | Warna | Penggunaan |
|---|---|---|
| Primary | `#2457A6` | Tombol utama, link aktif, elemen brand |
| Primary dark | `#183F7A` | Hover/active state |
| Background | `#F6F8FB` | Latar halaman |
| Surface | `#FFFFFF` | Card, tabel, panel |
| Text primary | `#172033` | Judul dan teks utama |
| Text secondary | `#64748B` | Metadata dan deskripsi |
| Border | `#E2E8F0` | Garis pembatas |
| Success | `#16803D` | Disetujui, berhasil, hadir |
| Warning | `#B7791F` | Menunggu, perlu perhatian |
| Danger | `#C53030` | Ditolak, gagal, alpa |
| Info | `#2563EB` | Informasi dan status netral |

Gunakan warna status bersama label teks; jangan mengandalkan warna saja.

### 4.3 Tipografi dan spacing

- Font: Inter atau font sans-serif sistem.
- Page title: 24–28 px desktop, 22–24 px mobile.
- Section title: 16–20 px.
- Body: 14–16 px.
- Caption/metadata: 12–13 px.
- Skala spacing berbasis kelipatan 4 atau 8 px.
- Radius card: 12–16 px; input/button: 8–10 px.
- Shadow tipis hanya untuk memisahkan layer, bukan dekorasi berlebihan.

## 5. Komponen UI

| Komponen | Ketentuan |
|---|---|
| Sidebar | Active state jelas, ikon + label, dapat collapse pada desktop |
| Header | Judul/konteks halaman, notifikasi, profil |
| Breadcrumb | Menunjukkan lokasi halaman pada struktur navigasi |
| Stat card | Angka utama, label, keterangan singkat; jangan terlalu banyak |
| Data table | Search, filter, sorting, pagination, empty state |
| Status badge | Draft, Diajukan, Disetujui, Ditolak, Aktif, Nonaktif |
| Form field | Label permanen, helper text, pesan error dekat field |
| Modal/dialog | Untuk konfirmasi atau aksi singkat, bukan form panjang |
| Toast | Untuk umpan balik singkat setelah aksi; tidak menggantikan pesan validasi |
| Empty state | Menjelaskan mengapa data kosong dan aksi selanjutnya |
| Loading state | Skeleton untuk konten; spinner untuk aksi singkat |
| Confirmation dialog | Untuk aksi destruktif/non-reversibel |

## 6. Spesifikasi Halaman

### 6.1 Login

**Tujuan:** pengguna masuk ke portal.

Elemen:
- Logo/wordmark Kampusync.
- Judul “Masuk ke Kampusync”.
- Input email/NIM (sesuai kebijakan akun).
- Input password dengan toggle visibility.
- Tombol masuk.
- Pesan error yang informatif tetapi tidak membocorkan apakah email terdaftar.
- Layout sederhana dan fokus pada form.

### 6.2 Dashboard Mahasiswa

Urutan konten yang direkomendasikan:
1. Greeting dan identitas ringkas (nama, NIM, program studi, semester).
2. Kartu status semester dan status KRS.
3. Jadwal kuliah terdekat.
4. Ringkasan presensi.
5. Nilai terbaru yang telah dipublikasikan.
6. Pengumuman/notifikasi.
7. Quick actions: Isi KRS, Lihat Jadwal, Lihat Presensi, Buka KHS.

Hindari menampilkan semua data sekaligus. Prioritaskan aktivitas yang membutuhkan tindakan mahasiswa.

### 6.3 Dashboard Dosen

- Ringkasan kelas yang diampu.
- Jadwal mengajar hari ini/pekan ini.
- KRS mahasiswa bimbingan yang menunggu persetujuan.
- Kelas dengan presensi yang belum diselesaikan.
- Status pengisian/publikasi nilai.
- Notifikasi aktivitas terbaru.

### 6.4 Dashboard Admin Akademik

- Total mahasiswa aktif.
- Total dosen aktif.
- Total program studi.
- Total kelas pada periode aktif.
- Ringkasan KRS menunggu persetujuan.
- Ringkasan operasional presensi/nilai.
- Quick actions ke data master, kelas, jadwal, dan laporan.

Gunakan statistik yang benar-benar berguna untuk tindakan operasional. Jangan membuat grafik hanya untuk mengisi ruang.

### 6.5 KRS Mahasiswa

Struktur:
- Header periode akademik dan status periode KRS.
- Ringkasan SKS yang dipilih.
- Daftar kelas tersedia dengan pencarian/filter.
- Informasi kode/nama mata kuliah, SKS, kelas, dosen, jadwal, kapasitas.
- Indikator konflik/prasyarat/kapasitas.
- Daftar kelas terpilih.
- Tombol Simpan Draft dan Ajukan KRS.

Ketika ada konflik, tampilkan alasan spesifik (misalnya jadwal bentrok atau prasyarat belum terpenuhi), bukan hanya “KRS tidak valid”.

### 6.6 Persetujuan KRS oleh Dosen Wali

- Daftar mahasiswa bimbingan.
- Filter status `SUBMITTED`.
- Detail KRS: daftar kelas, SKS, jadwal, dan catatan validasi.
- Tombol Setujui.
- Tombol Tolak yang mewajibkan alasan.
- Riwayat keputusan sebelumnya.

### 6.7 Jadwal Kuliah

- Tampilan daftar sebagai default.
- Opsi tampilan kalender mingguan.
- Filter periode dan kelas.
- Informasi hari, waktu, ruang, mata kuliah, kelas, dan dosen.
- Pada mobile, gunakan list/card agar jadwal tidak terpotong oleh tabel lebar.

### 6.8 Presensi

**Dosen:**
- Pilih kelas.
- Buat sesi/pertemuan.
- Pilih metode Manual atau QR.
- Untuk manual: daftar mahasiswa dan kontrol status.
- Untuk QR: tampilkan QR, waktu aktif, dan status sesi.
- Tutup sesi dan lihat rekap.

**Mahasiswa:**
- Pilih kelas aktif.
- Pindai QR atau masukkan kode jika alur kode diaktifkan.
- Tampilkan hasil berhasil/gagal dengan alasan yang jelas.
- Lihat riwayat presensi per mata kuliah.

### 6.9 Pengelolaan Nilai

- Pilih kelas.
- Kelola komponen dan bobot.
- Tabel mahasiswa dengan nilai tiap komponen.
- Tampilkan validasi total bobot.
- Pratinjau nilai akhir.
- Simpan draft dan terbitkan nilai.
- Konfirmasi sebelum publikasi.
- Perubahan setelah publikasi harus mengikuti kebijakan dan dicatat.

### 6.10 KHS

- Pilih periode akademik.
- Ringkasan IPS dan total SKS.
- Tabel mata kuliah, SKS, nilai angka/huruf, dan bobot mutu bila kebijakan mendukung.
- Tombol cetak/unduh.
- Tampilkan keterangan bila ada nilai belum diterbitkan.

### 6.11 Manajemen Data oleh Admin

Untuk tabel Mahasiswa, Dosen, Mata Kuliah, Fakultas, Program Studi, dan Kelas:
- Judul halaman dan deskripsi singkat.
- Tombol tambah data.
- Search dan filter.
- Tabel dengan kolom inti.
- Aksi detail/edit/nonaktifkan.
- Form tambah/edit memakai validasi inline.
- Gunakan arsip/nonaktif untuk data yang sudah terhubung ke transaksi akademik.

## 7. UX State dan Feedback

### Status KRS
- Draft: belum diajukan.
- Diajukan: menunggu keputusan dosen wali.
- Disetujui: KRS telah disetujui.
- Ditolak: sertakan alasan dan langkah berikutnya.

### Status nilai
- Draft: belum diterbitkan.
- Published: sudah dapat dilihat mahasiswa.
- Locked: tidak dapat diubah melalui alur normal.

### Status presensi
- Hadir, Izin, Sakit, Alpa.
- Sesi QR: Aktif, Ditutup, Kedaluwarsa.

### Feedback
- Sukses: jelaskan aksi yang berhasil.
- Gagal: jelaskan penyebab dan cara memperbaiki.
- Loading: nonaktifkan tombol submit selama request berjalan untuk mencegah klik ganda.
- Empty state: berikan konteks dan CTA yang relevan.
- Destructive action: gunakan dialog konfirmasi dan jelaskan dampaknya.

## 8. Responsive Behavior

| Area | Desktop | Tablet | Mobile |
|---|---|---|---|
| Navigation | Sidebar tetap/collapsible | Sidebar collapsible | Drawer |
| Dashboard cards | 3–4 kolom sesuai ruang | 2 kolom | 1 kolom |
| Data table | Tabel penuh | Tabel dengan scroll terkontrol | Ubah menjadi list/card untuk data penting |
| Form | 2 kolom bila masuk akal | 1–2 kolom | 1 kolom |
| Schedule | Kalender mingguan + list | List/kalender ringkas | List berdasarkan hari |
| Dialog | Modal terpusat | Modal responsif | Full-screen sheet bila form panjang |

## 9. Accessibility Checklist

- Semua input memiliki label.
- Error field dikaitkan dengan input yang benar.
- Semua aksi dapat diakses dengan keyboard.
- Focus ring terlihat.
- Warna teks dan background memiliki kontras memadai.
- Status tidak dibedakan hanya dengan warna.
- Tombol memiliki nama aksi yang jelas.
- Tabel memiliki header yang bermakna.
- QR Code selalu disertai instruksi alternatif jika pemindaian tidak dapat dilakukan.

## 10. Frontend Implementation Guidance

- Next.js App Router.
- TypeScript untuk tipe data dan kontrak antar-layer.
- Tailwind CSS untuk styling.
- shadcn/ui sebagai fondasi komponen yang dapat dikustomisasi.
- Gunakan Server Components untuk halaman yang mengambil data awal.
- Gunakan Client Components hanya untuk interaksi yang memang membutuhkan state browser.
- Semua akses PostgreSQL dilakukan pada server melalui service/repository dan `pg`.
- Jangan mengakses database dari browser.
- Validasi input di server; validasi client hanya untuk pengalaman pengguna.
- Pisahkan komponen berdasarkan domain/fitur agar mudah dirawat.

## 11. Design Acceptance Criteria

- Pengguna dapat memahami role dan lokasi halaman dari navigasi.
- Aksi utama setiap halaman mudah ditemukan.
- Status proses akademik terlihat dan memiliki arti yang konsisten.
- Tabel memiliki search/filter/pagination ketika datanya berpotensi banyak.
- Form memberi pesan validasi yang spesifik.
- Tampilan tetap usable pada lebar ponsel.
- Aksi penting memiliki loading, success, error, dan empty state.
- Antarmuka tidak menyalin identitas visual myITS secara persis.

## 12. Referensi

- myITS overview: https://www.its.ac.id/mahasiswa/myits/
- SI Akademik: https://servicedesk.its.ac.id/client/view_knowledge/13
- myITS Portal: https://servicedesk.its.ac.id/client/view_knowledge/15
- Panduan myITS Portal: https://dptsi.atlassian.net/wiki/spaces/APPDOCS/pages/1889501199/Panduan+Civitas+Akademik+myITS+Portal
- myITS Academics: https://dptsi.atlassian.net/wiki/spaces/APPDOCS/pages/2357460995/myITS+Academics+mia.its.ac.id
