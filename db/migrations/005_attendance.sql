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
