import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { listFaculties } from "@/modules/academic-master/master.repository";
import { createFaculty } from "@/modules/academic-master/master.service";
export async function GET(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const url = new URL(req.url);
        const items = await listFaculties(url.searchParams.get("search") ?? "", url.searchParams.get("status") ?? undefined);
        return jsonOk(items);
    }
    catch (err) {
        return jsonError(err);
    }
}
export async function POST(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const created = await createFaculty(await req.json());
        return jsonOk(created, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
