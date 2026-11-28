import { requireApiUser } from "@/lib/auth/guards";
import { AppError, jsonError, jsonOk } from "@/lib/http";
import { closeAttendanceSession, recordManualAttendance, rotateQrSessionToken, } from "@/modules/attendance/attendance.service";
export async function PATCH(req, context) {
    try {
        const user = await requireApiUser(["LECTURER"]);
        if (!user.lecturer)
            throw new AppError("Profil dosen tidak ditemukan.", 404);
        const { id } = await context.params;
        const body = await req.json();
        if (body.action === "close") {
            await closeAttendanceSession(user.lecturer.id, id);
            return jsonOk({ closed: true });
        }
        if (body.action === "rotate_qr") {
            const rotated = await rotateQrSessionToken(user.lecturer.id, id);
            return jsonOk(rotated);
        }
        throw new AppError("Aksi tidak valid.", 400);
    }
    catch (err) {
        return jsonError(err);
    }
}
export async function POST(req, context) {
    try {
        const user = await requireApiUser(["LECTURER"]);
        if (!user.lecturer)
            throw new AppError("Profil dosen tidak ditemukan.", 404);
        const { id } = await context.params;
        const res = await recordManualAttendance(user.lecturer.id, user.id, id, await req.json());
        return jsonOk(res);
    }
    catch (err) {
        return jsonError(err);
    }
}
