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
