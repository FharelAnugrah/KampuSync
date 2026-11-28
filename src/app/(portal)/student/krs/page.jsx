import { requirePageUser } from "@/lib/auth/guards";
import { query } from "@/lib/db/pool";
import { getActiveAcademicPeriod } from "@/modules/academic-master/master.repository";
import { listClassOfferings } from "@/modules/classes/classes.service";
import { getStudentStudyPlanView } from "@/modules/study-plans/study-plan.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { KrsClient } from "@/components/student/krs-client";
export default async function StudentKrsPage() {
    const user = await requirePageUser(["STUDENT"]);
    const student = user.student;
    const activePeriod = await getActiveAcademicPeriod();
    if (!activePeriod) {
        return (<div>
        <PageHeader title="Kartu Rencana Studi (KRS)"/>
        <EmptyState title="Belum ada periode akademik aktif" description="Hubungi Admin Akademik untuk mengaktifkan periode perkuliahan."/>
      </div>);
    }
    const [view, offerings, prereqRows] = await Promise.all([
        getStudentStudyPlanView(student.id, activePeriod.id),
        listClassOfferings({ academicPeriodId: activePeriod.id }),
        query(`SELECT cp.course_id, cp.prerequisite_course_id, pc.code, pc.name, cp.minimum_grade
       FROM course_prerequisites cp
       JOIN courses pc ON pc.id = cp.prerequisite_course_id`),
    ]);
    const prereqsByCourse = new Map();
    for (const r of prereqRows.rows) {
        const arr = prereqsByCourse.get(r.course_id) ?? [];
        arr.push({
            prerequisiteCourseId: r.prerequisite_course_id,
            code: r.code,
            name: r.name,
            minimumGrade: r.minimum_grade,
        });
        prereqsByCourse.set(r.course_id, arr);
    }
    const enrichedOfferings = offerings
        .filter((o) => o.status === "ACTIVE")
        .map((o) => ({
        ...o,
        prerequisites: prereqsByCourse.get(o.course_id) ?? [],
    }));
    return (<div>
      <PageHeader title="Kartu Rencana Studi (KRS)" description="Pilih kelas yang ingin diambil pada semester aktif lalu ajukan ke Dosen Wali." breadcrumbs={[{ label: "Beranda", href: "/student" }, { label: "KRS" }]}/>
      <KrsClient period={{
            id: activePeriod.id,
            name: activePeriod.name,
            krs_start_at: activePeriod.krs_start_at,
            krs_end_at: activePeriod.krs_end_at,
        }} initialStatus={view.plan?.status ?? null} initialSelectedIds={view.selectedOfferingIds} maxCredits={view.maxCredits} previousIps={view.previousIps} passedCourseGrades={view.passedCourseGrades} offerings={enrichedOfferings} histories={view.histories}/>
    </div>);
}
