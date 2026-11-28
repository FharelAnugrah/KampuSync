import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-token";
const PUBLIC_PATHS = ["/login"];
export async function middleware(request) {
    const { pathname } = request.nextUrl;
    if (pathname.startsWith("/_next") ||
        pathname.startsWith("/api/auth") ||
        pathname === "/favicon.ico" ||
        pathname.endsWith(".svg") ||
        pathname.endsWith(".png")) {
        return NextResponse.next();
    }
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (!session && !isPublic && !pathname.startsWith("/api/")) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }
    if (session && pathname === "/login") {
        const target = session.role === "ADMIN"
            ? "/admin"
            : session.role === "LECTURER"
                ? "/lecturer"
                : "/student";
        return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
}
export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
