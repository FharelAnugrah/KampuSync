import { z } from "zod";
import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { getAcademicPolicies, updateAcademicPolicy, } from "@/modules/policies/policy.service";
const updateSchema = z.object({
    key: z.enum([
        "max_credits_per_semester",
        "grading_scale",
        "qr_attendance_ttl_minutes",
        "minimum_attendance_percentage",
        "allow_post_publish_grade_edit",
    ]),
    value: z.unknown(),
});
export async function GET() {
    try {
        await requireApiUser(["ADMIN"]);
        const policies = await getAcademicPolicies();
        return jsonOk(policies);
    }
    catch (err) {
        return jsonError(err);
    }
}
export async function PATCH(req) {
    try {
        const user = await requireApiUser(["ADMIN"]);
        const { key, value } = updateSchema.parse(await req.json());
        await updateAcademicPolicy(key, value, user.id);
        const updated = await getAcademicPolicies();
        return jsonOk(updated);
    }
    catch (err) {
        return jsonError(err);
    }
}
