import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { deleteScheduleSlot } from "@/modules/classes/classes.service";
export async function DELETE(_req, context) {
    try {
        await requireApiUser(["ADMIN"]);
        const { id } = await context.params;
        await deleteScheduleSlot(id);
        return jsonOk({ deleted: true });
    }
    catch (err) {
        return jsonError(err);
    }
}
