import { requirePageUser } from "@/lib/auth/guards";
import { listFaculties } from "@/modules/academic-master/master.repository";
import { PageHeader } from "@/components/layout/page-header";
import { FacultiesClient } from "@/components/admin/faculties-client";
export default async function AdminFacultiesPage() {
    await requirePageUser(["ADMIN"]);
    const items = await listFaculties();
    return (<div>
      <PageHeader title="Fakultas" description="Kelola data master fakultas universitas." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Fakultas" }]}/>
      <FacultiesClient initialItems={items}/>
    </div>);
}
