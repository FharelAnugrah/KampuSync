import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { createClassOffering, listClassOfferings } from "@/modules/classes/classes.service";
export async function GET(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const url = new URL(req.url);
        const items = await listClassOfferings({
            academicPeriodId: url.searchParams.get("academicPeriodId") ?? undefined,
            search: url.searchParams.get("search") ?? "",
        });
        return jsonOk(items);
    }
    catch (err) {
        return jsonError(err);
    }
}
export async function POST(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const created = await createClassOffering(await req.json());
        return jsonOk(created, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
