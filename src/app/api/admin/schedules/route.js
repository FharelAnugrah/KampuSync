import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { createScheduleSlot } from "@/modules/classes/classes.service";
export async function POST(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const created = await createScheduleSlot(await req.json());
        return jsonOk(created, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
