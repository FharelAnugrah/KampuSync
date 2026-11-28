import { redirect } from "next/navigation";
import { query } from "@/lib/db/pool";
import { AppError } from "@/lib/http";
import { getCurrentUser, getHomePathForRole } from "./current-user";
/**
 * Page-level server guard: redirects unauthenticated or unauthorized users.
 */
export async function requirePageUser(allowedRoles) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        redirect(getHomePathForRole(user.role));
    }
    return user;
}
/**
 * API / Server Action guard: throws AppError(401/403) instead of redirecting.
 */
export async function requireApiUser(allowedRoles) {
    const user = await getCurrentUser();
    if (!user) {
        throw new AppError("Sesi tidak valid atau telah berakhir. Silakan masuk kembali.", 401, "UNAUTHORIZED");
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        throw new AppError("Anda tidak memiliki hak akses untuk tindakan ini.", 403, "FORBIDDEN");
    }
    return user;
}
/**
 * Verifies a lecturer is assigned to teach the given class offering.
 */
export async function assertClassLecturer(lecturerId, classOfferingId) {
    const res = await query(`SELECT id FROM class_offerings WHERE id = $1 AND lecturer_id = $2 LIMIT 1`, [classOfferingId, lecturerId]);
    if (!res.rowCount) {
        throw new AppError("Anda tidak ditugaskan sebagai pengampu kelas ini.", 403, "FORBIDDEN");
    }
}
/**
 * Verifies a lecturer is the assigned academic advisor (Dosen Wali) of the student.
 */
export async function assertAdvisorOfStudent(lecturerId, studentId) {
    const res = await query(`SELECT id FROM students WHERE id = $1 AND advisor_lecturer_id = $2 LIMIT 1`, [studentId, lecturerId]);
    if (!res.rowCount) {
        throw new AppError("Anda bukan Dosen Wali untuk mahasiswa ini.", 403, "FORBIDDEN");
    }
}
