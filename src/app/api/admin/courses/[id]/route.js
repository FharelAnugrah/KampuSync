import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { updateCourse } from "@/modules/academic-master/master.service";
export async function PATCH(req, context) {
    try {
        await requireApiUser(["ADMIN"]);
        const { id } = await context.params;
        const updated = await updateCourse(id, await req.json());
        return jsonOk(updated);
    }
    catch (err) {
        return jsonError(err);
    }
}
