import { requirePageUser } from "@/lib/auth/guards";
import { listAcademicPeriods } from "@/modules/academic-master/master.repository";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodsClient } from "@/components/admin/periods-client";
export default async function AdminPeriodsPage() {
    await requirePageUser(["ADMIN"]);
    const items = await listAcademicPeriods();
    return (<div>
      <PageHeader title="Periode Akademik" description="Kelola semester akademik aktif dan jendela waktu pengisian KRS." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Periode Akademik" }]}/>
      <PeriodsClient initialItems={items}/>
    </div>);
}
