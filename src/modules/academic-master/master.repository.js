import { query } from "@/lib/db/pool";
import { withTransaction } from "@/lib/db/transaction";
export async function listFaculties(search = "", status) {
    const res = await query(`SELECT f.id, f.code, f.name, f.status, COUNT(sp.id)::int AS program_count
     FROM faculties f
     LEFT JOIN study_programs sp ON sp.faculty_id = f.id
     WHERE ($1 = '' OR f.code ILIKE '%' || $1 || '%' OR f.name ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR f.status::text = $2)
     GROUP BY f.id
     ORDER BY f.code ASC`, [search.trim(), status || null]);
    return res.rows;
}
export async function listStudyPrograms(search = "", facultyId) {
    const res = await query(`SELECT sp.id, sp.faculty_id, f.name AS faculty_name, sp.code, sp.name, sp.degree_level, sp.status
     FROM study_programs sp
     JOIN faculties f ON f.id = sp.faculty_id
     WHERE ($1 = '' OR sp.code ILIKE '%' || $1 || '%' OR sp.name ILIKE '%' || $1 || '%')
       AND ($2::uuid IS NULL OR sp.faculty_id = $2::uuid)
     ORDER BY sp.code ASC`, [search.trim(), facultyId || null]);
    return res.rows;
}
export async function listCourses(search = "", studyProgramId) {
    const res = await query(`SELECT
       c.id, c.study_program_id, sp.name AS study_program_name,
       c.code, c.name, c.credits, c.recommended_semester, c.description, c.status,
       COALESCE(
         json_agg(
           json_build_object(
             'prerequisiteCourseId', pc.id,
             'code', pc.code,
             'name', pc.name,
             'minimumGrade', cp.minimum_grade
           )
         ) FILTER (WHERE pc.id IS NOT NULL),
         '[]'::json
       ) AS prerequisites
     FROM courses c
     JOIN study_programs sp ON sp.id = c.study_program_id
     LEFT JOIN course_prerequisites cp ON cp.course_id = c.id
     LEFT JOIN courses pc ON pc.id = cp.prerequisite_course_id
     WHERE ($1 = '' OR c.code ILIKE '%' || $1 || '%' OR c.name ILIKE '%' || $1 || '%')
       AND ($2::uuid IS NULL OR c.study_program_id = $2::uuid)
     GROUP BY c.id, sp.name
     ORDER BY c.code ASC`, [search.trim(), studyProgramId || null]);
    return res.rows.map((r) => ({ ...r, prerequisites: r.prerequisites ?? [] }));
}
export async function listAcademicPeriods() {
    const res = await query(`SELECT
       id, name, academic_year, term,
       start_date::text, end_date::text,
       krs_start_at::text, krs_end_at::text,
       is_active
     FROM academic_periods
     ORDER BY start_date DESC`);
    return res.rows;
}
export async function getActiveAcademicPeriod() {
    const res = await query(`SELECT
       id, name, academic_year, term,
       start_date::text, end_date::text,
       krs_start_at::text, krs_end_at::text,
       is_active
     FROM academic_periods
     WHERE is_active = true
     LIMIT 1`);
    return res.rows[0] ?? null;
}
export async function createFacultyRepo(input) {
    const res = await query(`INSERT INTO faculties (code, name) VALUES ($1, $2) RETURNING *`, [input.code.toUpperCase(), input.name]);
    return res.rows[0];
}
export async function updateFacultyRepo(id, input) {
    const res = await query(`UPDATE faculties
     SET code = COALESCE($2, code),
         name = COALESCE($3, name),
         status = COALESCE($4::record_status, status),
         updated_at = now()
     WHERE id = $1
     RETURNING *`, [id, input.code?.toUpperCase() ?? null, input.name ?? null, input.status ?? null]);
    return res.rows[0] ?? null;
}
export async function createStudyProgramRepo(input) {
    const res = await query(`INSERT INTO study_programs (faculty_id, code, name, degree_level)
     VALUES ($1, $2, $3, $4)
     RETURNING *`, [input.facultyId, input.code.toUpperCase(), input.name, input.degreeLevel]);
    return res.rows[0];
}
export async function updateStudyProgramRepo(id, input) {
    const res = await query(`UPDATE study_programs
     SET faculty_id = COALESCE($2::uuid, faculty_id),
         code = COALESCE($3, code),
         name = COALESCE($4, name),
         degree_level = COALESCE($5, degree_level),
         status = COALESCE($6::record_status, status),
         updated_at = now()
     WHERE id = $1
     RETURNING *`, [
        id,
        input.facultyId ?? null,
        input.code?.toUpperCase() ?? null,
        input.name ?? null,
        input.degreeLevel ?? null,
        input.status ?? null,
    ]);
    return res.rows[0] ?? null;
}
export async function createCourseRepo(input) {
    return withTransaction(async (client) => {
        const res = await client.query(`INSERT INTO courses (study_program_id, code, name, credits, recommended_semester, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [
            input.studyProgramId,
            input.code.toUpperCase(),
            input.name,
            input.credits,
            input.recommendedSemester,
            input.description,
        ]);
        const course = res.rows[0];
        for (const prereqId of input.prerequisiteIds) {
            await client.query(`INSERT INTO course_prerequisites (course_id, prerequisite_course_id, minimum_grade)
         VALUES ($1, $2, 'C')`, [course.id, prereqId]);
        }
        return course;
    });
}
export async function updateCourseRepo(id, input) {
    return withTransaction(async (client) => {
        const res = await client.query(`UPDATE courses
       SET name = COALESCE($2, name),
           credits = COALESCE($3, credits),
           recommended_semester = COALESCE($4, recommended_semester),
           description = COALESCE($5, description),
           status = COALESCE($6::record_status, status),
           updated_at = now()
       WHERE id = $1
       RETURNING *`, [
            id,
            input.name ?? null,
            input.credits ?? null,
            input.recommendedSemester ?? null,
            input.description ?? null,
            input.status ?? null,
        ]);
        if (!res.rowCount)
            return null;
        if (input.prerequisiteIds !== undefined) {
            await client.query(`DELETE FROM course_prerequisites WHERE course_id = $1`, [id]);
            for (const prereqId of input.prerequisiteIds) {
                await client.query(`INSERT INTO course_prerequisites (course_id, prerequisite_course_id, minimum_grade)
           VALUES ($1, $2, 'C')`, [id, prereqId]);
            }
        }
        return res.rows[0];
    });
}
export async function createAcademicPeriodRepo(input) {
    return withTransaction(async (client) => {
        if (input.isActive) {
            await client.query(`UPDATE academic_periods SET is_active = false, updated_at = now() WHERE is_active = true`);
        }
        const res = await client.query(`INSERT INTO academic_periods (name, academic_year, term, start_date, end_date, krs_start_at, krs_end_at, is_active)
       VALUES ($1, $2, $3, $4::date, $5::date, $6::timestamptz, $7::timestamptz, $8)
       RETURNING *`, [
            input.name,
            input.academicYear,
            input.term,
            input.startDate,
            input.endDate,
            input.krsStartAt,
            input.krsEndAt,
            input.isActive,
        ]);
        return res.rows[0];
    });
}
export async function setActiveAcademicPeriodRepo(id) {
    return withTransaction(async (client) => {
        await client.query(`UPDATE academic_periods SET is_active = false, updated_at = now() WHERE is_active = true`);
        const res = await client.query(`UPDATE academic_periods SET is_active = true, updated_at = now() WHERE id = $1 RETURNING *`, [id]);
        return res.rows[0] ?? null;
    });
}
export async function updateAcademicPeriodKrsWindowRepo(id, krsStartAt, krsEndAt) {
    const res = await query(`UPDATE academic_periods
     SET krs_start_at = $2::timestamptz,
         krs_end_at = $3::timestamptz,
         updated_at = now()
     WHERE id = $1
     RETURNING *`, [id, krsStartAt, krsEndAt]);
    return res.rows[0] ?? null;
}
