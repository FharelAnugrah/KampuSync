import { requireApiUser } from "@/lib/auth/guards";
import { AppError, jsonError, jsonOk } from "@/lib/http";
import { decideStudyPlan } from "@/modules/study-plans/study-plan.service";
export async function POST(req, context) {
    try {
        const user = await requireApiUser(["LECTURER"]);
        if (!user.lecturer) {
            throw new AppError("Profil dosen tidak ditemukan.", 404);
        }
        const { id } = await context.params;
        const result = await decideStudyPlan(user.lecturer.id, id, await req.json());
        return jsonOk(result);
    }
    catch (err) {
        return jsonError(err);
    }
}
