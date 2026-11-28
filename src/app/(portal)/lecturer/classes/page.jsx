import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guards";
import { getActiveAcademicPeriod } from "@/modules/academic-master/master.repository";
import { listClassOfferings } from "@/modules/classes/classes.service";
import { formatDayName, formatTimeRange } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "@/components/ui/feedback";
export default async function LecturerClassesPage() {
    const user = await requirePageUser(["LECTURER"]);
    const activePeriod = await getActiveAcademicPeriod();
    const classes = await listClassOfferings({
        academicPeriodId: activePeriod?.id,
        lecturerId: user.lecturer.id,
    });
    return (<div>
      <PageHeader title="Kelas Saya" description="Daftar kelas yang Anda ampu pada periode akademik aktif." breadcrumbs={[{ label: "Beranda", href: "/lecturer" }, { label: "Kelas Saya" }]}/>

      {classes.length === 0 ? (<EmptyState title="Belum ada kelas diampu" description="Anda belum ditugaskan mengampu kelas pada periode aktif."/>) : (<div className="grid gap-4 md:grid-cols-2">
          {classes.map((c) => (<Card key={c.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-[#64748B]">{c.study_program_name}</p>
                    <h3 className="text-base font-semibold text-[#172033]">
                      {c.course_code}-{c.class_code} • {c.course_name}
                    </h3>
                  </div>
                  <StatusBadge status={c.status}/>
                </div>
                <p className="text-xs text-[#475569]">
                  {c.credits} SKS • Peserta: {c.enrolled_count}/{c.capacity}
                </p>
                <p className="text-xs text-[#64748B]">
                  {c.schedules.length === 0
                    ? "Jadwal belum ditetapkan"
                    : c.schedules
                        .map((s) => `${formatDayName(s.dayOfWeek)} ${formatTimeRange(s.startTime, s.endTime)} (${s.room})`)
                        .join(" • ")}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/lecturer/attendance?classId=${c.id}`}>
                    <Button size="sm" variant="outline">Kelola Presensi</Button>
                  </Link>
                  <Link href={`/lecturer/grades?classId=${c.id}`}>
                    <Button size="sm">Kelola Nilai</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>))}
        </div>)}
    </div>);
}
