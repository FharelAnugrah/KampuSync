import { cookies } from "next/headers";
import { query } from "@/lib/db/pool";
import { SESSION_COOKIE_NAME, verifySessionToken, } from "./session-token";
export async function getCurrentUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);
    if (!session)
        return null;
    const result = await query(`SELECT
       u.id,
       u.email,
       u.role,
       u.is_active,
       (SELECT COUNT(*)::int FROM notifications n WHERE n.user_id = u.id AND n.is_read = false) AS unread_notifications,
       s.id AS student_id,
       s.nim,
       s.full_name AS student_name,
       s.study_program_id,
       sp.name AS study_program_name,
       f.name AS faculty_name,
       s.advisor_lecturer_id,
       adv.full_name AS advisor_name,
       s.entry_year,
       s.status AS student_status,
       l.id AS lecturer_id,
       l.nidn,
       l.full_name AS lecturer_name,
       l.status AS lecturer_status,
       (SELECT COUNT(*)::int FROM students st WHERE st.advisor_lecturer_id = l.id AND st.status = 'ACTIVE') AS advisee_count
     FROM users u
     LEFT JOIN students s ON s.user_id = u.id
     LEFT JOIN study_programs sp ON sp.id = s.study_program_id
     LEFT JOIN faculties f ON f.id = sp.faculty_id
     LEFT JOIN lecturers adv ON adv.id = s.advisor_lecturer_id
     LEFT JOIN lecturers l ON l.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`, [session.userId]);
    const row = result.rows[0];
    if (!row || !row.is_active)
        return null;
    const fullName = row.student_name ?? row.lecturer_name ?? (row.role === "ADMIN" ? "Admin Akademik" : row.email);
    const user = {
        id: row.id,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        fullName,
        unreadNotifications: row.unread_notifications ?? 0,
    };
    if (row.student_id && row.nim && row.study_program_id) {
        user.student = {
            id: row.student_id,
            nim: row.nim,
            studyProgramId: row.study_program_id,
            studyProgramName: row.study_program_name ?? "",
            facultyName: row.faculty_name ?? "",
            advisorLecturerId: row.advisor_lecturer_id,
            advisorName: row.advisor_name,
            entryYear: row.entry_year ?? 0,
            status: row.student_status ?? "ACTIVE",
        };
    }
    if (row.lecturer_id) {
        user.lecturer = {
            id: row.lecturer_id,
            nidn: row.nidn,
            status: row.lecturer_status ?? "ACTIVE",
            adviseeCount: row.advisee_count ?? 0,
        };
    }
    return user;
}
export function getHomePathForRole(role) {
    switch (role) {
        case "ADMIN":
            return "/admin";
        case "LECTURER":
            return "/lecturer";
        case "STUDENT":
            return "/student";
    }
}
