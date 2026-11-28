-- ==============================================================================
-- KAMPUSYNC: FULL DATABASE DDL & SEED DATASET FOR PGADMIN
-- ==============================================================================
-- Cara pakai di pgAdmin 4:
-- 1. Buka pgAdmin, pastikan sudah membuat database (misal: 'kampusync').
-- 2. Klik kanan database 'kampusync' -> pilih 'Query Tool'.
-- 3. Tempel (Paste) seluruh isi skrip ini ke dalam Query Tool.
-- 4. Tekan F5 atau tombol 'Execute / Run'.
-- 5. Semua tabel, relasi, enum, view, dan data demo siap digunakan!
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. SCHEMA MIGRATIONS TABLE (Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version varchar(100) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- MIGRATION: 001_extensions.sql
-- ==============================================================================
-- 001_extensions.sql
-- Core PostgreSQL extensions and domain enum types

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'LECTURER', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE record_status AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE study_plan_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_decision AS ENUM ('APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_method AS ENUM ('MANUAL', 'QR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('PRESENT', 'EXCUSED', 'SICK', 'ABSENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_session_status AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE grade_publication_status AS ENUM ('DRAFT', 'PUBLISHED', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


INSERT INTO schema_migrations (version) VALUES ('001_extensions.sql') ON CONFLICT (version) DO NOTHING;

-- ==============================================================================
-- MIGRATION: 002_identity_and_organization.sql
-- ==============================================================================
-- 002_identity_and_organization.sql
-- Users, faculties, study programs, lecturers, and students

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL UNIQUE,
  name varchar(150) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_programs (
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

CREATE INDEX IF NOT EXISTS study_programs_faculty_idx ON study_programs(faculty_id);

CREATE TABLE IF NOT EXISTS lecturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  nidn varchar(30) UNIQUE,
  full_name varchar(150) NOT NULL,
  phone varchar(30),
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
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

CREATE INDEX IF NOT EXISTS students_program_idx ON students(study_program_id);
CREATE INDEX IF NOT EXISTS students_advisor_idx ON students(advisor_lecturer_id);


INSERT INTO schema_migrations (version) VALUES ('002_identity_and_organization.sql') ON CONFLICT (version) DO NOTHING;

-- ==============================================================================
-- MIGRATION: 003_academic_master.sql
-- ==============================================================================
-- 003_academic_master.sql
-- Courses, prerequisites, academic periods, class offerings, and schedules

CREATE TABLE IF NOT EXISTS courses (
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

CREATE INDEX IF NOT EXISTS courses_program_idx ON courses(study_program_id);

CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  prerequisite_course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  minimum_grade varchar(5),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, prerequisite_course_id),
  CONSTRAINT course_prerequisite_not_self_chk CHECK (course_id <> prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS academic_periods (
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

CREATE UNIQUE INDEX IF NOT EXISTS one_active_academic_period_idx
  ON academic_periods(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS class_offerings (
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

CREATE INDEX IF NOT EXISTS class_offerings_period_idx ON class_offerings(academic_period_id);
CREATE INDEX IF NOT EXISTS class_offerings_lecturer_idx ON class_offerings(lecturer_id);

CREATE TABLE IF NOT EXISTS schedules (
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

CREATE INDEX IF NOT EXISTS schedules_offering_idx ON schedules(class_offering_id);
CREATE INDEX IF NOT EXISTS schedules_day_room_idx ON schedules(day_of_week, room);


INSERT INTO schema_migrations (version) VALUES ('003_academic_master.sql') ON CONFLICT (version) DO NOTHING;

-- ==============================================================================
-- MIGRATION: 004_study_plan.sql
-- ==============================================================================
-- 004_study_plan.sql
-- KRS (study plans), selected class details, and advisor approval history

CREATE TABLE IF NOT EXISTS study_plans (
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

CREATE INDEX IF NOT EXISTS study_plans_status_idx ON study_plans(status);

CREATE TABLE IF NOT EXISTS study_plan_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE RESTRICT,
  credits_snapshot smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_plan_detail_offering_uniq UNIQUE (study_plan_id, class_offering_id),
  CONSTRAINT study_plan_detail_credits_chk CHECK (credits_snapshot > 0)
);

CREATE INDEX IF NOT EXISTS study_plan_details_offering_idx ON study_plan_details(class_offering_id);

CREATE TABLE IF NOT EXISTS krs_approval_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE RESTRICT,
  lecturer_id uuid NOT NULL REFERENCES lecturers(id) ON DELETE RESTRICT,
  decision approval_decision NOT NULL,
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS krs_approval_histories_plan_idx ON krs_approval_histories(study_plan_id, decided_at DESC);


INSERT INTO schema_migrations (version) VALUES ('004_study_plan.sql') ON CONFLICT (version) DO NOTHING;

-- ==============================================================================
-- MIGRATION: 005_attendance.sql
-- ==============================================================================
-- 005_attendance.sql
-- Attendance sessions (manual and QR/code) and student attendance records

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE RESTRICT,
  meeting_number smallint NOT NULL,
  topic varchar(200),
  method attendance_method NOT NULL,
  status attendance_session_status NOT NULL DEFAULT 'OPEN',
  qr_token_hash text,
  fallback_code_hash text,
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

CREATE INDEX IF NOT EXISTS attendance_sessions_offering_idx
  ON attendance_sessions(class_offering_id, meeting_number DESC);

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  attendance_status attendance_status NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT attendance_student_session_uniq UNIQUE (attendance_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS attendance_records_student_idx ON attendance_records(student_id);


INSERT INTO schema_migrations (version) VALUES ('005_attendance.sql') ON CONFLICT (version) DO NOTHING;

-- ==============================================================================
-- MIGRATION: 006_grades.sql
-- ==============================================================================
-- 006_grades.sql
-- Grade components, student grades, per-component scores, and audit history

CREATE TABLE IF NOT EXISTS grade_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_offering_id uuid NOT NULL REFERENCES class_offerings(id) ON DELETE RESTRICT,
  name varchar(100) NOT NULL,
  weight numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grade_component_name_uniq UNIQUE (class_offering_id, name),
  CONSTRAINT grade_component_weight_chk CHECK (weight > 0 AND weight <= 100)
);

CREATE TABLE IF NOT EXISTS grades (
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

CREATE TABLE IF NOT EXISTS grade_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
  grade_component_id uuid NOT NULL REFERENCES grade_components(id) ON DELETE RESTRICT,
  score numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grade_score_component_uniq UNIQUE (grade_id, grade_component_id),
  CONSTRAINT grade_score_range_chk CHECK (score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS grade_change_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
  changed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  old_final_score numeric(5,2),
  new_final_score numeric(5,2),
  old_letter_grade varchar(5),
  new_letter_grade varchar(5),
  reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grades_student_idx ON grades(student_id);
CREATE INDEX IF NOT EXISTS grades_offering_idx ON grades(class_offering_id);
CREATE INDEX IF NOT EXISTS grade_change_histories_grade_idx ON grade_change_histories(grade_id, changed_at DESC);


INSERT INTO schema_migrations (version) VALUES ('006_grades.sql') ON CONFLICT (version) DO NOTHING;

-- ==============================================================================
-- MIGRATION: 007_notifications_and_policies.sql
-- ==============================================================================
-- 007_notifications_and_policies.sql
-- In-app notifications, configurable academic policies, announcements, and academic calendar events

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL,
  message text NOT NULL,
  target_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS academic_policies (
  key varchar(100) PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(200) NOT NULL,
  content text NOT NULL,
  category varchar(40) NOT NULL DEFAULT 'AKADEMIK',
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_published_idx
  ON announcements(is_published, published_at DESC);

CREATE TABLE IF NOT EXISTS academic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_period_id uuid REFERENCES academic_periods(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  event_type varchar(40) NOT NULL DEFAULT 'AKADEMIK',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_events_dates_chk CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS academic_events_dates_idx
  ON academic_events(start_date, end_date);


INSERT INTO schema_migrations (version) VALUES ('007_notifications_and_policies.sql') ON CONFLICT (version) DO NOTHING;

-- ==============================================================================
-- MIGRATION: 008_reporting_views.sql
-- ==============================================================================
-- 008_reporting_views.sql
-- Read-only SQL views for KHS, attendance summaries, and study program statistics

CREATE OR REPLACE VIEW v_student_khs AS
SELECT
  sp.id AS study_plan_id,
  sp.student_id,
  sp.academic_period_id,
  ap.name AS period_name,
  ap.academic_year,
  ap.term,
  sp.status AS study_plan_status,
  spd.class_offering_id,
  co.class_code,
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  spd.credits_snapshot AS credits,
  l.full_name AS lecturer_name,
  g.id AS grade_id,
  g.publication_status,
  CASE
    WHEN g.publication_status IN ('PUBLISHED', 'LOCKED') THEN g.final_score
    ELSE NULL
  END AS published_final_score,
  CASE
    WHEN g.publication_status IN ('PUBLISHED', 'LOCKED') THEN g.letter_grade
    ELSE NULL
  END AS published_letter_grade,
  g.published_at
FROM study_plans sp
JOIN academic_periods ap ON ap.id = sp.academic_period_id
JOIN study_plan_details spd ON spd.study_plan_id = sp.id
JOIN class_offerings co ON co.id = spd.class_offering_id
JOIN courses c ON c.id = co.course_id
JOIN lecturers l ON l.id = co.lecturer_id
LEFT JOIN grades g
  ON g.student_id = sp.student_id
  AND g.class_offering_id = spd.class_offering_id;

CREATE OR REPLACE VIEW v_class_attendance_summary AS
SELECT
  co.id AS class_offering_id,
  co.academic_period_id,
  c.code AS course_code,
  c.name AS course_name,
  co.class_code,
  COUNT(DISTINCT s.id)::int AS total_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'OPEN' THEN s.id END)::int AS open_sessions,
  COUNT(r.id)::int AS total_records,
  COUNT(CASE WHEN r.attendance_status = 'PRESENT' THEN 1 END)::int AS present_count,
  COUNT(CASE WHEN r.attendance_status = 'EXCUSED' THEN 1 END)::int AS excused_count,
  COUNT(CASE WHEN r.attendance_status = 'SICK' THEN 1 END)::int AS sick_count,
  COUNT(CASE WHEN r.attendance_status = 'ABSENT' THEN 1 END)::int AS absent_count
FROM class_offerings co
JOIN courses c ON c.id = co.course_id
LEFT JOIN attendance_sessions s ON s.class_offering_id = co.id AND s.status <> 'CANCELLED'
LEFT JOIN attendance_records r ON r.attendance_session_id = s.id
GROUP BY co.id, co.academic_period_id, c.code, c.name, co.class_code;

CREATE OR REPLACE VIEW v_study_program_stats AS
SELECT
  sp.id AS study_program_id,
  sp.code AS program_code,
  sp.name AS program_name,
  sp.degree_level,
  f.name AS faculty_name,
  COUNT(DISTINCT CASE WHEN st.status = 'ACTIVE' THEN st.id END)::int AS active_students,
  COUNT(DISTINCT CASE WHEN st.status <> 'ACTIVE' THEN st.id END)::int AS inactive_students,
  COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.id END)::int AS active_courses
FROM study_programs sp
JOIN faculties f ON f.id = sp.faculty_id
LEFT JOIN students st ON st.study_program_id = sp.id
LEFT JOIN courses c ON c.study_program_id = sp.id
GROUP BY sp.id, sp.code, sp.name, sp.degree_level, f.name;


INSERT INTO schema_migrations (version) VALUES ('008_reporting_views.sql') ON CONFLICT (version) DO NOTHING;

-- ==============================================================================
-- SEED DATASET (BERDASARKAN SCHEMAR.MD & SCRIPTS/SEED.TS)
-- Password untuk semua akun demo: Kampusync123!
-- ==============================================================================

-- 1. Academic Policies
INSERT INTO academic_policies (key, value, description)
VALUES
  ('max_credits_per_semester', '{"defaultMax": 24, "byIps": [{"minIps": 3.0, "max": 24}, {"minIps": 2.5, "max": 22}, {"minIps": 2.0, "max": 20}, {"minIps": 0, "max": 18}]}'::jsonb, 'Batas maksimal SKS per semester berdasarkan IPS sebelumnya'),
  ('grading_scale', '[{"letter": "A", "minScore": 85, "gradePoint": 4.0}, {"letter": "A-", "minScore": 80, "gradePoint": 3.75}, {"letter": "B+", "minScore": 75, "gradePoint": 3.5}, {"letter": "B", "minScore": 70, "gradePoint": 3.0}, {"letter": "B-", "minScore": 65, "gradePoint": 2.75}, {"letter": "C+", "minScore": 60, "gradePoint": 2.5}, {"letter": "C", "minScore": 55, "gradePoint": 2.0}, {"letter": "D", "minScore": 45, "gradePoint": 1.0}, {"letter": "E", "minScore": 0, "gradePoint": 0.0}]'::jsonb, 'Skala konversi nilai angka ke nilai huruf dan bobot mutu'),
  ('qr_attendance_ttl_minutes', '{"minutes": 15}'::jsonb, 'Durasi aktif default sesi presensi QR Code (menit)'),
  ('minimum_attendance_percentage', '{"percentage": 75}'::jsonb, 'Persentase kehadiran minimum yang disarankan'),
  ('allow_post_publish_grade_edit', '{"enabled": true, "requireReason": true}'::jsonb, 'Kebijakan perubahan nilai setelah publikasi (sebelum status LOCKED)')
ON CONFLICT (key) DO NOTHING;

-- 2. Users (Admin, Lecturers, Students)
-- Password: Kampusync123!
INSERT INTO users (id, email, password_hash, role)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'admin@kampusync.ac.id', 'scrypt$3ee786dc50f6285d17cfb30ead8db933$a30a6f51486560eb1baefa13f9dbbe7eaddb23cb2c62acd8194691e39d384090faf698076fb73b48b9dbf1decd9008431a546eddf64cd42dfb150352accefbfb', 'ADMIN'),
  ('10000000-0000-4000-8000-000000000002', 'ahmad.fauzi@kampusync.ac.id', 'scrypt$3ee786dc50f6285d17cfb30ead8db933$a30a6f51486560eb1baefa13f9dbbe7eaddb23cb2c62acd8194691e39d384090faf698076fb73b48b9dbf1decd9008431a546eddf64cd42dfb150352accefbfb', 'LECTURER'),
  ('10000000-0000-4000-8000-000000000003', 'siti.rahma@kampusync.ac.id', 'scrypt$3ee786dc50f6285d17cfb30ead8db933$a30a6f51486560eb1baefa13f9dbbe7eaddb23cb2c62acd8194691e39d384090faf698076fb73b48b9dbf1decd9008431a546eddf64cd42dfb150352accefbfb', 'LECTURER'),
  ('10000000-0000-4000-8000-000000000004', 'budi.santoso@kampusync.ac.id', 'scrypt$3ee786dc50f6285d17cfb30ead8db933$a30a6f51486560eb1baefa13f9dbbe7eaddb23cb2c62acd8194691e39d384090faf698076fb73b48b9dbf1decd9008431a546eddf64cd42dfb150352accefbfb', 'LECTURER'),
  ('10000000-0000-4000-8000-000000000005', 'nadia.putri@student.kampusync.ac.id', 'scrypt$3ee786dc50f6285d17cfb30ead8db933$a30a6f51486560eb1baefa13f9dbbe7eaddb23cb2c62acd8194691e39d384090faf698076fb73b48b9dbf1decd9008431a546eddf64cd42dfb150352accefbfb', 'STUDENT'),
  ('10000000-0000-4000-8000-000000000006', 'rizky.pratama@student.kampusync.ac.id', 'scrypt$3ee786dc50f6285d17cfb30ead8db933$a30a6f51486560eb1baefa13f9dbbe7eaddb23cb2c62acd8194691e39d384090faf698076fb73b48b9dbf1decd9008431a546eddf64cd42dfb150352accefbfb', 'STUDENT'),
  ('10000000-0000-4000-8000-000000000007', 'dewi.lestari@student.kampusync.ac.id', 'scrypt$3ee786dc50f6285d17cfb30ead8db933$a30a6f51486560eb1baefa13f9dbbe7eaddb23cb2c62acd8194691e39d384090faf698076fb73b48b9dbf1decd9008431a546eddf64cd42dfb150352accefbfb', 'STUDENT'),
  ('10000000-0000-4000-8000-000000000008', 'farhan.hakim@student.kampusync.ac.id', 'scrypt$3ee786dc50f6285d17cfb30ead8db933$a30a6f51486560eb1baefa13f9dbbe7eaddb23cb2c62acd8194691e39d384090faf698076fb73b48b9dbf1decd9008431a546eddf64cd42dfb150352accefbfb', 'STUDENT')
ON CONFLICT (email) DO NOTHING;

-- 3. Faculties
INSERT INTO faculties (id, code, name)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'FTI', 'Fakultas Teknologi Informasi'),
  ('20000000-0000-4000-8000-000000000002', 'FEB', 'Fakultas Ekonomi dan Bisnis')
ON CONFLICT (code) DO NOTHING;

-- 4. Study Programs
INSERT INTO study_programs (id, faculty_id, code, name, degree_level)
VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'IF', 'Teknik Informatika', 'S1'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'SI', 'Sistem Informasi', 'S1'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'MN', 'Manajemen', 'S1')
ON CONFLICT (code) DO NOTHING;

-- 5. Lecturers
INSERT INTO lecturers (id, user_id, nidn, full_name, phone)
VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '0012048501', 'Dr. Ahmad Fauzi, S.Kom., M.T.', '081234560001'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '0018098802', 'Siti Rahma, S.Si., M.Cs.', '081234560002'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', '0022119003', 'Budi Santoso, S.E., M.M.', '081234560003')
ON CONFLICT (user_id) DO NOTHING;

-- 6. Students
INSERT INTO students (id, user_id, study_program_id, advisor_lecturer_id, nim, full_name, entry_year, phone)
VALUES
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '2024101001', 'Nadia Putri', 2024, '081300010001'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '2024101002', 'Rizky Pratama', 2024, '081300010002'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '2024102001', 'Dewi Lestari', 2024, '081300010003'),
  ('50000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', '2024201001', 'Farhan Hakim', 2024, '081300010004')
ON CONFLICT (nim) DO NOTHING;

-- 7. Courses
INSERT INTO courses (id, study_program_id, code, name, credits, recommended_semester, description)
VALUES
  ('60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'IF101', 'Algoritma dan Pemrograman', 4, 1, 'Dasar pemrograman terstruktur dan pemecahan masalah algoritmik.'),
  ('60000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'IF201', 'Struktur Data', 4, 2, 'Implementasi stack, queue, tree, graph, dan analisis kompleksitas.'),
  ('60000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'IF202', 'Basis Data Relasional', 3, 3, 'Perancangan ER, normalisasi, dan SQL tingkat lanjut.'),
  ('60000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'IF301', 'Rekayasa Perangkat Lunak', 3, 3, 'Siklus hidup pengembangan perangkat lunak, arsitektur, dan pengujian.'),
  ('60000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 'IF302', 'Pemrograman Web Modern', 3, 3, 'Pengembangan aplikasi web full-stack berbasis standar modern.'),
  ('60000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', 'SI201', 'Analisis Proses Bisnis', 3, 3, 'Pemodelan dan evaluasi proses bisnis organisasi.')
ON CONFLICT (study_program_id, code) DO NOTHING;

-- 8. Course Prerequisites
INSERT INTO course_prerequisites (course_id, prerequisite_course_id, minimum_grade)
VALUES
  ('60000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'C'),
  ('60000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000002', 'C')
ON CONFLICT (course_id, prerequisite_course_id) DO NOTHING;

-- 9. Academic Periods
INSERT INTO academic_periods (id, name, academic_year, term, start_date, end_date, krs_start_at, krs_end_at, is_active)
VALUES
  ('70000000-0000-4000-8000-000000000001', '2025/2026 Genap', '2025/2026', 'GENAP', '2026-02-01', '2026-06-30', '2026-01-15 00:00:00+08', '2026-02-10 23:59:59+08', false),
  ('70000000-0000-4000-8000-000000000002', '2026/2027 Ganjil', '2026/2027', 'GANJIL', '2026-08-24', '2027-01-15', now() - interval '14 days', now() + interval '45 days', true)
ON CONFLICT (name) DO NOTHING;

-- 10. Class Offerings
-- Past Period
INSERT INTO class_offerings (id, course_id, lecturer_id, academic_period_id, class_code, capacity)
VALUES
  ('80000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'A', 40),
  ('80000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', 'A', 40),
-- Active Period
  ('80000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'A', 35),
  ('80000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'A', 35),
  ('80000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'A', 30),
  ('80000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', 'A', 40),
  ('80000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'B', 30)
ON CONFLICT (course_id, academic_period_id, class_code) DO NOTHING;

-- 11. Schedules
INSERT INTO schedules (class_offering_id, day_of_week, start_time, end_time, room)
VALUES
  ('80000000-0000-4000-8000-000000000003', 1, '08:00', '10:30', 'Lab Basis Data 1'),
  ('80000000-0000-4000-8000-000000000004', 2, '10:30', '13:00', 'Ruang Kuliah 302'),
  ('80000000-0000-4000-8000-000000000005', 3, '13:30', '16:00', 'Lab Pemrograman 2'),
  ('80000000-0000-4000-8000-000000000006', 4, '08:00', '10:30', 'Ruang Kuliah 201'),
  ('80000000-0000-4000-8000-000000000007', 5, '09:00', '11:30', 'Ruang Kuliah 305')
ON CONFLICT (class_offering_id, day_of_week, start_time, end_time) DO NOTHING;

-- 12. Study Plans (KRS)
-- Past Period: Nadia APPROVED
INSERT INTO study_plans (id, student_id, academic_period_id, status, submitted_at, approved_at)
VALUES
  ('90000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'APPROVED', '2026-01-20 10:00:00+08', '2026-01-21 09:00:00+08'),
-- Active Period: Nadia APPROVED & Rizky SUBMITTED
  ('90000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'APPROVED', now() - interval '3 days', now() - interval '2 days'),
  ('90000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'SUBMITTED', now() - interval '1 day', NULL)
ON CONFLICT (student_id, academic_period_id) DO NOTHING;

-- 13. Study Plan Details
INSERT INTO study_plan_details (study_plan_id, class_offering_id, credits_snapshot)
VALUES
  ('90000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 4),
  ('90000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', 4),
  ('90000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000003', 3),
  ('90000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000004', 3),
  ('90000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000003', 3),
  ('90000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000005', 3)
ON CONFLICT (study_plan_id, class_offering_id) DO NOTHING;

-- 14. KRS Approval Histories
INSERT INTO krs_approval_histories (study_plan_id, lecturer_id, decision, reason, decided_at)
VALUES
  ('90000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'APPROVED', 'Memenuhi prasyarat dan batas SKS.', '2026-01-21 09:00:00+08'),
  ('90000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'APPROVED', 'Rencana studi sesuai kurikulum semester 3.', now() - interval '2 days');

-- 15. Grades (Past Semester Nadia)
INSERT INTO grades (student_id, class_offering_id, final_score, letter_grade, publication_status, published_at)
VALUES
  ('50000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 88.50, 'A', 'PUBLISHED', '2026-06-25 14:00:00+08'),
  ('50000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', 82.00, 'A-', 'PUBLISHED', '2026-06-25 14:00:00+08')
ON CONFLICT (student_id, class_offering_id) DO NOTHING;

-- 16. Grade Components (Active Basdat class)
INSERT INTO grade_components (class_offering_id, name, weight)
VALUES
  ('80000000-0000-4000-8000-000000000003', 'Tugas & Kuis', 30),
  ('80000000-0000-4000-8000-000000000003', 'UTS', 35),
  ('80000000-0000-4000-8000-000000000003', 'UAS', 35)
ON CONFLICT (class_offering_id, name) DO NOTHING;

-- 17. Attendance Sessions & Records
INSERT INTO attendance_sessions (id, class_offering_id, meeting_number, topic, method, status, opens_at, closes_at, created_by)
VALUES
  ('a1000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000003', 1, 'Pengantar Model Relasional & Normalisasi', 'MANUAL', 'CLOSED', now() - interval '2 days', now() - interval '2 days' + interval '2 hours', '40000000-0000-4000-8000-000000000001')
ON CONFLICT (class_offering_id, meeting_number) DO NOTHING;

INSERT INTO attendance_records (attendance_session_id, student_id, attendance_status, recorded_by)
VALUES
  ('a1000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'PRESENT', '10000000-0000-4000-8000-000000000002')
ON CONFLICT (attendance_session_id, student_id) DO NOTHING;

-- 18. Announcements
INSERT INTO announcements (title, content, category, created_by)
VALUES
  ('Pembukaan Masa Pengisian KRS Semester Ganjil 2026/2027', 'Mahasiswa diharapkan berkonsultasi dengan Dosen Wali sebelum mengajukan KRS melalui portal Kampusync.', 'KRS', '10000000-0000-4000-8000-000000000001'),
  ('Pemutakhiran Kebijakan Presensi QR Code', 'Presensi QR Code aktif selama 15 menit sejak sesi dibuka oleh dosen pengampu. Pastikan kamera atau kode presensi siap saat perkuliahan.', 'AKADEMIK', '10000000-0000-4000-8000-000000000001');

-- 19. Academic Events
INSERT INTO academic_events (academic_period_id, title, description, start_date, end_date, event_type)
VALUES
  ('70000000-0000-4000-8000-000000000002', 'Masa Pengisian & Perwalian KRS', 'Pengisian KRS online dan persetujuan oleh Dosen Wali.', CURRENT_DATE - 7, CURRENT_DATE + 14, 'KRS'),
  ('70000000-0000-4000-8000-000000000002', 'Perkuliahan Pekan 1–7', 'Perkuliahan paruh pertama sebelum Ujian Tengah Semester.', '2026-09-01', '2026-10-17', 'PERKULIAHAN'),
  ('70000000-0000-4000-8000-000000000002', 'Ujian Tengah Semester (UTS)', 'Evaluasi tengah semester seluruh mata kuliah.', '2026-10-19', '2026-10-30', 'UJIAN');

-- 20. Notifications
INSERT INTO notifications (user_id, title, message, target_url)
VALUES
  ('10000000-0000-4000-8000-000000000002', 'KRS Mahasiswa Menunggu Persetujuan', 'Rizky Pratama (2024101002) telah mengajukan KRS untuk periode 2026/2027 Ganjil.', '/lecturer/perwalian'),
  ('10000000-0000-4000-8000-000000000005', 'KRS Disetujui Dosen Wali', 'KRS Anda pada periode 2026/2027 Ganjil telah disetujui oleh Dr. Ahmad Fauzi, S.Kom., M.T.', '/student/krs');

COMMIT;
