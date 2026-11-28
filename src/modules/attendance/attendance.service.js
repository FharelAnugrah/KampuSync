import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { query } from "@/lib/db/pool";
import { withTransaction } from "@/lib/db/transaction";
import { assertClassLecturer } from "@/lib/auth/guards";
import { AppError } from "@/lib/http";
import { getAcademicPolicies } from "@/modules/policies/policy.service";
export function hashAttendanceToken(raw) {
    return createHash("sha256").update(raw).digest("hex");
}
function generateFallbackCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = randomBytes(6);
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += alphabet[bytes[i] % alphabet.length];
    }
    return code;
}
/**
 * Pure validation helper for QR / fallback-code attendance check-in (FR-019, FR-020).
 */
export function evaluateQrCheckIn(input) {
    if (!input.isEnrolled) {
        throw new AppError("Anda tidak terdaftar pada kelas ini (KRS belum disetujui).", 403, "NOT_ENROLLED");
    }
    if (input.sessionStatus !== "OPEN") {
        throw new AppError("Sesi presensi sudah ditutup atau dibatalkan.", 409, "SESSION_NOT_OPEN");
    }
    if (input.now < input.opensAt) {
        throw new AppError("Sesi presensi belum dibuka.", 409, "SESSION_NOT_STARTED");
    }
    if (input.closesAt && input.now > input.closesAt) {
        throw new AppError("Waktu aktif presensi QR telah kedaluwarsa.", 409, "SESSION_EXPIRED");
    }
    if (input.alreadyRecorded) {
        throw new AppError("Anda sudah tercatat melakukan presensi pada sesi ini.", 409, "DUPLICATE_ATTENDANCE");
    }
    const trimmed = input.submittedTokenOrCode.trim();
    const rawHash = hashAttendanceToken(trimmed);
    const codeHash = hashAttendanceToken(trimmed.toUpperCase());
    const validToken = Boolean(input.qrTokenHash && rawHash === input.qrTokenHash);
    const validCode = Boolean(input.fallbackCodeHash && codeHash === input.fallbackCodeHash);
    if (!validToken && !validCode) {
        throw new AppError("Kode atau QR presensi tidak valid.", 400, "INVALID_QR_TOKEN");
    }
}
export async function listSessionsForClass(classOfferingId) {
    const res = await query(`SELECT
       s.id, s.class_offering_id, s.meeting_number, s.topic,
       s.method::text, s.status::text, s.opens_at::text, s.closes_at::text,
       COUNT(r.id)::int AS recorded_count
     FROM attendance_sessions s
     LEFT JOIN attendance_records r ON r.attendance_session_id = s.id
     WHERE s.class_offering_id = $1
     GROUP BY s.id
     ORDER BY s.meeting_number DESC`, [classOfferingId]);
    return res.rows;
}
export async function getClassEnrolledStudentsWithSession(classOfferingId, sessionId) {
    const res = await query(`SELECT
       st.id AS student_id,
       st.nim,
       st.full_name,
       ar.attendance_status::text,
       ar.recorded_at::text
     FROM study_plans sp
     JOIN study_plan_details spd ON spd.study_plan_id = sp.id
     JOIN students st ON st.id = sp.student_id
     LEFT JOIN attendance_records ar
       ON ar.attendance_session_id = $2::uuid
       AND ar.student_id = st.id
     WHERE spd.class_offering_id = $1
       AND sp.status = 'APPROVED'
     ORDER BY st.nim ASC`, [classOfferingId, sessionId ?? null]);
    return res.rows;
}
export async function createAttendanceSession(lecturerId, raw) {
    const input = z
        .object({
        classOfferingId: z.string().uuid(),
        meetingNumber: z.coerce.number().int().min(1).max(32),
        topic: z.string().trim().max(200).optional(),
        method: z.enum(["MANUAL", "QR"]),
        durationMinutes: z.coerce.number().int().min(1).max(180).optional(),
    })
        .parse(raw);
    await assertClassLecturer(lecturerId, input.classOfferingId);
    const policies = await getAcademicPolicies();
    const duration = input.durationMinutes ?? policies.qr_attendance_ttl_minutes.minutes;
    let rawToken = null;
    let fallbackCode = null;
    let qrTokenHash = null;
    let fallbackCodeHash = null;
    if (input.method === "QR") {
        rawToken = randomBytes(24).toString("base64url");
        fallbackCode = generateFallbackCode();
        qrTokenHash = hashAttendanceToken(rawToken);
        fallbackCodeHash = hashAttendanceToken(fallbackCode);
    }
    try {
        const res = await query(`INSERT INTO attendance_sessions (
         class_offering_id, meeting_number, topic, method, status,
         qr_token_hash, fallback_code_hash, opens_at, closes_at, created_by
       )
       VALUES (
         $1, $2, $3, $4::attendance_method, 'OPEN',
         $5, $6, now(),
         CASE WHEN $4 = 'QR' THEN now() + ($7 || ' minutes')::interval ELSE NULL END,
         $8
       )
       RETURNING id, class_offering_id, meeting_number, method::text, status::text, opens_at::text, closes_at::text`, [
            input.classOfferingId,
            input.meetingNumber,
            input.topic ?? null,
            input.method,
            qrTokenHash,
            fallbackCodeHash,
            String(duration),
            lecturerId,
        ]);
        const session = res.rows[0];
        return {
            session,
            // Returned only at generation time; DB stores only SHA-256 hashes
            qrPayload: rawToken ? JSON.stringify({ sessionId: session.id, token: rawToken }) : null,
            fallbackCode,
        };
    }
    catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
            throw new AppError(`Pertemuan ke-${input.meetingNumber} sudah dibuat untuk kelas ini.`, 409, "CONFLICT");
        }
        throw err;
    }
}
export async function rotateQrSessionToken(lecturerId, sessionId) {
    const sessRes = await query(`SELECT id, class_offering_id, method::text, status::text
     FROM attendance_sessions WHERE id = $1`, [sessionId]);
    const sess = sessRes.rows[0];
    if (!sess)
        throw new AppError("Sesi presensi tidak ditemukan.", 404, "NOT_FOUND");
    await assertClassLecturer(lecturerId, sess.class_offering_id);
    if (sess.method !== "QR" || sess.status !== "OPEN") {
        throw new AppError("Hanya sesi QR yang masih aktif yang dapat diperbarui.", 409);
    }
    const policies = await getAcademicPolicies();
    const rawToken = randomBytes(24).toString("base64url");
    const fallbackCode = generateFallbackCode();
    const updated = await query(`UPDATE attendance_sessions
     SET qr_token_hash = $2,
         fallback_code_hash = $3,
         closes_at = now() + ($4 || ' minutes')::interval
     WHERE id = $1
     RETURNING closes_at::text`, [
        sessionId,
        hashAttendanceToken(rawToken),
        hashAttendanceToken(fallbackCode),
        String(policies.qr_attendance_ttl_minutes.minutes),
    ]);
    return {
        qrPayload: JSON.stringify({ sessionId, token: rawToken }),
        fallbackCode,
        closesAt: updated.rows[0].closes_at,
    };
}
export async function closeAttendanceSession(lecturerId, sessionId) {
    const sessRes = await query(`SELECT class_offering_id FROM attendance_sessions WHERE id = $1`, [sessionId]);
    const sess = sessRes.rows[0];
    if (!sess)
        throw new AppError("Sesi presensi tidak ditemukan.", 404, "NOT_FOUND");
    await assertClassLecturer(lecturerId, sess.class_offering_id);
    await query(`UPDATE attendance_sessions SET status = 'CLOSED', closes_at = COALESCE(closes_at, now()) WHERE id = $1`, [sessionId]);
}
export async function recordManualAttendance(lecturerId, actorUserId, sessionId, raw) {
    const input = z
        .object({
        entries: z.array(z.object({
            studentId: z.string().uuid(),
            status: z.enum(["PRESENT", "EXCUSED", "SICK", "ABSENT"]),
        })),
    })
        .parse(raw);
    return withTransaction(async (client) => {
        const sessRes = await client.query(`SELECT class_offering_id, status::text FROM attendance_sessions WHERE id = $1 FOR UPDATE`, [sessionId]);
        const sess = sessRes.rows[0];
        if (!sess)
            throw new AppError("Sesi presensi tidak ditemukan.", 404, "NOT_FOUND");
        await assertClassLecturer(lecturerId, sess.class_offering_id);
        if (sess.status === "CANCELLED") {
            throw new AppError("Sesi yang dibatalkan tidak dapat diubah.", 409);
        }
        const enrolledRes = await client.query(`SELECT sp.student_id
       FROM study_plans sp
       JOIN study_plan_details spd ON spd.study_plan_id = sp.id
       WHERE spd.class_offering_id = $1 AND sp.status = 'APPROVED'`, [sess.class_offering_id]);
        const enrolledSet = new Set(enrolledRes.rows.map((r) => r.student_id));
        for (const entry of input.entries) {
            if (!enrolledSet.has(entry.studentId)) {
                throw new AppError("Mahasiswa tidak terdaftar pada kelas ini.", 400, "NOT_ENROLLED");
            }
            await client.query(`INSERT INTO attendance_records (attendance_session_id, student_id, attendance_status, recorded_by)
         VALUES ($1, $2, $3::attendance_status, $4)
         ON CONFLICT (attendance_session_id, student_id)
         DO UPDATE SET attendance_status = EXCLUDED.attendance_status,
                       recorded_at = now(),
                       recorded_by = EXCLUDED.recorded_by`, [sessionId, entry.studentId, entry.status, actorUserId]);
        }
        return { savedCount: input.entries.length };
    });
}
export async function checkInWithQrOrCode(studentId, studentUserId, raw) {
    const input = z
        .object({
        sessionId: z.string().uuid().optional(),
        tokenOrCode: z.string().trim().min(1, "Kode atau payload QR wajib diisi."),
    })
        .parse(raw);
    let targetSessionId = input.sessionId;
    let tokenOrCode = input.tokenOrCode;
    // Support scanning JSON QR payload directly
    if (tokenOrCode.startsWith("{")) {
        try {
            const parsed = JSON.parse(tokenOrCode);
            if (parsed.sessionId && parsed.token) {
                targetSessionId = parsed.sessionId;
                tokenOrCode = parsed.token;
            }
        }
        catch {
            // treat as raw token/code
        }
    }
    if (!targetSessionId) {
        throw new AppError("Pilih kelas/sesi presensi aktif terlebih dahulu.", 400);
    }
    return withTransaction(async (client) => {
        const sessRes = await client.query(`SELECT id, class_offering_id, status::text, qr_token_hash, fallback_code_hash, opens_at::text, closes_at::text
       FROM attendance_sessions
       WHERE id = $1
       FOR UPDATE`, [targetSessionId]);
        const sess = sessRes.rows[0];
        if (!sess)
            throw new AppError("Sesi presensi tidak ditemukan.", 404, "NOT_FOUND");
        const enrollRes = await client.query(`SELECT sp.id
       FROM study_plans sp
       JOIN study_plan_details spd ON spd.study_plan_id = sp.id
       WHERE sp.student_id = $1 AND spd.class_offering_id = $2 AND sp.status = 'APPROVED'
       LIMIT 1`, [studentId, sess.class_offering_id]);
        const existingRes = await client.query(`SELECT id FROM attendance_records WHERE attendance_session_id = $1 AND student_id = $2 LIMIT 1`, [sess.id, studentId]);
        evaluateQrCheckIn({
            sessionStatus: sess.status,
            opensAt: new Date(sess.opens_at),
            closesAt: sess.closes_at ? new Date(sess.closes_at) : null,
            now: new Date(),
            qrTokenHash: sess.qr_token_hash,
            fallbackCodeHash: sess.fallback_code_hash,
            submittedTokenOrCode: tokenOrCode,
            isEnrolled: Boolean(enrollRes.rowCount),
            alreadyRecorded: Boolean(existingRes.rowCount),
        });
        const inserted = await client.query(`INSERT INTO attendance_records (attendance_session_id, student_id, attendance_status, recorded_by)
       VALUES ($1, $2, 'PRESENT', $3)
       RETURNING *`, [sess.id, studentId, studentUserId]);
        return inserted.rows[0];
    });
}
export async function getStudentAttendanceOverview(studentId) {
    const openSessions = await query(`SELECT
       s.id AS session_id, co.id AS class_offering_id,
       c.code AS course_code, c.name AS course_name, co.class_code,
       s.meeting_number, s.topic, s.closes_at::text,
       (ar.id IS NOT NULL) AS already_recorded
     FROM attendance_sessions s
     JOIN class_offerings co ON co.id = s.class_offering_id
     JOIN courses c ON c.id = co.course_id
     JOIN study_plan_details spd ON spd.class_offering_id = co.id
     JOIN study_plans sp ON sp.id = spd.study_plan_id
     LEFT JOIN attendance_records ar ON ar.attendance_session_id = s.id AND ar.student_id = $1
     WHERE sp.student_id = $1
       AND sp.status = 'APPROVED'
       AND s.method = 'QR'
       AND s.status = 'OPEN'
       AND (s.closes_at IS NULL OR s.closes_at > now())
     ORDER BY s.opens_at DESC`, [studentId]);
    const recaps = await query(`SELECT
       co.id AS class_offering_id,
       c.code AS course_code,
       c.name AS course_name,
       co.class_code,
       COUNT(DISTINCT s.id)::int AS total_sessions,
       COUNT(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 END)::int AS present_count,
       COUNT(CASE WHEN ar.attendance_status = 'EXCUSED' THEN 1 END)::int AS excused_count,
       COUNT(CASE WHEN ar.attendance_status = 'SICK' THEN 1 END)::int AS sick_count,
       COUNT(CASE WHEN ar.attendance_status = 'ABSENT' THEN 1 END)::int AS absent_count
     FROM study_plans sp
     JOIN academic_periods ap ON ap.id = sp.academic_period_id AND ap.is_active = true
     JOIN study_plan_details spd ON spd.study_plan_id = sp.id
     JOIN class_offerings co ON co.id = spd.class_offering_id
     JOIN courses c ON c.id = co.course_id
     LEFT JOIN attendance_sessions s ON s.class_offering_id = co.id AND s.status <> 'CANCELLED'
     LEFT JOIN attendance_records ar ON ar.attendance_session_id = s.id AND ar.student_id = sp.student_id
     WHERE sp.student_id = $1 AND sp.status = 'APPROVED'
     GROUP BY co.id, c.code, c.name, co.class_code
     ORDER BY c.code`, [studentId]);
    return {
        openQrSessions: openSessions.rows,
        recaps: recaps.rows,
    };
}
