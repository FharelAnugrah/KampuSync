import { requirePageUser } from "@/lib/auth/guards";
import { listCourses, listStudyPrograms } from "@/modules/academic-master/master.repository";
import { PageHeader } from "@/components/layout/page-header";
import { CoursesClient } from "@/components/admin/courses-client";
export default async function AdminCoursesPage() {
    await requirePageUser(["ADMIN"]);
    const [items, programs] = await Promise.all([listCourses(), listStudyPrograms()]);
    return (<div>
      <PageHeader title="Mata Kuliah" description="Kelola daftar mata kuliah, SKS, dan relasi prasyarat." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Mata Kuliah" }]}/>
      <CoursesClient initialItems={items} programs={programs}/>
    </div>);
}
