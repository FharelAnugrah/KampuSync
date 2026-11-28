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
