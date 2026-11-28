import { requirePageUser } from "@/lib/auth/guards";
import { getActiveAcademicPeriod } from "@/modules/academic-master/master.repository";
import { listClassOfferings } from "@/modules/classes/classes.service";
import { getClassEnrolledStudentsWithSession, listSessionsForClass, } from "@/modules/attendance/attendance.service";
import { getAcademicPolicies } from "@/modules/policies/policy.service";
import { PageHeader } from "@/components/layout/page-header";
import { LecturerAttendanceClient } from "@/components/lecturer/lecturer-attendance-client";
export default async function LecturerAttendancePage({ searchParams, }) {
    const user = await requirePageUser(["LECTURER"]);
    const params = await searchParams;
    const activePeriod = await getActiveAcademicPeriod();
    const [classes, policies] = await Promise.all([
        listClassOfferings({
            academicPeriodId: activePeriod?.id,
            lecturerId: user.lecturer.id,
        }),
        getAcademicPolicies(),
    ]);
    const selectedClassId = classes.find((c) => c.id === params.classId)?.id ?? classes[0]?.id ?? "";
    const sessions = selectedClassId ? await listSessionsForClass(selectedClassId) : [];
    const selectedSessionId = sessions.find((s) => s.id === params.sessionId)?.id ?? sessions[0]?.id ?? null;
    const students = selectedClassId
        ? await getClassEnrolledStudentsWithSession(selectedClassId, selectedSessionId ?? undefined)
        : [];
    return (<div>
      <PageHeader title="Presensi Perkuliahan" description="Buka sesi manual atau QR Code, tampilkan kode presensi, dan kelola rekap kehadiran mahasiswa." breadcrumbs={[{ label: "Beranda", href: "/lecturer" }, { label: "Presensi" }]}/>
      <LecturerAttendanceClient key={`${selectedClassId}-${selectedSessionId ?? "none"}-${sessions.length}`} classes={classes} selectedClassId={selectedClassId} sessions={sessions} selectedSessionId={selectedSessionId} students={students} defaultQrMinutes={policies.qr_attendance_ttl_minutes.minutes}/>
    </div>);
}
