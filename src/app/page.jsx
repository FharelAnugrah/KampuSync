import { redirect } from "next/navigation";
import { getCurrentUser, getHomePathForRole } from "@/lib/auth/current-user";
export default async function RootPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }
    redirect(getHomePathForRole(user.role));
}
