import { z } from "zod";
import { requireApiUser } from "@/lib/auth/guards";
import { AppError, jsonError, jsonOk } from "@/lib/http";
import { publishClassGrades } from "@/modules/grades/grades.service";
const schema = z.object({
    classOfferingId: z.string().uuid(),
    lock: z.boolean().optional(),
});
export async function POST(req) {
    try {
        const user = await requireApiUser(["LECTURER"]);
        if (!user.lecturer)
            throw new AppError("Profil dosen tidak ditemukan.", 404);
        const parsed = schema.parse(await req.json());
        const res = await publishClassGrades(user.lecturer.id, parsed.classOfferingId, Boolean(parsed.lock));
        return jsonOk(res);
    }
    catch (err) {
        return jsonError(err);
    }
}
