import { requireApiUser } from "@/lib/auth/guards";
import { AppError, jsonError, jsonOk } from "@/lib/http";
import { createAttendanceSession } from "@/modules/attendance/attendance.service";
export async function POST(req) {
    try {
        const user = await requireApiUser(["LECTURER"]);
        if (!user.lecturer) {
            throw new AppError("Profil dosen tidak ditemukan.", 404);
        }
        const result = await createAttendanceSession(user.lecturer.id, await req.json());
        return jsonOk(result, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
