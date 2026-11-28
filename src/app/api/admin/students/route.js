import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { createStudentAccount, listStudents } from "@/modules/users/users.service";
export async function GET(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const url = new URL(req.url);
        const data = await listStudents({
            search: url.searchParams.get("search") ?? "",
            studyProgramId: url.searchParams.get("studyProgramId") ?? undefined,
            status: url.searchParams.get("status") ?? undefined,
            page: Number(url.searchParams.get("page") ?? 1),
            pageSize: Number(url.searchParams.get("pageSize") ?? 20),
        });
        return jsonOk(data);
    }
    catch (err) {
        return jsonError(err);
    }
}
export async function POST(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const created = await createStudentAccount(await req.json());
        return jsonOk(created, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
