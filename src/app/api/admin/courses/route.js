import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { listCourses } from "@/modules/academic-master/master.repository";
import { createCourse } from "@/modules/academic-master/master.service";
export async function GET(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const url = new URL(req.url);
        const items = await listCourses(url.searchParams.get("search") ?? "", url.searchParams.get("studyProgramId") ?? undefined);
        return jsonOk(items);
    }
    catch (err) {
        return jsonError(err);
    }
}
export async function POST(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const created = await createCourse(await req.json());
        return jsonOk(created, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
