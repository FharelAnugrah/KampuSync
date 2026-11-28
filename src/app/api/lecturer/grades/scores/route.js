import { z } from "zod";
import { requireApiUser } from "@/lib/auth/guards";
import { AppError, jsonError, jsonOk } from "@/lib/http";
import { saveClassScores } from "@/modules/grades/grades.service";
const schema = z.object({
    classOfferingId: z.string().uuid(),
    reason: z.string().optional(),
    entries: z.array(z.object({
        studentId: z.string().uuid(),
        scores: z.record(z.string(), z.coerce.number()),
    })),
});
export async function POST(req) {
    try {
        const user = await requireApiUser(["LECTURER"]);
        if (!user.lecturer)
            throw new AppError("Profil dosen tidak ditemukan.", 404);
        const parsed = schema.parse(await req.json());
        const res = await saveClassScores(user.lecturer.id, user.id, parsed.classOfferingId, {
            reason: parsed.reason,
            entries: parsed.entries,
        });
        return jsonOk(res);
    }
    catch (err) {
        return jsonError(err);
    }
}
