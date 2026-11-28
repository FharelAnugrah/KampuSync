import { requireApiUser } from "@/lib/auth/guards";
import { AppError, jsonError, jsonOk } from "@/lib/http";
import { activateAcademicPeriod, updateAcademicPeriodKrsWindow, } from "@/modules/academic-master/master.service";
export async function PATCH(req, context) {
    try {
        await requireApiUser(["ADMIN"]);
        const { id } = await context.params;
        const body = await req.json();
        if (body.action === "activate") {
            const updated = await activateAcademicPeriod(id);
            return jsonOk(updated);
        }
        if (body.action === "krs_window") {
            const updated = await updateAcademicPeriodKrsWindow(id, body);
            return jsonOk(updated);
        }
        throw new AppError("Aksi tidak dikenali.", 400);
    }
    catch (err) {
        return jsonError(err);
    }
}
