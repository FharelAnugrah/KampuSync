import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { createAcademicEvent } from "@/modules/portal/portal.service";
export async function POST(req) {
    try {
        const user = await requireApiUser(["ADMIN"]);
        void user;
        const created = await createAcademicEvent(await req.json());
        return jsonOk(created, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
