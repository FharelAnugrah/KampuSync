import { z } from "zod";
import { query } from "@/lib/db/pool";
import { withTransaction } from "@/lib/db/transaction";
import { assertAdvisorOfStudent } from "@/lib/auth/guards";
import { AppError } from "@/lib/http";
import { slotsOverlap } from "@/lib/schedule-utils";
import { getAcademicPolicies, getGradePointForLetter, resolveMaxCreditsForIps, } from "@/modules/policies/policy.service";
/**
 * Pure domain validator for KRS business rules (FR-013, PRD 5.2 & 8).
 */
export function validateStudyPlanRules(input) {
    const issues = [];
    if (!input.krsStartAt || !input.krsEndAt) {
        issues.push({
            code: "KRS_WINDOW_NOT_CONFIGURED",
            message: "Jadwal pengisian KRS pada periode ini belum ditetapkan oleh Admin Akademik.",
        });
    }
    else if (input.now < input.krsStartAt || input.now > input.krsEndAt) {
        issues.push({
            code: "KRS_WINDOW_CLOSED",
            message: "Periode pengisian KRS sedang tidak dibuka.",
        });
    }
    if (input.selectedOfferings.length === 0) {
        issues.push({
            code: "EMPTY_SELECTION",
            message: "Pilih minimal satu kelas sebelum mengajukan KRS.",
        });
        return issues;
    }
    const seenOfferings = new Set();
    const seenCourses = new Map();
    let totalCredits = 0;
    for (const offering of input.selectedOfferings) {
        if (offering.academicPeriodId !== input.targetPeriodId) {
            issues.push({
                code: "PERIOD_MISMATCH",
                classOfferingId: offering.id,
                message: `Kelas ${offering.courseCode}-${offering.classCode} tidak berada pada periode akademik yang dipilih.`,
            });
        }
        if (offering.status !== "ACTIVE") {
            issues.push({
                code: "OFFERING_INACTIVE",
                classOfferingId: offering.id,
                message: `Kelas ${offering.courseCode}-${offering.classCode} tidak aktif.`,
            });
        }
        if (seenOfferings.has(offering.id)) {
            issues.push({
                code: "DUPLICATE_OFFERING",
                classOfferingId: offering.id,
                message: `Kelas ${offering.courseCode}-${offering.classCode} dipilih lebih dari sekali.`,
            });
        }
        seenOfferings.add(offering.id);
        const dupCourse = seenCourses.get(offering.courseId);
        if (dupCourse) {
            issues.push({
                code: "DUPLICATE_COURSE",
                classOfferingId: offering.id,
                message: `Mata kuliah ${offering.courseCode} (${offering.courseName}) tidak boleh diambil lebih dari satu kelas.`,
            });
        }
        else {
            seenCourses.set(offering.courseId, offering);
        }
        if (offering.enrolledCount >= offering.capacity) {
            issues.push({
                code: "CAPACITY_FULL",
                classOfferingId: offering.id,
                message: `Kapasitas kelas ${offering.courseCode}-${offering.classCode} sudah penuh (${offering.enrolledCount}/${offering.capacity}).`,
            });
        }
        for (const prereq of offering.prerequisites) {
            const achieved = input.passedCourseGrades.get(prereq.prerequisiteCourseId);
            if (!achieved) {
                issues.push({
                    code: "PREREQUISITE_NOT_MET",
                    classOfferingId: offering.id,
                    message: `Prasyarat ${prereq.code} (${prereq.name}) untuk ${offering.courseCode} belum terpenuhi.`,
                });
            }
            else if (prereq.minimumGrade) {
                const minPoint = getGradePointForLetter(prereq.minimumGrade, input.gradingScale);
                const achievedPoint = getGradePointForLetter(achieved, input.gradingScale);
                if (achievedPoint < minPoint) {
                    issues.push({
                        code: "PREREQUISITE_GRADE_LOW",
                        classOfferingId: offering.id,
                        message: `Nilai prasyarat ${prereq.code} (${achieved}) di bawah batas minimal (${prereq.minimumGrade}).`,
                    });
                }
            }
        }
        totalCredits += offering.credits;
    }
    // Schedule conflict check across selected classes
    for (let i = 0; i < input.selectedOfferings.length; i++) {
        for (let j = i + 1; j < input.selectedOfferings.length; j++) {
            const a = input.selectedOfferings[i];
            const b = input.selectedOfferings[j];
            for (const sa of a.schedules) {
                for (const sb of b.schedules) {
                    if (slotsOverlap(sa, sb)) {
                        issues.push({
                            code: "SCHEDULE_CONFLICT",
                            classOfferingId: b.id,
                            message: `Jadwal bentrok antara ${a.courseCode}-${a.classCode} dan ${b.courseCode}-${b.classCode}.`,
                        });
                    }
                }
            }
        }
    }
    if (totalCredits > input.maxCredits) {
        issues.push({
            code: "CREDIT_LIMIT_EXCEEDED",
            message: `Total SKS yang dipilih (${totalCredits} SKS) melebihi batas maksimal (${input.maxCredits} SKS).`,
        });
    }
    return issues;
}
export async function getStudentPreviousIps(studentId, excludePeriodId, scale) {
    const res = await query(`SELECT academic_period_id, credits, published_letter_grade
     FROM v_student_khs
     WHERE student_id = $1
       AND academic_period_id <> $2
       AND study_plan_status = 'APPROVED'
       AND published_letter_grade IS NOT NULL
     ORDER BY period_name DESC`, [studentId, excludePeriodId]);
    if (!res.rowCount)
        return null;
    const latestPeriodId = res.rows[0].academic_period_id;
    let totalCredits = 0;
    let totalPoints = 0;
    for (const row of res.rows) {
        if (row.academic_period_id !== latestPeriodId)
            continue;
        totalCredits += row.credits;
        totalPoints += row.credits * getGradePointForLetter(row.published_letter_grade, scale);
    }
    return totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : null;
}
export async function getStudentStudyPlanView(studentId, academicPeriodId) {
    const policies = await getAcademicPolicies();
    const prevIps = await getStudentPreviousIps(studentId, academicPeriodId, policies.grading_scale);
    const maxCredits = resolveMaxCreditsForIps(prevIps, policies.max_credits_per_semester);
    const periodRes = await query(`SELECT id, name, krs_start_at::text, krs_end_at::text, is_active
     FROM academic_periods
     WHERE id = $1`, [academicPeriodId]);
    const period = periodRes.rows[0] ?? null;
    const planRes = await query(`SELECT id, status, submitted_at::text, approved_at::text
     FROM study_plans
     WHERE student_id = $1 AND academic_period_id = $2
     LIMIT 1`, [studentId, academicPeriodId]);
    const plan = planRes.rows[0] ?? null;
    const selectedIdsRes = plan
        ? await query(`SELECT class_offering_id FROM study_plan_details WHERE study_plan_id = $1`, [plan.id])
        : { rows: [] };
    const historyRes = plan
        ? await query(`SELECT h.id, h.decision, h.reason, h.decided_at::text, l.full_name AS lecturer_name
         FROM krs_approval_histories h
         JOIN lecturers l ON l.id = h.lecturer_id
         WHERE h.study_plan_id = $1
         ORDER BY h.decided_at DESC`, [plan.id])
        : { rows: [] };
    const passedGradesRes = await query(`SELECT co.course_id, g.letter_grade
     FROM grades g
     JOIN class_offerings co ON co.id = g.class_offering_id
     WHERE g.student_id = $1
       AND g.publication_status IN ('PUBLISHED', 'LOCKED')
       AND g.letter_grade IS NOT NULL`, [studentId]);
    const passedMap = new Map();
    for (const row of passedGradesRes.rows) {
        const prev = passedMap.get(row.course_id);
        if (!prev ||
            getGradePointForLetter(row.letter_grade, policies.grading_scale) >
                getGradePointForLetter(prev, policies.grading_scale)) {
            passedMap.set(row.course_id, row.letter_grade);
        }
    }
    return {
        period,
        plan,
        selectedOfferingIds: selectedIdsRes.rows.map((r) => r.class_offering_id),
        histories: historyRes.rows,
        previousIps: prevIps,
        maxCredits,
        passedCourseGrades: Object.fromEntries(passedMap),
    };
}
const krsSelectionSchema = z.object({
    academicPeriodId: z.string().uuid(),
    classOfferingIds: z.array(z.string().uuid()),
});
export async function saveOrSubmitStudyPlan(studentId, raw, mode) {
    const input = krsSelectionSchema.parse(raw);
    const uniqueOfferingIds = [...new Set(input.classOfferingIds)];
    const policies = await getAcademicPolicies();
    const prevIps = await getStudentPreviousIps(studentId, input.academicPeriodId, policies.grading_scale);
    const maxCredits = resolveMaxCreditsForIps(prevIps, policies.max_credits_per_semester);
    return withTransaction(async (client) => {
        const periodRes = await client.query(`SELECT id, name, krs_start_at::text, krs_end_at::text
       FROM academic_periods
       WHERE id = $1`, [input.academicPeriodId]);
        const period = periodRes.rows[0];
        if (!period) {
            throw new AppError("Periode akademik tidak ditemukan.", 404, "NOT_FOUND");
        }
        const stuRes = await client.query(`SELECT s.id, s.full_name, s.nim, adv.user_id AS advisor_user_id
       FROM students s
       LEFT JOIN lecturers adv ON adv.id = s.advisor_lecturer_id
       WHERE s.id = $1`, [studentId]);
        const student = stuRes.rows[0];
        if (!student) {
            throw new AppError("Profil mahasiswa tidak ditemukan.", 404, "NOT_FOUND");
        }
        // Lock existing study plan row if any
        let planRes = await client.query(`SELECT id, status FROM study_plans
       WHERE student_id = $1 AND academic_period_id = $2
       FOR UPDATE`, [studentId, input.academicPeriodId]);
        let plan = planRes.rows[0];
        if (plan && (plan.status === "APPROVED" || plan.status === "SUBMITTED")) {
            throw new AppError(`KRS dengan status ${plan.status} tidak dapat diubah.`, 409, "KRS_LOCKED");
        }
        if (!plan) {
            const inserted = await client.query(`INSERT INTO study_plans (student_id, academic_period_id, status)
         VALUES ($1, $2, 'DRAFT')
         RETURNING id, status`, [studentId, input.academicPeriodId]);
            plan = inserted.rows[0];
        }
        // Lock target offerings & load full details for validation
        const offerings = [];
        if (uniqueOfferingIds.length > 0) {
            await client.query(`SELECT id FROM class_offerings WHERE id = ANY($1::uuid[]) FOR UPDATE`, [uniqueOfferingIds]);
            const offRes = await client.query(`SELECT
           co.id, co.course_id, c.code AS course_code, c.name AS course_name,
           co.class_code, c.credits, co.capacity, co.academic_period_id, co.status,
           (
             SELECT COUNT(*)::int
             FROM study_plan_details spd
             JOIN study_plans stp ON stp.id = spd.study_plan_id
             WHERE spd.class_offering_id = co.id
               AND stp.status IN ('SUBMITTED', 'APPROVED')
               AND stp.student_id <> $2
           ) AS enrolled_count,
           (
             SELECT COALESCE(
               json_agg(
                 json_build_object(
                   'dayOfWeek', sch.day_of_week,
                   'startTime', sch.start_time::text,
                   'endTime', sch.end_time::text
                 )
               ),
               '[]'::json
             )
             FROM schedules sch
             WHERE sch.class_offering_id = co.id
           ) AS schedules,
           (
             SELECT COALESCE(
               json_agg(
                 json_build_object(
                   'prerequisiteCourseId', pc.id,
                   'code', pc.code,
                   'name', pc.name,
                   'minimumGrade', cp.minimum_grade
                 )
               ),
               '[]'::json
             )
             FROM course_prerequisites cp
             JOIN courses pc ON pc.id = cp.prerequisite_course_id
             WHERE cp.course_id = co.course_id
           ) AS prerequisites
         FROM class_offerings co
         JOIN courses c ON c.id = co.course_id
         WHERE co.id = ANY($1::uuid[])`, [uniqueOfferingIds, studentId]);
            for (const row of offRes.rows) {
                offerings.push({
                    id: row.id,
                    courseId: row.course_id,
                    courseCode: row.course_code,
                    courseName: row.course_name,
                    classCode: row.class_code,
                    credits: row.credits,
                    capacity: row.capacity,
                    enrolledCount: row.enrolled_count,
                    academicPeriodId: row.academic_period_id,
                    status: row.status,
                    schedules: row.schedules ?? [],
                    prerequisites: row.prerequisites ?? [],
                });
            }
        }
        if (mode === "SUBMITTED") {
            const passedRes = await client.query(`SELECT co.course_id, g.letter_grade
         FROM grades g
         JOIN class_offerings co ON co.id = g.class_offering_id
         WHERE g.student_id = $1
           AND g.publication_status IN ('PUBLISHED', 'LOCKED')
           AND g.letter_grade IS NOT NULL`, [studentId]);
            const passedMap = new Map();
            for (const r of passedRes.rows) {
                passedMap.set(r.course_id, r.letter_grade);
            }
            const issues = validateStudyPlanRules({
                targetPeriodId: input.academicPeriodId,
                krsStartAt: period.krs_start_at ? new Date(period.krs_start_at) : null,
                krsEndAt: period.krs_end_at ? new Date(period.krs_end_at) : null,
                now: new Date(),
                maxCredits,
                selectedOfferings: offerings,
                passedCourseGrades: passedMap,
                gradingScale: policies.grading_scale,
            });
            if (issues.length > 0) {
                throw new AppError(issues[0].message, 400, issues[0].code);
            }
        }
        // Replace details cleanly
        await client.query(`DELETE FROM study_plan_details WHERE study_plan_id = $1`, [plan.id]);
        for (const off of offerings) {
            await client.query(`INSERT INTO study_plan_details (study_plan_id, class_offering_id, credits_snapshot)
         VALUES ($1, $2, $3)`, [plan.id, off.id, off.credits]);
        }
        const updatedPlan = await client.query(`UPDATE study_plans
       SET status = $2::study_plan_status,
           submitted_at = CASE WHEN $2 = 'SUBMITTED' THEN now() ELSE submitted_at END,
           updated_at = now()
       WHERE id = $1
       RETURNING *`, [plan.id, mode]);
        if (mode === "SUBMITTED" && student.advisor_user_id) {
            await client.query(`INSERT INTO notifications (user_id, title, message, target_url)
         VALUES ($1, $2, $3, '/lecturer/perwalian')`, [
                student.advisor_user_id,
                "KRS Baru Menunggu Persetujuan",
                `${student.full_name} (${student.nim}) telah mengajukan KRS untuk periode ${period.name}.`,
            ]);
        }
        return updatedPlan.rows[0];
    });
}
export async function listAdvisorStudyPlans(lecturerId, statusFilter) {
    const res = await query(`SELECT
       sp_plan.id AS study_plan_id,
       st.id AS student_id,
       st.nim,
       st.full_name AS student_name,
       prog.name AS study_program_name,
       st.entry_year,
       ap.id AS period_id,
       ap.name AS period_name,
       sp_plan.status::text,
       sp_plan.submitted_at::text,
       COALESCE(SUM(spd.credits_snapshot), 0)::int AS total_credits,
       COUNT(spd.id)::int AS class_count
     FROM students st
     JOIN study_programs prog ON prog.id = st.study_program_id
     CROSS JOIN LATERAL (
       SELECT id, name FROM academic_periods WHERE is_active = true LIMIT 1
     ) ap
     LEFT JOIN study_plans sp_plan
       ON sp_plan.student_id = st.id AND sp_plan.academic_period_id = ap.id
     LEFT JOIN study_plan_details spd ON spd.study_plan_id = sp_plan.id
     WHERE st.advisor_lecturer_id = $1
       AND st.status = 'ACTIVE'
       AND ($2::text IS NULL OR sp_plan.status::text = $2)
     GROUP BY sp_plan.id, st.id, prog.name, ap.id, ap.name
     ORDER BY
       CASE WHEN sp_plan.status = 'SUBMITTED' THEN 0 ELSE 1 END,
       st.nim ASC`, [lecturerId, statusFilter || null]);
    return res.rows;
}
export async function getAdvisorStudyPlanDetail(lecturerId, studyPlanId) {
    const planRes = await query(`SELECT
       sp.id, sp.student_id, s.full_name AS student_name, s.nim,
       prog.name AS study_program_name, ap.name AS period_name,
       sp.status::text, sp.submitted_at::text, sp.approved_at::text
     FROM study_plans sp
     JOIN students s ON s.id = sp.student_id
     JOIN study_programs prog ON prog.id = s.study_program_id
     JOIN academic_periods ap ON ap.id = sp.academic_period_id
     WHERE sp.id = $1`, [studyPlanId]);
    const plan = planRes.rows[0];
    if (!plan)
        throw new AppError("KRS tidak ditemukan.", 404, "NOT_FOUND");
    await assertAdvisorOfStudent(lecturerId, plan.student_id);
    const itemsRes = await query(`SELECT
       spd.class_offering_id, c.code AS course_code, c.name AS course_name,
       co.class_code, spd.credits_snapshot AS credits, l.full_name AS lecturer_name,
       string_agg(
         CASE sch.day_of_week
           WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu'
           WHEN 4 THEN 'Kamis' WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' ELSE 'Minggu'
         END || ' ' || to_char(sch.start_time, 'HH24:MI') || '-' || to_char(sch.end_time, 'HH24:MI') || ' (' || sch.room || ')',
         '; '
       ) AS schedule_summary
     FROM study_plan_details spd
     JOIN class_offerings co ON co.id = spd.class_offering_id
     JOIN courses c ON c.id = co.course_id
     JOIN lecturers l ON l.id = co.lecturer_id
     LEFT JOIN schedules sch ON sch.class_offering_id = co.id
     WHERE spd.study_plan_id = $1
     GROUP BY spd.class_offering_id, c.code, c.name, co.class_code, spd.credits_snapshot, l.full_name
     ORDER BY c.code`, [studyPlanId]);
    const historyRes = await query(`SELECT h.id, h.decision::text, h.reason, h.decided_at::text, l.full_name AS lecturer_name
     FROM krs_approval_histories h
     JOIN lecturers l ON l.id = h.lecturer_id
     WHERE h.study_plan_id = $1
     ORDER BY h.decided_at DESC`, [studyPlanId]);
    return { plan, items: itemsRes.rows, histories: historyRes.rows };
}
export async function decideStudyPlan(lecturerId, studyPlanId, raw) {
    const input = z
        .object({
        decision: z.enum(["APPROVED", "REJECTED"]),
        reason: z.string().trim().max(1000).optional(),
    })
        .parse(raw);
    if (input.decision === "REJECTED" && (!input.reason || input.reason.length < 3)) {
        throw new AppError("Alasan penolakan wajib diisi minimal 3 karakter.", 400);
    }
    return withTransaction(async (client) => {
        const planRes = await client.query(`SELECT sp.id, sp.student_id, sp.status::text, s.user_id AS student_user_id, ap.name AS period_name
       FROM study_plans sp
       JOIN students s ON s.id = sp.student_id
       JOIN academic_periods ap ON ap.id = sp.academic_period_id
       WHERE sp.id = $1
       FOR UPDATE`, [studyPlanId]);
        const plan = planRes.rows[0];
        if (!plan)
            throw new AppError("KRS tidak ditemukan.", 404, "NOT_FOUND");
        await assertAdvisorOfStudent(lecturerId, plan.student_id);
        if (plan.status !== "SUBMITTED") {
            throw new AppError("Hanya KRS berstatus SUBMITTED yang dapat diproses.", 409, "INVALID_STATE");
        }
        await client.query(`UPDATE study_plans
       SET status = $2::study_plan_status,
           approved_at = CASE WHEN $2 = 'APPROVED' THEN now() ELSE NULL END,
           updated_at = now()
       WHERE id = $1`, [studyPlanId, input.decision]);
        await client.query(`INSERT INTO krs_approval_histories (study_plan_id, lecturer_id, decision, reason)
       VALUES ($1, $2, $3::approval_decision, $4)`, [studyPlanId, lecturerId, input.decision, input.reason ?? null]);
        const statusLabel = input.decision === "APPROVED" ? "disetujui" : "ditolak";
        await client.query(`INSERT INTO notifications (user_id, title, message, target_url)
       VALUES ($1, $2, $3, '/student/krs')`, [
            plan.student_user_id,
            `KRS ${input.decision === "APPROVED" ? "Disetujui" : "Ditolak"} Dosen Wali`,
            `KRS periode ${plan.period_name} telah ${statusLabel}.${input.reason ? ` Catatan: ${input.reason}` : ""}`,
        ]);
        return { id: studyPlanId, status: input.decision };
    });
}
