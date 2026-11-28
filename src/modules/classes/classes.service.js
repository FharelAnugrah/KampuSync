import { z } from "zod";
import { query } from "@/lib/db/pool";
import { withTransaction } from "@/lib/db/transaction";
import { AppError } from "@/lib/http";
import { slotsOverlap } from "@/lib/schedule-utils";
export async function listClassOfferings(params) {
    const res = await query(`SELECT
       co.id, co.course_id, c.code AS course_code, c.name AS course_name, c.credits,
       sp.name AS study_program_name,
       co.lecturer_id, l.full_name AS lecturer_name,
       co.academic_period_id, ap.name AS period_name,
       co.class_code, co.capacity, co.status,
       (
         SELECT COUNT(*)::int
         FROM study_plan_details spd
         JOIN study_plans stp ON stp.id = spd.study_plan_id
         WHERE spd.class_offering_id = co.id
           AND stp.status IN ('SUBMITTED', 'APPROVED')
       ) AS enrolled_count,
       COALESCE(
         json_agg(
           json_build_object(
             'id', sch.id,
             'dayOfWeek', sch.day_of_week,
             'startTime', sch.start_time::text,
             'endTime', sch.end_time::text,
             'room', sch.room
           ) ORDER BY sch.day_of_week, sch.start_time
         ) FILTER (WHERE sch.id IS NOT NULL),
         '[]'::json
       ) AS schedules
     FROM class_offerings co
     JOIN courses c ON c.id = co.course_id
     JOIN study_programs sp ON sp.id = c.study_program_id
     JOIN lecturers l ON l.id = co.lecturer_id
     JOIN academic_periods ap ON ap.id = co.academic_period_id
     LEFT JOIN schedules sch ON sch.class_offering_id = co.id
     WHERE ($1::uuid IS NULL OR co.academic_period_id = $1::uuid)
       AND ($2::uuid IS NULL OR co.lecturer_id = $2::uuid)
       AND ($3 = '' OR c.code ILIKE '%' || $3 || '%' OR c.name ILIKE '%' || $3 || '%' OR l.full_name ILIKE '%' || $3 || '%')
     GROUP BY co.id, c.code, c.name, c.credits, sp.name, l.full_name, ap.name
     ORDER BY c.code ASC, co.class_code ASC`, [params.academicPeriodId || null, params.lecturerId || null, (params.search ?? "").trim()]);
    return res.rows.map((r) => ({ ...r, schedules: r.schedules ?? [] }));
}
const createClassSchema = z.object({
    courseId: z.string().uuid("Mata kuliah wajib dipilih."),
    lecturerId: z.string().uuid("Dosen pengampu wajib dipilih."),
    academicPeriodId: z.string().uuid("Periode akademik wajib dipilih."),
    classCode: z.string().trim().min(1, "Kode kelas wajib diisi.").max(20),
    capacity: z.coerce.number().int().min(1, "Kapasitas minimal 1.").max(500),
});
export async function createClassOffering(raw) {
    const input = createClassSchema.parse(raw);
    try {
        const res = await query(`INSERT INTO class_offerings (course_id, lecturer_id, academic_period_id, class_code, capacity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [
            input.courseId,
            input.lecturerId,
            input.academicPeriodId,
            input.classCode.toUpperCase(),
            input.capacity,
        ]);
        return res.rows[0];
    }
    catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
            throw new AppError("Kelas dengan kode yang sama sudah ada pada mata kuliah dan periode ini.", 409, "CONFLICT");
        }
        throw err;
    }
}
export async function updateClassOffering(id, raw) {
    const input = z
        .object({
        lecturerId: z.string().uuid().optional(),
        capacity: z.coerce.number().int().min(1).max(500).optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    })
        .parse(raw);
    const res = await query(`UPDATE class_offerings
     SET lecturer_id = COALESCE($2::uuid, lecturer_id),
         capacity = COALESCE($3, capacity),
         status = COALESCE($4::record_status, status),
         updated_at = now()
     WHERE id = $1
     RETURNING *`, [id, input.lecturerId ?? null, input.capacity ?? null, input.status ?? null]);
    if (!res.rowCount) {
        throw new AppError("Kelas tidak ditemukan.", 404, "NOT_FOUND");
    }
    return res.rows[0];
}
const createScheduleSchema = z.object({
    classOfferingId: z.string().uuid("Kelas wajib dipilih."),
    dayOfWeek: z.coerce.number().int().min(1).max(7),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format waktu mulai HH:MM."),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format waktu selesai HH:MM."),
    room: z.string().trim().min(1, "Ruangan wajib diisi.").max(100),
});
/**
 * Creates a schedule slot inside a transaction while enforcing FR-010:
 * no overlap for the same room, lecturer, or class offering in the same period.
 */
export async function createScheduleSlot(raw) {
    const input = createScheduleSchema.parse(raw);
    if (input.endTime <= input.startTime) {
        throw new AppError("Jam selesai harus lebih besar dari jam mulai.", 400);
    }
    return withTransaction(async (client) => {
        const offeringRes = await client.query(`SELECT id, academic_period_id, lecturer_id
       FROM class_offerings
       WHERE id = $1
       FOR UPDATE`, [input.classOfferingId]);
        const target = offeringRes.rows[0];
        if (!target) {
            throw new AppError("Kelas perkuliahan tidak ditemukan.", 404, "NOT_FOUND");
        }
        const candidates = await client.query(`SELECT
         sch.id AS schedule_id,
         co.id AS class_offering_id,
         co.lecturer_id,
         l.full_name AS lecturer_name,
         c.code AS course_code,
         c.name AS course_name,
         co.class_code,
         sch.day_of_week,
         sch.start_time::text,
         sch.end_time::text,
         sch.room
       FROM schedules sch
       JOIN class_offerings co ON co.id = sch.class_offering_id
       JOIN courses c ON c.id = co.course_id
       JOIN lecturers l ON l.id = co.lecturer_id
       WHERE co.academic_period_id = $1
         AND co.status = 'ACTIVE'
         AND sch.day_of_week = $2`, [target.academic_period_id, input.dayOfWeek]);
        const newSlot = {
            dayOfWeek: input.dayOfWeek,
            startTime: input.startTime,
            endTime: input.endTime,
        };
        for (const row of candidates.rows) {
            const existingSlot = {
                dayOfWeek: row.day_of_week,
                startTime: row.start_time,
                endTime: row.end_time,
            };
            if (!slotsOverlap(newSlot, existingSlot))
                continue;
            if (row.class_offering_id === target.id) {
                throw new AppError(`Jadwal kelas ${row.course_code}-${row.class_code} bentrok dengan slot ${row.start_time.slice(0, 5)}–${row.end_time.slice(0, 5)}.`, 409, "CLASS_SCHEDULE_CONFLICT");
            }
            if (row.lecturer_id === target.lecturer_id) {
                throw new AppError(`Bentrok jadwal dosen (${row.lecturer_name}) pada ${row.course_code}-${row.class_code} (${row.start_time.slice(0, 5)}–${row.end_time.slice(0, 5)}).`, 409, "LECTURER_SCHEDULE_CONFLICT");
            }
            if (row.room.trim().toLowerCase() === input.room.trim().toLowerCase()) {
                throw new AppError(`Bentrok ruangan (${row.room}) dengan kelas ${row.course_code}-${row.class_code} (${row.start_time.slice(0, 5)}–${row.end_time.slice(0, 5)}).`, 409, "ROOM_SCHEDULE_CONFLICT");
            }
        }
        const inserted = await client.query(`INSERT INTO schedules (class_offering_id, day_of_week, start_time, end_time, room)
       VALUES ($1, $2, $3::time, $4::time, $5)
       RETURNING *`, [input.classOfferingId, input.dayOfWeek, input.startTime, input.endTime, input.room]);
        return inserted.rows[0];
    });
}
export async function deleteScheduleSlot(id) {
    const res = await query(`DELETE FROM schedules WHERE id = $1 RETURNING id`, [id]);
    if (!res.rowCount) {
        throw new AppError("Jadwal tidak ditemukan.", 404, "NOT_FOUND");
    }
}
