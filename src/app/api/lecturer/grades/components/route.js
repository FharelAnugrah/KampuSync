import { z } from "zod";
import { requireApiUser } from "@/lib/auth/guards";
import { AppError, jsonError, jsonOk } from "@/lib/http";
import { upsertGradeComponents } from "@/modules/grades/grades.service";
const schema = z.object({
    classOfferingId: z.string().uuid(),
    components: z.array(z.object({ name: z.string(), weight: z.coerce.number() })),
});
export async function POST(req) {
    try {
        const user = await requireApiUser(["LECTURER"]);
        if (!user.lecturer)
            throw new AppError("Profil dosen tidak ditemukan.", 404);
        const parsed = schema.parse(await req.json());
        const saved = await upsertGradeComponents(user.lecturer.id, parsed.classOfferingId, {
            components: parsed.components,
        });
        return jsonOk(saved);
    }
    catch (err) {
        return jsonError(err);
    }
}
