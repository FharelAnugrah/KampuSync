# Kampusync — Product Requirements Document (PRD)

> **Product name:** Kampusync  
> **Tagline:** One Campus, Connected Academics.  
> **Document version:** 1.0  
> **Status:** Draft untuk validasi tim  
> **Target platform:** Web application  
> **Primary stack:** Next.js + TypeScript + PostgreSQL  
> **Database access:** Raw SQL melalui `pg` (node-postgres), tanpa ORM

---

## 1. Ringkasan Produk

Kampusync adalah Sistem Informasi Manajemen Akademik Terintegrasi berbasis web untuk mengelola proses akademik pada satu universitas yang memiliki banyak fakultas dan program studi. Sistem menyatukan pengelolaan data mahasiswa, dosen, mata kuliah, kelas, jadwal, KRS, persetujuan dosen wali, presensi, nilai, KHS, dashboard, dan laporan.

Kampusync dirancang sebagai portal akademik dengan satu titik masuk dan tampilan yang menyesuaikan peran pengguna. Mahasiswa berfokus pada aktivitas studinya, dosen pada kelas dan aktivitas pengajaran, sedangkan Admin Akademik mengelola data master serta operasional akademik.

### 1.1 Masalah yang ingin diselesaikan

- Data akademik tersebar pada proses atau pencatatan yang berbeda.
- Mahasiswa membutuhkan akses yang mudah terhadap KRS, jadwal, presensi, nilai, dan riwayat hasil studi.
- Dosen membutuhkan alur terpusat untuk mengelola kelas, presensi, dan nilai.
- Admin Akademik membutuhkan data yang konsisten untuk mengelola periode, program studi, dosen, mata kuliah, kelas, dan pelaporan.
- Perubahan data akademik perlu memiliki jejak dan aturan agar riwayat akademik tetap dapat dipertanggungjawabkan.

### 1.2 Visi

Menyediakan satu portal akademik yang jelas, konsisten, mudah digunakan, dan membantu seluruh civitas akademika mengakses informasi sesuai kewenangannya.

## 2. Referensi Produk dan Prinsip Adaptasi

Kampusync menggunakan myITS sebagai **referensi pola layanan dan pengalaman**, bukan menyalin merek, aset visual, atau implementasi internal ITS.

| Referensi myITS | Hal yang dapat dipelajari | Adaptasi pada Kampusync |
|---|---|---|
| myITS Portal | Portal terpusat untuk mengakses layanan dan informasi sesuai hak akses | Satu dashboard Kampusync dengan navigasi berdasarkan role |
| SI Akademik | Biodata, FRS/perwalian, jadwal, nilai, prasyarat, transkrip, dan layanan akademik | Modul akademik inti berada dalam satu aplikasi |
| myITS Presensi | Pencatatan kehadiran termasuk kode/QR | Presensi manual oleh dosen dan QR Code per sesi |
| Dokumentasi myITS Portal | Beranda, aplikasi/layanan, kalender, agenda, pengumuman | Dashboard ringkas, kalender akademik, dan notifikasi |
| myITS Academics | Pengelolaan kelas, penjadwalan, kurikulum, dan nilai | Modul operasional dosen dan Admin Akademik |

Sumber referensi:
- https://www.its.ac.id/mahasiswa/myits/
- https://servicedesk.its.ac.id/client/view_knowledge/13
- https://servicedesk.its.ac.id/client/view_knowledge/15
- https://dptsi.atlassian.net/wiki/spaces/APPDOCS/pages/1889501199/Panduan+Civitas+Akademik+myITS+Portal
- https://dptsi.atlassian.net/wiki/spaces/APPDOCS/pages/2357460995/myITS+Academics+mia.its.ac.id

**Prinsip adaptasi:** ambil pola informasi yang terstruktur, navigasi yang konsisten, role-based access, dan alur akademik yang saling terhubung. Jangan menggunakan logo, nama layanan, ilustrasi, atau tampilan khas ITS seolah-olah merupakan bagian dari Kampusync.

## 3. Sasaran dan Pengguna

### 3.1 Sasaran produk

1. Mengintegrasikan proses akademik utama dalam satu aplikasi web.
2. Menyediakan informasi akademik yang relevan berdasarkan peran.
3. Mengurangi inkonsistensi data melalui validasi dan relasi database.
4. Menyediakan jejak persetujuan dan perubahan untuk proses penting.
5. Menyediakan ringkasan akademik dan laporan yang dapat digunakan Admin.

### 3.2 Peran pengguna

| Role | Deskripsi | Kewenangan utama |
|---|---|---|
| Admin Akademik | Pengelola operasional akademik universitas | Mengelola data master, periode, kelas, jadwal, akun, dan laporan |
| Dosen | Pengajar pada kelas yang ditugaskan | Melihat kelas, mengelola presensi, memasukkan dan menerbitkan nilai |
| Mahasiswa | Peserta kegiatan akademik | Melihat dashboard, mengisi KRS, melihat jadwal, presensi, nilai, dan KHS |
| Dosen Wali | Dosen yang diberi tanggung jawab sebagai penasihat akademik mahasiswa | Seluruh kemampuan Dosen yang relevan, ditambah meninjau dan menyetujui/menolak KRS mahasiswa bimbingan |

**Catatan:** Dosen Wali bukan role utama terpisah. Status dosen wali merupakan penugasan seorang Dosen terhadap mahasiswa bimbingan.

## 4. Ruang Lingkup

### 4.1 In scope — MVP

- Login, logout, sesi pengguna, dan pembatasan akses berdasarkan role.
- Manajemen fakultas dan program studi.
- Registrasi dan manajemen data mahasiswa oleh Admin.
- Manajemen data dosen.
- Manajemen mata kuliah.
- Manajemen periode akademik.
- Pembukaan kelas (class offering) untuk suatu mata kuliah pada periode tertentu.
- Pengelolaan jadwal dan pemeriksaan bentrok.
- Pengisian KRS oleh mahasiswa.
- Validasi KRS dan persetujuan/penolakan oleh Dosen Wali.
- Presensi manual dan QR Code.
- Pengelolaan komponen dan bobot nilai.
- Input nilai tugas, UTS, dan UAS; perhitungan nilai akhir.
- Publikasi nilai.
- KHS per periode akademik.
- Dashboard berdasarkan role.
- Notifikasi dalam aplikasi.
- Laporan aktivitas akademik dasar.

### 4.2 Out of scope untuk versi awal

- Pembayaran UKT dan integrasi keuangan.
- Penerimaan mahasiswa baru dan seleksi.
- LMS, materi pembelajaran, tugas daring, dan video conference.
- Aplikasi native Android/iOS.
- Integrasi SSO eksternal.
- Layanan beasiswa, asrama, prestasi, dan organisasi mahasiswa.
- Integrasi langsung ke PDDikti.
- Tanda tangan elektronik tersertifikasi.
- Analitik prediktif berbasis machine learning.

## 5. Alur Bisnis Utama

### 5.1 Registrasi mahasiswa

1. Admin Akademik membuka menu Mahasiswa.
2. Admin mengisi identitas, NIM, program studi, tahun masuk, dan dosen wali.
3. Sistem memvalidasi data wajib dan keunikan NIM/email.
4. Sistem membuat profil mahasiswa dan akun pengguna.
5. Mahasiswa dapat login menggunakan akun yang dibuat.

### 5.2 KRS dan perwalian

1. Mahasiswa memilih periode akademik aktif.
2. Sistem menampilkan kelas yang tersedia untuk periode tersebut.
3. Mahasiswa memilih kelas yang ingin diambil.
4. Sistem memvalidasi periode KRS, duplikasi kelas, prasyarat, bentrok jadwal, kapasitas, dan batas SKS.
5. Mahasiswa mengirim KRS.
6. Sistem mengubah status menjadi `SUBMITTED` dan memberi notifikasi kepada Dosen Wali.
7. Dosen Wali meninjau KRS.
8. Dosen Wali menyetujui atau menolak dengan alasan.
9. Sistem menyimpan keputusan dan memberi notifikasi kepada mahasiswa.
10. Jika ditolak dan periode masih terbuka, mahasiswa dapat memperbaiki lalu mengirim ulang.

Status KRS yang digunakan: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`.

### 5.3 Presensi

- Dosen memilih kelas dan membuat sesi pertemuan.
- Dosen memilih metode manual atau QR.
- Pada metode manual, dosen menandai status kehadiran mahasiswa dari daftar peserta kelas.
- Pada metode QR, mahasiswa memindai QR aktif dari sesi yang sedang berlangsung.
- Sistem memvalidasi sesi, token, waktu aktif, peserta kelas, dan duplikasi presensi.
- Sistem menyimpan presensi dan memperbarui rekap.

Status presensi awal: `PRESENT`, `EXCUSED`, `SICK`, `ABSENT`. Daftar status dapat disesuaikan dengan kebijakan akademik.

### 5.4 Pengelolaan nilai

1. Dosen memilih kelas.
2. Dosen mengatur komponen nilai dan bobotnya.
3. Dosen memasukkan nilai mahasiswa pada tiap komponen.
4. Sistem memvalidasi rentang nilai dan total bobot.
5. Sistem menghitung nilai akhir.
6. Dosen memeriksa hasil dan menerbitkan nilai.
7. Mahasiswa dapat melihat nilai yang sudah dipublikasikan.

Bobot komponen dibuat dapat dikonfigurasi. Nilai bobot final harus ditentukan oleh kebijakan akademik, bukan ditanam permanen di kode.

### 5.5 KHS

1. Mahasiswa memilih periode akademik.
2. Sistem mengambil kelas yang tercatat pada KRS dan nilai yang telah dipublikasikan.
3. Sistem menghitung IPS dan ringkasan SKS berdasarkan aturan akademik yang berlaku.
4. Sistem menampilkan KHS dan menyediakan opsi cetak/unduh.

Nilai yang belum dipublikasikan tidak ditampilkan sebagai nilai final pada KHS.

## 6. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-001 | Pengguna dapat login dan logout | Must |
| FR-002 | Sistem membatasi halaman dan aksi berdasarkan role | Must |
| FR-003 | Admin dapat mengelola fakultas dan program studi | Must |
| FR-004 | Admin dapat membuat dan mengelola akun serta profil mahasiswa | Must |
| FR-005 | Admin dapat mengelola data dosen dan penugasan dosen wali | Must |
| FR-006 | Admin dapat mengelola mata kuliah | Must |
| FR-007 | Admin dapat mengelola periode akademik | Must |
| FR-008 | Admin dapat membuka kelas dari mata kuliah pada periode tertentu | Must |
| FR-009 | Admin dapat mengatur jadwal, ruang, dan dosen kelas | Must |
| FR-010 | Sistem mendeteksi bentrok jadwal dosen, ruang, dan kelas | Must |
| FR-011 | Mahasiswa dapat melihat kelas yang ditawarkan | Must |
| FR-012 | Mahasiswa dapat membuat dan mengubah KRS selama periode mengizinkan | Must |
| FR-013 | Sistem memvalidasi prasyarat, kapasitas, duplikasi, bentrok, dan batas SKS | Must |
| FR-014 | Mahasiswa dapat mengirim KRS untuk persetujuan | Must |
| FR-015 | Dosen Wali dapat menyetujui atau menolak KRS mahasiswa bimbingan | Must |
| FR-016 | Sistem menyimpan riwayat keputusan KRS | Must |
| FR-017 | Dosen dapat membuat sesi presensi kelas | Must |
| FR-018 | Dosen dapat mengisi presensi secara manual | Must |
| FR-019 | Mahasiswa dapat melakukan presensi dengan QR Code aktif | Must |
| FR-020 | Sistem mencegah presensi ganda pada sesi yang sama | Must |
| FR-021 | Dosen dapat mengelola komponen dan bobot nilai | Must |
| FR-022 | Dosen dapat memasukkan nilai tiap komponen | Must |
| FR-023 | Sistem menghitung nilai akhir berdasarkan bobot aktif | Must |
| FR-024 | Dosen dapat menerbitkan nilai | Must |
| FR-025 | Mahasiswa dapat melihat nilai yang telah diterbitkan | Must |
| FR-026 | Mahasiswa dapat melihat KHS per periode | Must |
| FR-027 | Sistem menampilkan dashboard sesuai role | Must |
| FR-028 | Sistem menyediakan notifikasi aktivitas akademik | Should |
| FR-029 | Admin dapat melihat dan mengekspor laporan akademik dasar | Should |
| FR-030 | Sistem menyediakan arsip/nonaktif untuk data yang sudah memiliki riwayat akademik | Must |

## 7. Kebutuhan Nonfungsional

| ID | Kategori | Kebutuhan |
|---|---|---|
| NFR-001 | Security | Password disimpan menggunakan password hashing yang kuat; tidak pernah disimpan plaintext |
| NFR-002 | Authorization | Pemeriksaan role dan kepemilikan data dilakukan di server, bukan hanya menyembunyikan menu |
| NFR-003 | Data integrity | Operasi KRS, publikasi nilai, dan presensi harus menjaga konsistensi transaksi |
| NFR-004 | Privacy | Data nyata/sensitif tidak digunakan untuk demo; gunakan data sintetis atau anonim |
| NFR-005 | Usability | Antarmuka responsif dan konsisten pada desktop, tablet, dan ponsel |
| NFR-006 | Performance | Halaman daftar menggunakan pagination dan query terukur |
| NFR-007 | Maintainability | Kode dipisahkan menjadi UI, service/domain logic, dan data access |
| NFR-008 | Auditability | Keputusan KRS dan perubahan penting memiliki catatan waktu serta pelaku |
| NFR-009 | Reliability | Kesalahan database tidak boleh menghasilkan status transaksi setengah tersimpan |
| NFR-010 | Accessibility | Form memiliki label, pesan validasi yang jelas, fokus keyboard, dan kontras memadai |

## 8. Aturan Bisnis

1. Satu mahasiswa memiliki satu akun pengguna aktif.
2. Satu dosen memiliki satu akun pengguna aktif.
3. Satu mahasiswa memiliki paling banyak satu KRS untuk satu periode akademik.
4. Satu detail KRS tidak boleh memasukkan kelas yang sama lebih dari sekali.
5. KRS hanya dapat dikirim ketika periode pengisian KRS dibuka.
6. KRS yang diajukan harus divalidasi sebelum dapat disetujui.
7. Hanya Dosen Wali yang ditugaskan untuk mahasiswa tersebut yang dapat memutuskan KRS.
8. Hanya mahasiswa yang terdaftar pada kelas yang dapat melakukan presensi.
9. Satu mahasiswa hanya memiliki satu catatan presensi per sesi.
10. Nilai akhir dihitung dari komponen nilai dan bobot yang berlaku.
11. Nilai final hanya terlihat oleh mahasiswa setelah dipublikasikan.
12. Data akademik yang telah memiliki transaksi/riwayat tidak dihapus permanen melalui alur operasional normal; gunakan status arsip/nonaktif.
13. Penghapusan atau perubahan data master harus mempertimbangkan foreign key dan riwayat akademik.
14. KHS dan laporan merupakan hasil olahan data transaksi akademik, bukan salinan data yang diketik ulang.

## 9. Dashboard dan Navigasi

### Mahasiswa
- Ringkasan semester aktif.
- Status KRS dan status persetujuan.
- Jadwal perkuliahan terdekat.
- Ringkasan kehadiran.
- Nilai terbaru yang telah dipublikasikan.
- Akses cepat ke KRS, Jadwal, Presensi, KHS, dan Profil.
- Pengumuman/notifikasi.

### Dosen
- Kelas yang diampu.
- Jadwal mengajar.
- Sesi presensi yang perlu dikelola.
- KRS mahasiswa bimbingan yang menunggu persetujuan.
- Status input/publikasi nilai.
- Notifikasi.

### Admin Akademik
- Jumlah mahasiswa, dosen, program studi, dan kelas aktif.
- Periode akademik aktif.
- Ringkasan kelas dan jadwal.
- Aktivitas KRS, presensi, dan nilai.
- Akses cepat ke data master dan laporan.

## 10. Kriteria Penerimaan Tingkat Tinggi

- Pengguna tidak dapat mengakses fitur di luar role-nya meskipun URL dimasukkan langsung.
- Admin dapat membuat mahasiswa dan akun yang terhubung.
- KRS tidak dapat dikirim bila melanggar aturan validasi.
- Dosen Wali hanya dapat memproses KRS mahasiswa bimbingannya.
- Presensi QR yang tidak aktif, kedaluwarsa, atau sudah digunakan ditolak.
- Mahasiswa tidak dapat melakukan presensi untuk kelas yang bukan miliknya.
- Nilai akhir dihitung konsisten berdasarkan bobot komponen.
- Nilai yang belum diterbitkan tidak muncul sebagai nilai final mahasiswa.
- KHS menampilkan data sesuai periode yang dipilih.
- Riwayat akademik tetap tersedia ketika profil atau data master dinonaktifkan.

## 11. Asumsi, Risiko, dan Keputusan Terbuka

### Asumsi
- Aplikasi digunakan oleh satu universitas dengan banyak fakultas dan program studi.
- Admin membuat data dan akun mahasiswa.
- Dosen Wali adalah Dosen dengan penugasan mahasiswa bimbingan.
- Presensi mendukung metode manual dan QR Code.
- Teknologi implementasi adalah Next.js, TypeScript, dan PostgreSQL tanpa ORM.

### Keputusan yang perlu disepakati sebelum implementasi final
- Batas maksimal SKS berdasarkan IPS/IPK.
- Bobot tugas, UTS, UAS, dan komponen lain.
- Konversi nilai angka ke nilai huruf.
- Aturan IPS/IPK dan pengulangan mata kuliah.
- Jendela waktu KRS dan aturan perubahan setelah disetujui.
- Durasi aktif QR Code dan toleransi keterlambatan.
- Aturan persentase kehadiran.
- Kebijakan perubahan nilai setelah publikasi.
- Format ekspor laporan.

Nilai-nilai tersebut harus disimpan sebagai konfigurasi atau kebijakan yang dapat diubah, bukan asumsi permanen di kode.

## 12. Rencana Rilis

### MVP
Autentikasi, role access, data master, kelas dan jadwal, KRS/perwalian, presensi, nilai, KHS, dashboard dasar.

### Penyempurnaan
Notifikasi lebih lengkap, ekspor laporan, audit log yang lebih rinci, filter lanjutan, dan peningkatan aksesibilitas.

### Bukan target MVP
Integrasi eksternal, aplikasi native, pembayaran, LMS, dan analitik prediktif.

## 13. Definisi Selesai

Fitur dianggap selesai ketika:
- alur utama berjalan dari UI hingga PostgreSQL;
- validasi dilakukan di server;
- hak akses diuji;
- skenario sukses dan gagal memiliki test case;
- tidak ada data sensitif nyata pada data demo;
- dokumentasi endpoint dan skema diperbarui;
- perubahan telah direview dan dapat dijalankan oleh anggota tim lain.
