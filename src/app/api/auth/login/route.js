import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db/pool";
import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, signSessionToken, } from "@/lib/auth/session-token";
import { getHomePathForRole } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/http";
const loginSchema = z.object({
    identifier: z.string().trim().min(1, "Email atau NIM/NIDN wajib diisi."),
    password: z.string().min(1, "Kata sandi wajib diisi."),
});
export async function POST(request) {
    try {
        const body = await request.json();
        const { identifier, password } = loginSchema.parse(body);
        const res = await query(`SELECT u.id, u.email, u.password_hash, u.role, u.is_active
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN lecturers l ON l.user_id = u.id
       WHERE lower(u.email) = lower($1)
          OR s.nim = $1
          OR l.nidn = $1
       LIMIT 1`, [identifier]);
        const user = res.rows[0];
        // Uniform error message so registered accounts cannot be enumerated (designr.md 6.1)
        const invalidMessage = "Kredensial tidak valid. Periksa kembali email/NIM/NIDN dan kata sandi Anda.";
        if (!user || !verifyPassword(password, user.password_hash)) {
            return NextResponse.json({ ok: false, error: invalidMessage }, { status: 401 });
        }
        if (!user.is_active) {
            return NextResponse.json({ ok: false, error: "Akun Anda berstatus nonaktif. Hubungi Admin Akademik." }, { status: 403 });
        }
        await query("UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1", [
            user.id,
        ]);
        const token = await signSessionToken({ userId: user.id, role: user.role });
        const redirectTo = getHomePathForRole(user.role);
        const response = NextResponse.json({
            ok: true,
            data: { role: user.role, redirectTo },
        });
        response.cookies.set(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: SESSION_TTL_SECONDS,
        });
        return response;
    }
    catch (error) {
        return jsonError(error);
    }
}
