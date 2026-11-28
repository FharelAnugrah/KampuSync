import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { updateLecturer } from "@/modules/users/users.service";
export async function PATCH(req, context) {
    try {
        await requireApiUser(["ADMIN"]);
        const { id } = await context.params;
        const updated = await updateLecturer(id, await req.json());
        return jsonOk(updated);
    }
    catch (err) {
        return jsonError(err);
    }
}
