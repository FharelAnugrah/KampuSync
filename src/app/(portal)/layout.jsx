import { requirePageUser } from "@/lib/auth/guards";
import { PortalShell } from "@/components/layout/portal-shell";
export default async function PortalLayout({ children, }) {
    const user = await requirePageUser();
    return <PortalShell user={user}>{children}</PortalShell>;
}
