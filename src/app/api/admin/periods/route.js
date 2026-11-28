import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { listAcademicPeriods } from "@/modules/academic-master/master.repository";
import { createAcademicPeriod } from "@/modules/academic-master/master.service";
export async function GET() {
    try {
        await requireApiUser(["ADMIN"]);
        const items = await listAcademicPeriods();
        return jsonOk(items);
    }
    catch (err) {
        return jsonError(err);
    }
}
export async function POST(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const created = await createAcademicPeriod(await req.json());
        return jsonOk(created, 201);
    }
    catch (err) {
        return jsonError(err);
    }
}
