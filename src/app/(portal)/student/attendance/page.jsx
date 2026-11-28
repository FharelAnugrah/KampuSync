import { requirePageUser } from "@/lib/auth/guards";
import { getStudentAttendanceOverview } from "@/modules/attendance/attendance.service";
import { PageHeader } from "@/components/layout/page-header";
import { StudentAttendanceClient } from "@/components/student/student-attendance-client";
export default async function StudentAttendancePage() {
    const user = await requirePageUser(["STUDENT"]);
    const overview = await getStudentAttendanceOverview(user.student.id);
    return (<div>
      <PageHeader title="Presensi Kuliah" description="Catat kehadiran melalui QR/kode sesi aktif dan pantau rekap kehadiran per mata kuliah." breadcrumbs={[{ label: "Beranda", href: "/student" }, { label: "Presensi" }]}/>
      <StudentAttendanceClient openQrSessions={overview.openQrSessions} recaps={overview.recaps}/>
    </div>);
}
