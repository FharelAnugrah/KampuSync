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
