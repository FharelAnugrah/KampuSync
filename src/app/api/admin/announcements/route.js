import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { createAnnouncement } from "@/modules/portal/portal.service";
export async function POST(req) {
    try {
        const user = await requireApiUser(["ADMIN"]);
        const created = await createAnnouncement(user.id, await req.json());
        return jsonOk(created, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
