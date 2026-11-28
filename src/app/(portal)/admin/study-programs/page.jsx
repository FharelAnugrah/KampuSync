import { requirePageUser } from "@/lib/auth/guards";
import { listFaculties, listStudyPrograms } from "@/modules/academic-master/master.repository";
import { PageHeader } from "@/components/layout/page-header";
import { StudyProgramsClient } from "@/components/admin/study-programs-client";
export default async function AdminStudyProgramsPage() {
    await requirePageUser(["ADMIN"]);
    const [items, faculties] = await Promise.all([listStudyPrograms(), listFaculties("", "ACTIVE")]);
    return (<div>
      <PageHeader title="Program Studi" description="Kelola program studi dan fakultas induknya." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Program Studi" }]}/>
      <StudyProgramsClient initialItems={items} faculties={faculties}/>
    </div>);
}
