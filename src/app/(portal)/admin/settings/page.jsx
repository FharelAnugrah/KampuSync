import { requirePageUser } from "@/lib/auth/guards";
import { getAcademicPolicies } from "@/modules/policies/policy.service";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsClient } from "@/components/admin/settings-client";
export default async function AdminSettingsPage() {
    await requirePageUser(["ADMIN"]);
    const policies = await getAcademicPolicies();
    return (<div>
      <PageHeader title="Pengaturan Kebijakan Akademik" description="Konfigurasi batas SKS, durasi QR presensi, dan aturan perubahan nilai." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Pengaturan" }]}/>
      <SettingsClient initialPolicies={policies}/>
    </div>);
}
