import { requirePageUser } from "@/lib/auth/guards";
import { listAcademicPeriods, listCourses } from "@/modules/academic-master/master.repository";
import { listClassOfferings } from "@/modules/classes/classes.service";
import { listLecturers } from "@/modules/users/users.service";
import { PageHeader } from "@/components/layout/page-header";
import { ClassesClient } from "@/components/admin/classes-client";
export default async function AdminClassesPage() {
    await requirePageUser(["ADMIN"]);
    const [classes, courses, lecturers, periods] = await Promise.all([
        listClassOfferings({}),
        listCourses(),
        listLecturers("", "ACTIVE"),
        listAcademicPeriods(),
    ]);
    return (<div>
      <PageHeader title="Kelas Perkuliahan" description="Buka kelas mata kuliah per periode akademik dan tetapkan dosen pengampu." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Kelas Perkuliahan" }]}/>
      <ClassesClient initialItems={classes} courses={courses} lecturers={lecturers} periods={periods}/>
    </div>);
}
