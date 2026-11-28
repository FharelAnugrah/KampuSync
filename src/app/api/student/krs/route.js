import { z } from "zod";
import { requireApiUser } from "@/lib/auth/guards";
import { AppError, jsonError, jsonOk } from "@/lib/http";
import { saveOrSubmitStudyPlan } from "@/modules/study-plans/study-plan.service";
const bodySchema = z.object({
    mode: z.enum(["DRAFT", "SUBMITTED"]),
    academicPeriodId: z.string().uuid(),
    classOfferingIds: z.array(z.string().uuid()),
});
export async function POST(req) {
    try {
        const user = await requireApiUser(["STUDENT"]);
        if (!user.student) {
            throw new AppError("Profil mahasiswa tidak ditemukan.", 404);
        }
        const parsed = bodySchema.parse(await req.json());
        const result = await saveOrSubmitStudyPlan(user.student.id, {
            academicPeriodId: parsed.academicPeriodId,
            classOfferingIds: parsed.classOfferingIds,
        }, parsed.mode);
        return jsonOk(result);
    }
    catch (err) {
        return jsonError(err);
    }
}
