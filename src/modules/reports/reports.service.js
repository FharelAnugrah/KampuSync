import { query } from "@/lib/db/pool";
export async function getAdminReportsSummary(academicPeriodId) {
    const programStats = await query(`SELECT * FROM v_study_program_stats ORDER BY faculty_name, program_name`);
    const krsSummary = await query(`SELECT sp.status::text, COUNT(*)::int AS total
     FROM study_plans sp
     JOIN academic_periods ap ON ap.id = sp.academic_period_id
     WHERE ($1::uuid IS NULL AND ap.is_active = true) OR sp.academic_period_id = $1::uuid
     GROUP BY sp.status`, [academicPeriodId || null]);
    const attendanceSummary = await query(`SELECT v.class_offering_id, v.course_code, v.course_name, v.class_code,
            v.total_sessions, v.present_count, v.excused_count, v.sick_count, v.absent_count
     FROM v_class_attendance_summary v
     JOIN academic_periods ap ON ap.id = v.academic_period_id
     WHERE ($1::uuid IS NULL AND ap.is_active = true) OR v.academic_period_id = $1::uuid
     ORDER BY v.course_code, v.class_code`, [academicPeriodId || null]);
    return {
        programStats: programStats.rows,
        krsSummary: krsSummary.rows,
        attendanceSummary: attendanceSummary.rows,
    };
}
