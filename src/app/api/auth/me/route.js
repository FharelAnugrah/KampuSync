import { getCurrentUser } from "@/lib/auth/current-user";
import { jsonOk } from "@/lib/http";
import { NextResponse } from "next/server";
export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return jsonOk(user);
}
