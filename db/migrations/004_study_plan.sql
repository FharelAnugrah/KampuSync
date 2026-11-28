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
