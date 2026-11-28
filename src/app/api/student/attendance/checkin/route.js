import { requireApiUser } from "@/lib/auth/guards";
import { AppError, jsonError, jsonOk } from "@/lib/http";
import { checkInWithQrOrCode } from "@/modules/attendance/attendance.service";
export async function POST(req) {
    try {
        const user = await requireApiUser(["STUDENT"]);
        if (!user.student) {
            throw new AppError("Profil mahasiswa tidak ditemukan.", 404);
        }
        const record = await checkInWithQrOrCode(user.student.id, user.id, await req.json());
        return jsonOk(record, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
