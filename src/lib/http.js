import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = "BAD_REQUEST") {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
    }
}
export function jsonOk(data, status = 200) {
    return NextResponse.json({ ok: true, data }, { status });
}
export function jsonError(error) {
    if (error instanceof AppError) {
        return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof ZodError) {
        const first = error.issues[0];
        return NextResponse.json({
            ok: false,
            error: first?.message ?? "Input tidak valid.",
            code: "VALIDATION_ERROR",
            issues: error.issues.map((i) => ({
                path: i.path.join("."),
                message: i.message,
            })),
        }, { status: 400 });
    }
    console.error("Unhandled API error:", error);
    return NextResponse.json({ ok: false, error: "Terjadi kesalahan internal server.", code: "INTERNAL_ERROR" }, { status: 500 });
}
