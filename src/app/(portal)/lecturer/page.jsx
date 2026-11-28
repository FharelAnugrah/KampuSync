import Link from "next/link";
import { Award, ClipboardCheck, Clock, Layers, QrCode } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { query } from "@/lib/db/pool";
import { getActiveAcademicPeriod } from "@/modules/academic-master/master.repository";
import { listClassOfferings } from "@/modules/classes/classes.service";
import { listAdvisorStudyPlans } from "@/modules/study-plans/study-plan.service";
import { formatDayName, formatTimeRange } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard, StatusBadge } from "@/components/ui/feedback";
export default async function LecturerDashboardPage() {
    const user = await requirePageUser(["LECTURER"]);
    const lecturer = user.lecturer;
    const activePeriod = await getActiveAcademicPeriod();
    const [classes, adviseePlans, gradePendingRes] = await Promise.all([
        listClassOfferings({
            academicPeriodId: activePeriod?.id,
            lecturerId: lecturer.id,
        }),
        lecturer.adviseeCount > 0
            ? listAdvisorStudyPlans(lecturer.id, "SUBMITTED")
            : Promise.resolve([]),
        activePeriod
            ? query(`SELECT COUNT(DISTINCT co.id)::int AS unpublished_count
           FROM class_offerings co
           LEFT JOIN grades g ON g.class_offering_id = co.id AND g.publication_status IN ('PUBLISHED', 'LOCKED')
           WHERE co.lecturer_id = $1 AND co.academic_period_id = $2 AND g.id IS NULL`, [lecturer.id, activePeriod.id])
            : Promise.resolve({ rows: [{ unpublished_count: 0 }] }),
    ]);
    const totalStudents = classes.reduce((a, c) => a + c.enrolled_count, 0);
    const upcomingSlots = classes
        .flatMap((c) => c.schedules.map((s) => ({
        ...s,
        courseCode: c.course_code,
        courseName: c.course_name,
        classCode: c.class_code,
    })))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    return (<div className="space-y-6">
      <PageHeader title={`Selamat Datang, ${user.fullName}`} description={`${lecturer.nidn ? `NIDN ${lecturer.nidn} • ` : ""}${activePeriod ? `Periode ${activePeriod.name}` : ""}`} actions={<>
            <Link href="/lecturer/attendance">
              <Button>
                <QrCode className="h-4 w-4"/>
                Kelola Presensi
              </Button>
            </Link>
            <Link href="/lecturer/grades">
              <Button variant="outline">
                <Award className="h-4 w-4"/>
                Kelola Nilai
              </Button>
            </Link>
          </>}/>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Kelas Diampu" value={classes.length} subtitle={`${totalStudents} total mahasiswa terdaftar`} icon={<Layers className="h-5 w-5"/>}/>
        <StatCard title="KRS Menunggu Persetujuan" value={adviseePlans.length} subtitle={lecturer.adviseeCount > 0 ? `${lecturer.adviseeCount} mahasiswa bimbingan` : "Bukan dosen wali"} icon={<ClipboardCheck className="h-5 w-5"/>}/>
        <StatCard title="Nilai Belum Terbit" value={gradePendingRes.rows[0]?.unpublished_count ?? 0} subtitle="Kelas pada periode aktif" icon={<Award className="h-5 w-5"/>}/>
        <StatCard title="Slot Jadwal Mingguan" value={upcomingSlots.length} subtitle="Pertemuan terjadwal" icon={<Clock className="h-5 w-5"/>}/>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Jadwal Mengajar</CardTitle>
            <Link href="/lecturer/schedule" className="text-xs font-medium text-[#2457A6] hover:underline">
              Lihat kalender
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingSlots.length === 0 ? (<p className="text-sm text-[#64748B]">Belum ada jadwal mengajar pada periode aktif.</p>) : (<ul className="divide-y divide-[#E2E8F0]">
                {upcomingSlots.map((s) => (<li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-[#F8FAFC] -mx-2">
                    <div>
                      <p className="font-semibold text-[#172033]">
                        {s.courseCode}-{s.classCode} • {s.courseName}
                      </p>
                      <p className="text-xs text-[#64748B]">{s.room}</p>
                    </div>
                    <span className="rounded-lg bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#172033]">
                      {formatDayName(s.dayOfWeek)}, {formatTimeRange(s.startTime, s.endTime)}
                    </span>
                  </li>))}
              </ul>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Antrean Perwalian</CardTitle>
            {lecturer.adviseeCount > 0 ? (<Link href="/lecturer/perwalian" className="text-xs font-medium text-[#2457A6] hover:underline">
                Buka
              </Link>) : null}
          </CardHeader>
          <CardContent>
            {lecturer.adviseeCount === 0 ? (<p className="text-sm text-[#64748B]">Anda belum ditugaskan sebagai Dosen Wali.</p>) : adviseePlans.length === 0 ? (<p className="text-sm text-[#64748B]">Tidak ada KRS berstatus Diajukan saat ini.</p>) : (<ul className="divide-y divide-[#E2E8F0]">
                {adviseePlans.slice(0, 5).map((p) => (<li key={p.student_id}>
                    {p.study_plan_id ? (<Link href={`/lecturer/perwalian/${p.study_plan_id}`} className="flex items-center justify-between rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-[#F8FAFC] -mx-2">
                        <div>
                          <p className="font-medium text-[#172033]">{p.student_name}</p>
                          <p className="text-xs text-[#64748B]">NIM {p.nim} • {p.total_credits} SKS</p>
                        </div>
                        <StatusBadge status={p.status ?? "DRAFT"}/>
                      </Link>) : (<div className="flex items-center justify-between px-2 py-2.5 text-sm -mx-2">
                        <div>
                          <p className="font-medium text-[#172033]">{p.student_name}</p>
                          <p className="text-xs text-[#64748B]">NIM {p.nim} • {p.total_credits} SKS</p>
                        </div>
                        <StatusBadge status={p.status ?? "DRAFT"}/>
                      </div>)}
                  </li>))}
              </ul>)}
          </CardContent>
        </Card>
      </div>
    </div>);
}
