import { requirePageUser } from "@/lib/auth/guards";
import { getActiveAcademicPeriod } from "@/modules/academic-master/master.repository";
import { listClassOfferings } from "@/modules/classes/classes.service";
import { getClassGradebook } from "@/modules/grades/grades.service";
import { PageHeader } from "@/components/layout/page-header";
import { LecturerGradesClient } from "@/components/lecturer/lecturer-grades-client";
export default async function LecturerGradesPage({ searchParams, }) {
    const user = await requirePageUser(["LECTURER"]);
    const params = await searchParams;
    const activePeriod = await getActiveAcademicPeriod();
    const classes = await listClassOfferings({
        academicPeriodId: activePeriod?.id,
        lecturerId: user.lecturer.id,
    });
    const selectedClassId = classes.find((c) => c.id === params.classId)?.id ?? classes[0]?.id ?? "";
    const gradebook = selectedClassId
        ? await getClassGradebook(user.lecturer.id, selectedClassId)
        : { components: [], students: [] };
    return (<div>
      <PageHeader title="Pengelolaan Nilai" description="Atur komponen dan bobot nilai, masukkan nilai mahasiswa, dan terbitkan nilai akhir." breadcrumbs={[{ label: "Beranda", href: "/lecturer" }, { label: "Pengelolaan Nilai" }]}/>
      <LecturerGradesClient key={`${selectedClassId}-${gradebook.components.map((c) => c.id).join(",")}`} classes={classes} selectedClassId={selectedClassId} initialComponents={gradebook.components} initialStudents={gradebook.students}/>
    </div>);
}
