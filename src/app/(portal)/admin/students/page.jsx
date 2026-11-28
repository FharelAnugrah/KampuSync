import { requirePageUser } from "@/lib/auth/guards";
import { listStudyPrograms } from "@/modules/academic-master/master.repository";
import { listLecturers, listStudents } from "@/modules/users/users.service";
import { PageHeader } from "@/components/layout/page-header";
import { StudentsClient } from "@/components/admin/students-client";
export default async function AdminStudentsPage() {
    await requirePageUser(["ADMIN"]);
    const [studentsPage, programs, lecturers] = await Promise.all([
        listStudents({ page: 1, pageSize: 100 }),
        listStudyPrograms(),
        listLecturers("", "ACTIVE"),
    ]);
    return (<div>
      <PageHeader title="Mahasiswa" description="Registrasi mahasiswa, penugasan dosen wali, dan manajemen akun." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Mahasiswa" }]}/>
      <StudentsClient initialItems={studentsPage.items} programs={programs} lecturers={lecturers}/>
    </div>);
}
