import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { listStudyPrograms } from "@/modules/academic-master/master.repository";
import { createStudyProgram } from "@/modules/academic-master/master.service";
export async function GET(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const url = new URL(req.url);
        const items = await listStudyPrograms(url.searchParams.get("search") ?? "", url.searchParams.get("facultyId") ?? undefined);
        return jsonOk(items);
    }
    catch (err) {
        return jsonError(err);
    }
}
export async function POST(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const created = await createStudyProgram(await req.json());
        return jsonOk(created, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
