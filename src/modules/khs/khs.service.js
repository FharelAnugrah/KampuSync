import { query } from "@/lib/db/pool";
import { getAcademicPolicies, getGradePointForLetter, } from "@/modules/policies/policy.service";
export async function getStudentKhsReport(studentId, academicPeriodId) {
    const policies = await getAcademicPolicies();
    const periodsRes = await query(`SELECT DISTINCT ap.id, ap.name, ap.is_active, ap.start_date
     FROM study_plans sp
     JOIN academic_periods ap ON ap.id = sp.academic_period_id
     WHERE sp.student_id = $1 AND sp.status = 'APPROVED'
     ORDER BY ap.start_date DESC`, [studentId]);
    const selectedPeriodId = academicPeriodId || periodsRes.rows[0]?.id || null;
    if (!selectedPeriodId) {
        return {
            periods: [],
            selectedPeriodId: null,
            items: [],
            totalCredits: 0,
            publishedCredits: 0,
            ips: 0,
            ipk: 0,
            hasUnpublishedGrades: false,
        };
    }
    const allRows = await query(`SELECT
       academic_period_id, course_code, course_name, class_code,
       credits, lecturer_name, publication_status::text,
       published_final_score::text, published_letter_grade
     FROM v_student_khs
     WHERE student_id = $1 AND study_plan_status = 'APPROVED'
     ORDER BY course_code ASC`, [studentId]);
    // Calculate cumulative IPK across all published rows
    let cumCredits = 0;
    let cumQuality = 0;
    for (const row of allRows.rows) {
        if (row.published_letter_grade) {
            const gp = getGradePointForLetter(row.published_letter_grade, policies.grading_scale);
            cumCredits += row.credits;
            cumQuality += row.credits * gp;
        }
    }
    const ipk = cumCredits > 0 ? Number((cumQuality / cumCredits).toFixed(2)) : 0;
    const periodRows = allRows.rows.filter((r) => r.academic_period_id === selectedPeriodId);
    let totalCredits = 0;
    let publishedCredits = 0;
    let periodQuality = 0;
    let hasUnpublishedGrades = false;
    const items = periodRows.map((row) => {
        totalCredits += row.credits;
        const isPublished = row.publication_status === "PUBLISHED" || row.publication_status === "LOCKED";
        if (!isPublished || !row.published_letter_grade) {
            hasUnpublishedGrades = true;
            return {
                courseCode: row.course_code,
                courseName: row.course_name,
                classCode: row.class_code,
                credits: row.credits,
                lecturerName: row.lecturer_name,
                finalScore: null,
                letterGrade: null,
                gradePoint: null,
                qualityPoints: null,
                isPublished: false,
            };
        }
        const gp = getGradePointForLetter(row.published_letter_grade, policies.grading_scale);
        const qp = Number((row.credits * gp).toFixed(2));
        publishedCredits += row.credits;
        periodQuality += qp;
        return {
            courseCode: row.course_code,
            courseName: row.course_name,
            classCode: row.class_code,
            credits: row.credits,
            lecturerName: row.lecturer_name,
            finalScore: row.published_final_score !== null ? Number(row.published_final_score) : null,
            letterGrade: row.published_letter_grade,
            gradePoint: gp,
            qualityPoints: qp,
            isPublished: true,
        };
    });
    const ips = publishedCredits > 0 ? Number((periodQuality / publishedCredits).toFixed(2)) : 0;
    return {
        periods: periodsRes.rows,
        selectedPeriodId,
        items,
        totalCredits,
        publishedCredits,
        ips,
        ipk,
        hasUnpublishedGrades,
    };
}
