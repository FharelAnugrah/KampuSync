import { requirePageUser } from "@/lib/auth/guards";
import { listLecturers } from "@/modules/users/users.service";
import { PageHeader } from "@/components/layout/page-header";
import { LecturersClient } from "@/components/admin/lecturers-client";
export default async function AdminLecturersPage() {
    await requirePageUser(["ADMIN"]);
    const items = await listLecturers();
    return (<div>
      <PageHeader title="Dosen" description="Kelola profil dosen pengampu dan calon dosen wali." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Dosen" }]}/>
      <LecturersClient initialItems={items}/>
    </div>);
}
