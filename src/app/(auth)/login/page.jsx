import { redirect } from "next/navigation";
import { getCurrentUser, getHomePathForRole } from "@/lib/auth/current-user";
import { LoginForm } from "@/components/auth/login-form";
export const metadata = {
    title: "Masuk",
};
export default async function LoginPage() {
    const user = await getCurrentUser();
    if (user) {
        redirect(getHomePathForRole(user.role));
    }
    return (<main className="flex min-h-screen flex-col items-center justify-center bg-[#F6F8FB] px-4 py-10">
      <LoginForm />
      <p className="mt-6 text-center text-xs text-[#64748B]">
        Kampusync Academic Portal &copy; {new Date().getFullYear()}
      </p>
    </main>);
}
