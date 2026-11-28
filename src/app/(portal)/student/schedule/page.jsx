import { requirePageUser } from "@/lib/auth/guards";
import { query } from "@/lib/db/pool";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleView } from "@/components/shared/schedule-view";
export default async function StudentSchedulePage() {
    const user = await requirePageUser(["STUDENT"]);
    const student = user.student;
    const res = await query(`SELECT
       sch.id, c.code AS course_code, c.name AS course_name,
       co.class_code, spd.credits_snapshot AS credits,
       sch.day_of_week, sch.start_time::text, sch.end_time::text, sch.room,
       l.full_name AS lecturer_name
     FROM study_plans sp
     JOIN academic_periods ap ON ap.id = sp.academic_period_id AND ap.is_active = true
     JOIN study_plan_details spd ON spd.study_plan_id = sp.id
     JOIN class_offerings co ON co.id = spd.class_offering_id
     JOIN courses c ON c.id = co.course_id
     JOIN lecturers l ON l.id = co.lecturer_id
     JOIN schedules sch ON sch.class_offering_id = co.id
     WHERE sp.student_id = $1 AND sp.status = 'APPROVED'
     ORDER BY sch.day_of_week, sch.start_time`, [student.id]);
    return (<div>
      <PageHeader title="Jadwal Kuliah" description="Jadwal perkuliahan Anda berdasarkan KRS yang telah disetujui pada periode aktif." breadcrumbs={[{ label: "Beranda", href: "/student" }, { label: "Jadwal Kuliah" }]}/>
      <ScheduleView items={res.rows.map((r) => ({
            id: r.id,
            courseCode: r.course_code,
            courseName: r.course_name,
            classCode: r.class_code,
            credits: r.credits,
            dayOfWeek: r.day_of_week,
            startTime: r.start_time,
            endTime: r.end_time,
            room: r.room,
            partnerLabel: r.lecturer_name,
        }))}/>
    </div>);
}
