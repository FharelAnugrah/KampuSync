import { z } from "zod";
import { query } from "@/lib/db/pool";
import { withTransaction } from "@/lib/db/transaction";
import { hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/http";
export async function listStudents(params) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const offset = (page - 1) * pageSize;
    const search = (params.search ?? "").trim();
    const res = await query(`SELECT
       s.id, s.user_id, u.email, s.nim, s.full_name, s.entry_year, s.phone, s.status,
       s.study_program_id, sp.name AS study_program_name,
       s.advisor_lecturer_id, adv.full_name AS advisor_name
     FROM students s
     JOIN users u ON u.id = s.user_id
     JOIN study_programs sp ON sp.id = s.study_program_id
     LEFT JOIN lecturers adv ON adv.id = s.advisor_lecturer_id
     WHERE ($1 = '' OR s.nim ILIKE '%' || $1 || '%' OR s.full_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
       AND ($2::uuid IS NULL OR s.study_program_id = $2::uuid)
       AND ($3::text IS NULL OR s.status::text = $3)
     ORDER BY s.nim ASC
     LIMIT $4 OFFSET $5`, [search, params.studyProgramId || null, params.status || null, pageSize, offset]);
    const countRes = await query(`SELECT COUNT(*)::int AS total
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE ($1 = '' OR s.nim ILIKE '%' || $1 || '%' OR s.full_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
       AND ($2::uuid IS NULL OR s.study_program_id = $2::uuid)
       AND ($3::text IS NULL OR s.status::text = $3)`, [search, params.studyProgramId || null, params.status || null]);
    return {
        items: res.rows,
        total: countRes.rows[0]?.total ?? 0,
        page,
        pageSize,
    };
}
export async function listLecturers(search = "", status) {
    const res = await query(`SELECT
       l.id, l.user_id, u.email, l.nidn, l.full_name, l.phone, l.status,
       COUNT(st.id) FILTER (WHERE st.status = 'ACTIVE')::int AS advisee_count
     FROM lecturers l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN students st ON st.advisor_lecturer_id = l.id
     WHERE ($1 = '' OR COALESCE(l.nidn, '') ILIKE '%' || $1 || '%' OR l.full_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR l.status::text = $2)
     GROUP BY l.id, u.email
     ORDER BY l.full_name ASC`, [search.trim(), status || null]);
    return res.rows;
}
const createStudentSchema = z.object({
    email: z.string().trim().email("Email tidak valid."),
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    nim: z.string().trim().min(4, "NIM minimal 4 karakter.").max(30),
    fullName: z.string().trim().min(2, "Nama lengkap wajib diisi.").max(150),
    studyProgramId: z.string().uuid("Program studi wajib dipilih."),
    advisorLecturerId: z.string().uuid().nullable().optional(),
    entryYear: z.coerce.number().int().min(1990).max(2200),
    phone: z.string().trim().max(30).nullable().optional(),
});
export async function createStudentAccount(raw) {
    const input = createStudentSchema.parse(raw);
    const passwordHash = hashPassword(input.password);
    try {
        return await withTransaction(async (client) => {
            const userRes = await client.query(`INSERT INTO users (email, password_hash, role)
         VALUES (lower($1), $2, 'STUDENT')
         RETURNING id`, [input.email, passwordHash]);
            const userId = userRes.rows[0].id;
            const stuRes = await client.query(`INSERT INTO students (user_id, study_program_id, advisor_lecturer_id, nim, full_name, entry_year, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`, [
                userId,
                input.studyProgramId,
                input.advisorLecturerId ?? null,
                input.nim,
                input.fullName,
                input.entryYear,
                input.phone ?? null,
            ]);
            return stuRes.rows[0];
        });
    }
    catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
            throw new AppError("Email atau NIM sudah terdaftar.", 409, "CONFLICT");
        }
        throw err;
    }
}
export async function updateStudent(id, raw) {
    const input = z
        .object({
        fullName: z.string().trim().min(2).max(150).optional(),
        studyProgramId: z.string().uuid().optional(),
        advisorLecturerId: z.string().uuid().nullable().optional(),
        phone: z.string().trim().max(30).nullable().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    })
        .parse(raw);
    return withTransaction(async (client) => {
        const res = await client.query(`UPDATE students
       SET full_name = COALESCE($2, full_name),
           study_program_id = COALESCE($3::uuid, study_program_id),
           advisor_lecturer_id = CASE WHEN $4::boolean THEN $5::uuid ELSE advisor_lecturer_id END,
           phone = COALESCE($6, phone),
           status = COALESCE($7::record_status, status),
           updated_at = now()
       WHERE id = $1
       RETURNING *`, [
            id,
            input.fullName ?? null,
            input.studyProgramId ?? null,
            input.advisorLecturerId !== undefined,
            input.advisorLecturerId ?? null,
            input.phone ?? null,
            input.status ?? null,
        ]);
        if (!res.rowCount) {
            throw new AppError("Data mahasiswa tidak ditemukan.", 404, "NOT_FOUND");
        }
        if (input.status) {
            await client.query(`UPDATE users SET is_active = $2, updated_at = now() WHERE id = $1`, [res.rows[0].user_id, input.status === "ACTIVE"]);
        }
        return res.rows[0];
    });
}
const createLecturerSchema = z.object({
    email: z.string().trim().email("Email tidak valid."),
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    nidn: z.string().trim().min(4).max(30).nullable().optional(),
    fullName: z.string().trim().min(2, "Nama lengkap wajib diisi.").max(150),
    phone: z.string().trim().max(30).nullable().optional(),
});
export async function createLecturerAccount(raw) {
    const input = createLecturerSchema.parse(raw);
    const passwordHash = hashPassword(input.password);
    try {
        return await withTransaction(async (client) => {
            const userRes = await client.query(`INSERT INTO users (email, password_hash, role)
         VALUES (lower($1), $2, 'LECTURER')
         RETURNING id`, [input.email, passwordHash]);
            const userId = userRes.rows[0].id;
            const lecRes = await client.query(`INSERT INTO lecturers (user_id, nidn, full_name, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [userId, input.nidn || null, input.fullName, input.phone || null]);
            return lecRes.rows[0];
        });
    }
    catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
            throw new AppError("Email atau NIDN sudah terdaftar.", 409, "CONFLICT");
        }
        throw err;
    }
}
export async function updateLecturer(id, raw) {
    const input = z
        .object({
        nidn: z.string().trim().max(30).nullable().optional(),
        fullName: z.string().trim().min(2).max(150).optional(),
        phone: z.string().trim().max(30).nullable().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    })
        .parse(raw);
    return withTransaction(async (client) => {
        const res = await client.query(`UPDATE lecturers
       SET nidn = COALESCE($2, nidn),
           full_name = COALESCE($3, full_name),
           phone = COALESCE($4, phone),
           status = COALESCE($5::record_status, status),
           updated_at = now()
       WHERE id = $1
       RETURNING *`, [id, input.nidn ?? null, input.fullName ?? null, input.phone ?? null, input.status ?? null]);
        if (!res.rowCount) {
            throw new AppError("Data dosen tidak ditemukan.", 404, "NOT_FOUND");
        }
        if (input.status) {
            await client.query(`UPDATE users SET is_active = $2, updated_at = now() WHERE id = $1`, [res.rows[0].user_id, input.status === "ACTIVE"]);
        }
        return res.rows[0];
    });
}
