import { z } from "zod";
import { query } from "@/lib/db/pool";
import { withTransaction } from "@/lib/db/transaction";
import { assertClassLecturer } from "@/lib/auth/guards";
import { AppError } from "@/lib/http";
import { getAcademicPolicies, resolveLetterGrade, } from "@/modules/policies/policy.service";
export function computeWeightedFinalScore(components, scoresByComponentId) {
    let total = 0;
    for (const comp of components) {
        const raw = scoresByComponentId[comp.id] ?? 0;
        total += (raw * Number(comp.weight)) / 100;
    }
    return Number(total.toFixed(2));
}
export async function getClassGradebook(lecturerId, classOfferingId) {
    await assertClassLecturer(lecturerId, classOfferingId);
    const componentsRes = await query(`SELECT id, name, weight::text
     FROM grade_components
     WHERE class_offering_id = $1
     ORDER BY created_at ASC`, [classOfferingId]);
    const studentsRes = await query(`SELECT
       st.id AS student_id,
       st.nim,
       st.full_name,
       g.id AS grade_id,
       g.final_score::text,
       g.letter_grade,
       g.publication_status::text,
       (
         SELECT json_object_agg(gs.grade_component_id::text, gs.score::float8)
         FROM grade_scores gs
         WHERE gs.grade_id = g.id
       ) AS scores
     FROM study_plans sp
     JOIN study_plan_details spd ON spd.study_plan_id = sp.id
     JOIN students st ON st.id = sp.student_id
     LEFT JOIN grades g
       ON g.student_id = st.id
       AND g.class_offering_id = spd.class_offering_id
     WHERE spd.class_offering_id = $1
       AND sp.status = 'APPROVED'
     ORDER BY st.nim ASC`, [classOfferingId]);
    return {
        components: componentsRes.rows.map((c) => ({
            id: c.id,
            name: c.name,
            weight: Number(c.weight),
        })),
        students: studentsRes.rows.map((s) => ({
            studentId: s.student_id,
            nim: s.nim,
            fullName: s.full_name,
            gradeId: s.grade_id,
            finalScore: s.final_score !== null ? Number(s.final_score) : null,
            letterGrade: s.letter_grade,
            publicationStatus: s.publication_status ?? "DRAFT",
            scores: s.scores ?? {},
        })),
    };
}
export async function upsertGradeComponents(lecturerId, classOfferingId, raw) {
    await assertClassLecturer(lecturerId, classOfferingId);
    const input = z
        .object({
        components: z
            .array(z.object({
            name: z.string().trim().min(1, "Nama komponen wajib diisi.").max(100),
            weight: z.coerce.number().positive("Bobot harus > 0.").max(100),
        }))
            .min(1, "Minimal satu komponen nilai."),
    })
        .parse(raw);
    const totalWeight = input.components.reduce((acc, c) => acc + c.weight, 0);
    if (totalWeight > 100.01) {
        throw new AppError("Total bobot komponen tidak boleh melebihi 100%.", 400);
    }
    return withTransaction(async (client) => {
        const lockedCheck = await client.query(`SELECT 1 FROM grades WHERE class_offering_id = $1 AND publication_status = 'LOCKED' LIMIT 1`, [classOfferingId]);
        if (lockedCheck.rowCount) {
            throw new AppError("Komponen nilai tidak dapat diubah karena nilai sudah dikunci.", 409);
        }
        // Remove existing scores/components cleanly if updating structure before lock
        await client.query(`DELETE FROM grade_scores WHERE grade_component_id IN (SELECT id FROM grade_components WHERE class_offering_id = $1)`, [classOfferingId]);
        await client.query(`DELETE FROM grade_components WHERE class_offering_id = $1`, [
            classOfferingId,
        ]);
        const inserted = [];
        for (const comp of input.components) {
            const res = await client.query(`INSERT INTO grade_components (class_offering_id, name, weight)
         VALUES ($1, $2, $3)
         RETURNING id, name, weight::float8 AS weight`, [classOfferingId, comp.name, comp.weight]);
            inserted.push(res.rows[0]);
        }
        return inserted;
    });
}
export async function saveClassScores(lecturerId, actorUserId, classOfferingId, raw) {
    await assertClassLecturer(lecturerId, classOfferingId);
    const input = z
        .object({
        reason: z.string().trim().max(500).optional(),
        entries: z.array(z.object({
            studentId: z.string().uuid(),
            scores: z.record(z.string().uuid(), z.coerce.number().min(0).max(100)),
        })),
    })
        .parse(raw);
    const policies = await getAcademicPolicies();
    return withTransaction(async (client) => {
        const compRes = await client.query(`SELECT id, weight::text FROM grade_components WHERE class_offering_id = $1`, [classOfferingId]);
        if (!compRes.rowCount) {
            throw new AppError("Tetapkan komponen penilaian terlebih dahulu.", 400);
        }
        const components = compRes.rows.map((c) => ({ id: c.id, weight: Number(c.weight) }));
        const enrolledRes = await client.query(`SELECT sp.student_id
       FROM study_plans sp
       JOIN study_plan_details spd ON spd.study_plan_id = sp.id
       WHERE spd.class_offering_id = $1 AND sp.status = 'APPROVED'`, [classOfferingId]);
        const enrolledSet = new Set(enrolledRes.rows.map((r) => r.student_id));
        for (const entry of input.entries) {
            if (!enrolledSet.has(entry.studentId)) {
                throw new AppError("Mahasiswa tidak terdaftar pada kelas ini.", 400, "NOT_ENROLLED");
            }
            const finalScore = computeWeightedFinalScore(components, entry.scores);
            const { letter } = resolveLetterGrade(finalScore, policies.grading_scale);
            const existingRes = await client.query(`SELECT id, final_score::text, letter_grade, publication_status::text
         FROM grades
         WHERE student_id = $1 AND class_offering_id = $2
         FOR UPDATE`, [entry.studentId, classOfferingId]);
            const existing = existingRes.rows[0];
            if (existing?.publication_status === "LOCKED") {
                throw new AppError("Nilai yang sudah dikunci (LOCKED) tidak dapat diubah.", 409);
            }
            if (existing?.publication_status === "PUBLISHED") {
                if (!policies.allow_post_publish_grade_edit.enabled) {
                    throw new AppError("Perubahan nilai setelah publikasi tidak diizinkan kebijakan.", 403);
                }
                const changed = Number(existing.final_score ?? -1) !== finalScore ||
                    existing.letter_grade !== letter;
                if (changed && policies.allow_post_publish_grade_edit.requireReason && !input.reason) {
                    throw new AppError("Perubahan nilai yang sudah diterbitkan wajib menyertakan alasan perubahan.", 400);
                }
            }
            const gradeRes = await client.query(`INSERT INTO grades (student_id, class_offering_id, final_score, letter_grade)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, class_offering_id)
         DO UPDATE SET final_score = EXCLUDED.final_score,
                       letter_grade = EXCLUDED.letter_grade,
                       updated_at = now()
         RETURNING id`, [entry.studentId, classOfferingId, finalScore, letter]);
            const gradeId = gradeRes.rows[0].id;
            for (const comp of components) {
                const compScore = entry.scores[comp.id] ?? 0;
                await client.query(`INSERT INTO grade_scores (grade_id, grade_component_id, score)
           VALUES ($1, $2, $3)
           ON CONFLICT (grade_id, grade_component_id)
           DO UPDATE SET score = EXCLUDED.score, updated_at = now()`, [gradeId, comp.id, compScore]);
            }
            if (existing?.publication_status === "PUBLISHED") {
                await client.query(`INSERT INTO grade_change_histories
             (grade_id, changed_by, old_final_score, new_final_score, old_letter_grade, new_letter_grade, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    gradeId,
                    actorUserId,
                    existing.final_score !== null ? Number(existing.final_score) : null,
                    finalScore,
                    existing.letter_grade,
                    letter,
                    input.reason ?? "Pembaruan nilai pasca-publikasi",
                ]);
            }
        }
        return { savedCount: input.entries.length };
    });
}
export async function publishClassGrades(lecturerId, classOfferingId, lockAfterPublish = false) {
    await assertClassLecturer(lecturerId, classOfferingId);
    return withTransaction(async (client) => {
        const weightRes = await client.query(`SELECT COALESCE(SUM(weight), 0)::text AS total_weight
       FROM grade_components
       WHERE class_offering_id = $1`, [classOfferingId]);
        const totalWeight = Number(weightRes.rows[0]?.total_weight ?? 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
            throw new AppError(`Total bobot komponen harus tepat 100% sebelum publikasi (saat ini ${totalWeight}%).`, 400, "INVALID_WEIGHT_SUM");
        }
        const nextStatus = lockAfterPublish ? "LOCKED" : "PUBLISHED";
        const updated = await client.query(`UPDATE grades
       SET publication_status = $2::grade_publication_status,
           published_at = COALESCE(published_at, now()),
           updated_at = now()
       WHERE class_offering_id = $1
         AND final_score IS NOT NULL
         AND publication_status <> 'LOCKED'
       RETURNING student_id`, [classOfferingId, nextStatus]);
        if (!updated.rowCount) {
            throw new AppError("Belum ada nilai mahasiswa yang tersimpan untuk diterbitkan.", 400);
        }
        const classMeta = await client.query(`SELECT c.code, c.name
       FROM class_offerings co
       JOIN courses c ON c.id = co.course_id
       WHERE co.id = $1`, [classOfferingId]);
        const course = classMeta.rows[0];
        await client.query(`INSERT INTO notifications (user_id, title, message, target_url)
       SELECT s.user_id, $2, $3, '/student/grades'
       FROM students s
       WHERE s.id = ANY($1::uuid[])`, [
            updated.rows.map((r) => r.student_id),
            `Nilai ${course?.code ?? ""} Diterbitkan`,
            `Nilai akhir mata kuliah ${course?.name ?? ""} telah diterbitkan oleh dosen pengampu.`,
        ]);
        return { publishedCount: updated.rowCount, status: nextStatus };
    });
}
export async function getStudentPublishedGrades(studentId) {
    const res = await query(`SELECT
       class_offering_id, period_name, course_code, course_name,
       class_code, credits, lecturer_name, publication_status::text,
       published_final_score::text, published_letter_grade, published_at::text
     FROM v_student_khs
     WHERE student_id = $1
       AND study_plan_status = 'APPROVED'
     ORDER BY period_name DESC, course_code ASC`, [studentId]);
    return res.rows;
}
