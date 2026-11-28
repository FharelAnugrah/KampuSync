import { requirePageUser } from "@/lib/auth/guards";
import { getActiveAcademicPeriod } from "@/modules/academic-master/master.repository";
import { listClassOfferings } from "@/modules/classes/classes.service";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleView } from "@/components/shared/schedule-view";
export default async function LecturerSchedulePage() {
    const user = await requirePageUser(["LECTURER"]);
    const activePeriod = await getActiveAcademicPeriod();
    const classes = await listClassOfferings({
        academicPeriodId: activePeriod?.id,
        lecturerId: user.lecturer.id,
    });
    const items = classes
        .flatMap((c) => c.schedules.map((s) => ({
        id: s.id,
        courseCode: c.course_code,
        courseName: c.course_name,
        classCode: c.class_code,
        credits: c.credits,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        partnerLabel: `${c.enrolled_count} peserta`,
    })))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    return (<div>
      <PageHeader title="Jadwal Mengajar" description="Jadwal pengajaran Anda pada periode akademik aktif." breadcrumbs={[{ label: "Beranda", href: "/lecturer" }, { label: "Jadwal Mengajar" }]}/>
      <ScheduleView items={items}/>
    </div>);
}
