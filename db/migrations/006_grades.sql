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
