# Kampusync — Database Schema

> **Database:** PostgreSQL  
> **Access strategy:** SQL langsung menggunakan `pg` (node-postgres)  
> **ORM:** Tidak menggunakan ORM (Prisma, Sequelize, TypeORM, Drizzle ORM, dan sejenisnya tidak digunakan)  
> **Schema version:** 1.0 — rancangan awal

---

## 1. Prinsip Perancangan

1. PostgreSQL menjadi sumber data utama.
2. Semua akses database menggunakan SQL eksplisit melalui driver `pg`.
3. Perubahan struktur database dikelola dengan file migrasi SQL berurutan.
4. Gunakan foreign key, unique constraint, check constraint, dan transaction untuk menjaga integritas.
5. Gunakan UUID sebagai primary key untuk entitas utama.
6. Simpan waktu dalam `timestamptz`; tampilkan sesuai zona waktu kampus.
7. Data akademik yang memiliki riwayat tidak dihapus permanen melalui operasi biasa.
8. KHS, dashboard, dan laporan dihitung dari data transaksi; tidak wajib memiliki tabel tersendiri pada MVP.
9. Gunakan data sintetis/anonymized untuk demo dan pengujian.

## 2. Arsitektur Akses Database

Alur yang disarankan:

`Next.js Server Component / Route Handler / Server Action → Service Layer → Repository (SQL) → pg Pool → PostgreSQL`

- `pg` adalah driver PostgreSQL, bukan ORM.
- Repository berisi query SQL yang eksplisit.
- Service layer memuat aturan bisnis dan mengorkestrasi transaksi.
- Jangan mengirim query database langsung dari Client Component.
- Jangan menaruh `DATABASE_URL` pada variabel environment yang berawalan `NEXT_PUBLIC_`.
- Gunakan parameterized query (`$1`, `$2`, ...) untuk mencegah SQL injection.
- Gunakan transaksi untuk operasi multi-langkah yang harus berhasil/gagal sebagai satu kesatuan.

Contoh struktur folder:

```text
src/
  app/
    (auth)/
    (dashboard)/
    api/
  lib/
    db/
      pool.ts
      transaction.ts
    auth/
  modules/
    students/
      student.repository.ts
      student.service.ts
      student.validation.ts
    study-plans/
      study-plan.repository.ts
      study-plan.service.ts
    attendance/
    grades/
  components/
db/
  migrations/
    001_extensions.sql
    002_identity_and_organization.sql
    003_academic_master.sql
    004_study_plan.sql
    005_attendance.sql
    006_grades.sql
    007_notifications.sql
  seeds/
    001_demo_data.sql
```

## 3. Entity Relationship Overview

### Entitas inti

| Entitas | Fungsi |
|---|---|
| users | Akun login dan role |
| faculties | Fakultas |
| study_programs | Program studi di bawah fakultas |
| students | Profil mahasiswa |
| lecturers | Profil dosen |
| courses | Master mata kuliah |
| course_prerequisites | Relasi prasyarat mata kuliah |
| academic_periods | Semester/periode akademik |
| class_offerings | Kelas yang dibuka pada periode tertentu |
| schedules | Jadwal kelas |
| study_plans | Header KRS mahasiswa |
| study_plan_details | Daftar kelas yang diambil pada KRS |
| krs_approval_histories | Riwayat keputusan dosen wali |
| attendance_sessions | Sesi presensi |
| attendance_records | Catatan presensi mahasiswa per sesi |
| grade_components | Komponen dan bobot penilaian |
| grades | Nilai akhir mahasiswa pada kelas |
| grade_scores | Nilai mahasiswa per komponen |
| grade_change_histories | Riwayat perubahan nilai |
| notifications | Notifikasi pengguna |

### Relasi penting

- Satu `faculty` memiliki banyak `study_programs`.
- Satu `study_program` memiliki banyak `students` dan, untuk rancangan awal, banyak `courses`.
- Satu `user` dapat memiliki satu profil `student` atau satu profil `lecturer`.
- Satu `lecturer` dapat menjadi dosen wali bagi banyak `students`.
- Satu `course` dapat dibuka menjadi banyak `class_offerings`.
- Satu `class_offering` terikat pada satu dosen dan satu periode akademik.
- Satu `student` memiliki banyak `study_plans`, tetapi maksimal satu per periode.
- Satu `study_plan` memiliki banyak `study_plan_details`.
- Satu kelas memiliki banyak sesi presensi dan komponen nilai.
- Satu sesi presensi memiliki banyak catatan presensi.
- Satu mahasiswa memiliki satu nilai akhir untuk satu kelas.
- KHS dan dashboard merupakan query/view dari data terkait.

## 4. SQL DDL — PostgreSQL

DDL berikut adalah baseline untuk MVP. Jalankan melalui migrasi SQL, bukan dengan menyalin seluruhnya ke query produksi tanpa review.

### 4.1 Extensions dan enum types

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('ADMIN', 'LECTURER', 'STUDENT');
CREATE TYPE record_status AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE study_plan_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE approval_decision AS ENUM ('APPROVED', 'REJECTED');
CREATE TYPE attendance_method AS ENUM ('MANUAL', 'QR');
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'EXCUSED', 'SICK', 'ABSENT');
CREATE TYPE attendance_session_status AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE grade_publication_status AS ENUM ('DRAFT', 'PUBLISHED', 'LOCKED');
```

### 4.2 Users dan organisasi

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL UNIQUE,
  name varchar(150) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE study_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES faculties(id) ON DELETE RESTRICT,
  code varchar(30) NOT NULL UNIQUE,
  name varchar(150) NOT NULL,
  degree_level varchar(20) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_program_degree_level_chk
    CHECK (degree_level IN ('D3', 'D4', 'S1', 'S2', 'S3', 'PROFESSION'))
);
```

### 4.3 Mahasiswa dan dosen

```sql
CREATE TABLE lecturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  nidn varchar(30) UNIQUE,
  full_name varchar(150) NOT NULL,
  phone varchar(30),
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  study_program_id uuid NOT NULL REFERENCES study_programs(id) ON DELETE RESTRICT,
  advisor_lecturer_id uuid REFERENCES lecturers(id) ON DELETE RESTRICT,
  nim varchar(30) NOT NULL UNIQUE,
  full_name varchar(150) NOT NULL,
  entry_year smallint NOT NULL,
  phone varchar(30),
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT students_entry_year_chk CHECK (entry_year BETWEEN 1900 AND 2200)
);

CREATE INDEX students_program_idx ON students(study_program_id);
CREATE INDEX students_advisor_idx ON students(advisor_lecturer_id);
```

### 4.4 Mata kuliah dan prasyarat

```sql
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_program_id uuid NOT NULL REFERENCES study_programs(id) ON DELETE RESTRICT,
  code varchar(30) NOT NULL,
  name varchar(200) NOT NULL,
  credits smallint NOT NULL,
  recommended_semester smallint,
  description text,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT courses_program_code_uniq UNIQUE (study_program_id, code),
  CONSTRAINT courses_credits_chk CHECK (credits > 0),
  CONSTRAINT courses_recommended_semester_chk
    CHECK (recommended_semester IS NULL OR recommended_semester BETWEEN 1 AND 20)
);
```

> **Catatan:** batas maksimal SKS per mata kuliah belum ditentukan dalam brainstorming. Karena itu constraint awal hanya memastikan SKS bernilai positif. Batas yang lebih spesifik dapat ditambahkan setelah kebijakan akademik disepakati.

```sql
CREATE TABLE course_prerequisites (
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  prerequisite_course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  minimum_grade varchar(5),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, prerequisite_course_id),
  CONSTRAINT course_prerequisite_not_self_chk CHECK (course_id <> prerequisite_course_id)
);
```

### 4.5 Periode, kelas, dan jadwal

```sql
CREATE TABLE academic_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL UNIQUE,
  academic_year varchar(20) NOT NULL,
  term varchar(20) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  krs_start_at timestamptz,
  krs_end_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_period_dates_chk CHECK (end_date > start_date),
  CONSTRAINT academic_period_krs_dates_chk
    CHECK (krs_start_at IS NULL OR krs_end_at IS NULL OR krs_end_at > krs_start_at)
);

CREATE UNIQUE INDEX one_active_academic_period_idx
  ON academic_periods(is_active) WHERE is_active = true;

CREATE TABLE class_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  lecturer_id uuid NOT NULL REFERENCES lecturers(id) ON DELETE RESTRICT,
  academic_period_id uuid NOT NULL REFERENCES academic_periods(id) ON DELETE RESTRICT,
  class_code varchar(20) NOT NULL,
  capacity integer NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_offering_code_uniq
    UNIQUE (course_id, academic_period_id, class_code),
  CONSTRAINT class_offering_capacity_chk CHECK (capacity > 0)
);

CREATE INDEX class_offerings_period_idx ON class_offerings(academic_period_id);
CREATE INDEX class_offerings_lecturer_idx ON class_offerings(lecturer_id);

CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE RESTRICT,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room varchar(100) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedules_day_chk CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT schedules_time_chk CHECK (end_time > start_time),
  CONSTRAINT schedules_offering_day_time_uniq
    UNIQUE (class_offering_id, day_of_week, start_time, end_time)
);
```

> Pemeriksaan bentrok jadwal dosen dan ruang harus dilakukan dalam service/transaction. Untuk kebutuhan yang lebih ketat, pertimbangkan PostgreSQL exclusion constraint menggunakan range dan `btree_gist` agar bentrok waktu dicegah juga pada level database.

### 4.6 KRS dan riwayat persetujuan

```sql
CREATE TABLE study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_period_id uuid NOT NULL REFERENCES academic_periods(id) ON DELETE RESTRICT,
  status study_plan_status NOT NULL DEFAULT 'DRAFT',
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_plan_student_period_uniq UNIQUE (student_id, academic_period_id)
);

CREATE TABLE study_plan_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE RESTRICT,
  credits_snapshot smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_plan_detail_offering_uniq UNIQUE (study_plan_id, class_offering_id),
  CONSTRAINT study_plan_detail_credits_chk CHECK (credits_snapshot > 0)
);

CREATE TABLE krs_approval_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE RESTRICT,
  lecturer_id uuid NOT NULL REFERENCES lecturers(id) ON DELETE RESTRICT,
  decision approval_decision NOT NULL,
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX study_plans_status_idx ON study_plans(status);
CREATE INDEX study_plan_details_offering_idx ON study_plan_details(class_offering_id);
```

### 4.7 Presensi

```sql
CREATE TABLE attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE RESTRICT,
  meeting_number smallint NOT NULL,
  method attendance_method NOT NULL,
  status attendance_session_status NOT NULL DEFAULT 'OPEN',
  qr_token_hash text,
  opens_at timestamptz NOT NULL DEFAULT now(),
  closes_at timestamptz,
  created_by uuid NOT NULL REFERENCES lecturers(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_meeting_uniq UNIQUE (class_offering_id, meeting_number),
  CONSTRAINT attendance_meeting_number_chk CHECK (meeting_number > 0),
  CONSTRAINT attendance_session_dates_chk
    CHECK (closes_at IS NULL OR closes_at > opens_at),
  CONSTRAINT attendance_qr_token_chk
    CHECK (method <> 'QR' OR qr_token_hash IS NOT NULL)
);

CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  attendance_status attendance_status NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT attendance_student_session_uniq UNIQUE (attendance_session_id, student_id)
);

CREATE INDEX attendance_records_student_idx ON attendance_records(student_id);
```

**Keamanan QR:** token acak yang kuat dibuat di server, QR hanya memuat token sementara, database menyimpan hash token. Jangan menyimpan token mentah. Validasi status sesi, waktu aktif, keanggotaan kelas, dan duplikasi dilakukan di server.

### 4.8 Nilai

```sql
CREATE TABLE grade_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE RESTRICT,
  name varchar(100) NOT NULL,
  weight numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grade_component_name_uniq UNIQUE (class_offering_id, name),
  CONSTRAINT grade_component_weight_chk CHECK (weight > 0 AND weight <= 100)
);

CREATE TABLE grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE RESTRICT,
  final_score numeric(5,2),
  letter_grade varchar(5),
  publication_status grade_publication_status NOT NULL DEFAULT 'DRAFT',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grade_student_offering_uniq UNIQUE (student_id, class_offering_id),
  CONSTRAINT grade_final_score_chk
    CHECK (final_score IS NULL OR final_score BETWEEN 0 AND 100)
);

CREATE TABLE grade_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
  grade_component_id uuid NOT NULL REFERENCES grade_components(id) ON DELETE RESTRICT,
  score numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grade_score_component_uniq UNIQUE (grade_id, grade_component_id),
  CONSTRAINT grade_score_range_chk CHECK (score BETWEEN 0 AND 100)
);

CREATE TABLE grade_change_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
  changed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  old_final_score numeric(5,2),
  new_final_score numeric(5,2),
  reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX grades_student_idx ON grades(student_id);
CREATE INDEX grades_offering_idx ON grades(class_offering_id);
```

**Penting:** validasi bahwa mahasiswa benar-benar terdaftar pada kelas melalui `study_plan_details` perlu dilakukan pada service atau diperkuat dengan constraint/trigger khusus. Total bobot komponen harus sama dengan 100 sebelum nilai difinalisasi/publikasi. Constraint lintas baris seperti total bobot tidak dapat dijamin oleh `CHECK` biasa; validasi di dalam transaksi atau trigger.

### 4.9 Notifikasi

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL,
  message text NOT NULL,
  target_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX notifications_user_created_idx
  ON notifications(user_id, created_at DESC);
```

## 5. Constraints dan Aturan Integritas Tambahan

Wajib diterapkan atau diuji di service layer:

- `users.email`, `students.nim`, dan `lecturers.nidn` harus unik sesuai kebijakan institusi.
- `students.user_id` dan `lecturers.user_id` unik.
- Satu mahasiswa hanya memiliki satu KRS per periode.
- Satu kelas hanya boleh muncul sekali dalam satu KRS.
- Satu mahasiswa hanya memiliki satu presensi per sesi.
- Satu mahasiswa hanya memiliki satu nilai per kelas.
- Satu nilai hanya memiliki satu skor untuk setiap komponen.
- Dosen Wali hanya dapat menyetujui KRS mahasiswa yang ditugaskan kepadanya.
- Kelas yang dipilih pada KRS harus berasal dari periode yang sama dengan KRS.
- Mahasiswa harus terdaftar pada kelas untuk melakukan presensi dan menerima nilai.
- KRS tidak dapat diubah setelah disetujui kecuali ada alur perubahan yang diizinkan.
- Data master yang sudah direferensikan sebaiknya dinonaktifkan/diarsipkan, bukan dihapus.

## 6. Query/Views yang Disarankan

Bukan semua ringkasan harus disimpan sebagai tabel. Buat query atau SQL view untuk:
- dashboard mahasiswa;
- dashboard dosen;
- dashboard Admin Akademik;
- KHS per mahasiswa dan periode;
- rekap kehadiran per kelas;
- rekap nilai per kelas;
- laporan jumlah mahasiswa per program studi;
- daftar KRS yang menunggu persetujuan.

Materialized view baru dipertimbangkan jika volume data dan pengukuran performa menunjukkan kebutuhan.

## 7. Contoh Akses dengan `pg` (tanpa ORM)

```ts
// src/lib/db/pool.ts
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});
```

```ts
// Contoh repository: parameterized query
import { pool } from "@/lib/db/pool";

export async function findStudentByNim(nim: string) {
  const result = await pool.query(
    `SELECT id, nim, full_name, study_program_id, status
     FROM students
     WHERE nim = $1
     LIMIT 1`,
    [nim]
  );

  return result.rows[0] ?? null;
}
```

```ts
// Contoh transaksi
import { pool } from "@/lib/db/pool";

export async function createStudyPlan(studentId: string, periodId: string) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO study_plans (student_id, academic_period_id)
       VALUES ($1, $2)
       RETURNING id, student_id, academic_period_id, status`,
      [studentId, periodId]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

## 8. Strategi Migrasi

- Simpan migrasi dalam `db/migrations` dengan nomor urut.
- Buat tabel `schema_migrations` untuk mencatat file yang sudah diterapkan.
- Setiap migrasi harus dapat ditinjau melalui pull request.
- Hindari mengubah migrasi yang sudah diterapkan pada lingkungan bersama; buat migrasi baru.
- Backup database sebelum perubahan skema yang berisiko.
- Seed hanya data demo sintetis.
- Jalankan migrasi pada database development/test sebelum deployment.

Contoh tabel pencatat migrasi:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version varchar(100) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
```

## 9. Keputusan Model yang Masih Perlu Dikonfirmasi

1. Apakah mata kuliah dapat digunakan lintas program studi? Jika ya, ganti `courses.study_program_id` dengan tabel penghubung `course_programs`.
2. Berapa batas SKS per semester dan batas SKS per mata kuliah?
3. Apakah jadwal satu kelas dapat memiliki beberapa slot dalam seminggu? Skema `schedules` saat ini sudah mendukung beberapa baris per kelas.
4. Bagaimana aturan konversi nilai angka ke huruf dan IPS/IPK?
5. Apakah perubahan nilai setelah publikasi memerlukan persetujuan pejabat akademik?
6. Apakah perlu tabel kalender akademik/pengumuman terpisah untuk versi MVP?

---

**Catatan implementasi:** dokumen ini merupakan rancangan skema awal. Sebelum migrasi final, selesaikan keputusan terbuka dan lakukan review DDL. Khususnya, jangan menjalankan constraint placeholder `_semester_credits_max`.
