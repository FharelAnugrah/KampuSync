import Link from "next/link";
import { Award, Calendar, CheckCircle2, ChevronRight, ClipboardCheck, Clock, FileText, QrCode, } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { query } from "@/lib/db/pool";
import { getActiveAcademicPeriod } from "@/modules/academic-master/master.repository";
import { getStudentAttendanceOverview } from "@/modules/attendance/attendance.service";
import { getStudentPublishedGrades } from "@/modules/grades/grades.service";
import { listPublishedAnnouncements } from "@/modules/portal/portal.service";
import { formatDayName, formatDateID, formatTimeRange } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard, StatusBadge } from "@/components/ui/feedback";
export default async function StudentDashboardPage() {
    const user = await requirePageUser(["STUDENT"]);
    const student = user.student;
    const activePeriod = await getActiveAcademicPeriod();
    const [krsRes, scheduleRes, attendance, grades, announcements] = await Promise.all([
        activePeriod
            ? query(`SELECT sp.status::text, COALESCE(SUM(spd.credits_snapshot), 0)::int AS total_credits
           FROM study_plans sp
           LEFT JOIN study_plan_details spd ON spd.study_plan_id = sp.id
           WHERE sp.student_id = $1 AND sp.academic_period_id = $2
           GROUP BY sp.id`, [student.id, activePeriod.id])
            : Promise.resolve({ rows: [] }),
        activePeriod
            ? query(`SELECT c.code AS course_code, c.name AS course_name, co.class_code,
                  sch.day_of_week, sch.start_time::text, sch.end_time::text, sch.room
           FROM study_plans sp
           JOIN study_plan_details spd ON spd.study_plan_id = sp.id
           JOIN class_offerings co ON co.id = spd.class_offering_id
           JOIN courses c ON c.id = co.course_id
           JOIN schedules sch ON sch.class_offering_id = co.id
           WHERE sp.student_id = $1 AND sp.academic_period_id = $2 AND sp.status = 'APPROVED'
           ORDER BY sch.day_of_week, sch.start_time
           LIMIT 5`, [student.id, activePeriod.id])
            : Promise.resolve({ rows: [] }),
        getStudentAttendanceOverview(student.id),
        getStudentPublishedGrades(student.id),
        listPublishedAnnouncements(),
    ]);
    const krs = krsRes.rows[0];
    const totalSessions = attendance.recaps.reduce((a, b) => a + b.total_sessions, 0);
    const totalPresent = attendance.recaps.reduce((a, b) => a + b.present_count, 0);
    const attendancePct = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 100;
    const publishedGrades = grades.filter((g) => g.published_letter_grade);
    return (<div className="space-y-6">
      <PageHeader title={`Halo, ${user.fullName}`} description={`NIM ${student.nim} • ${student.studyProgramName} • Dosen Wali: ${student.advisorName ?? "Belum ditetapkan"}`} actions={<>
            <Link href="/student/krs">
              <Button>
                <ClipboardCheck className="h-4 w-4"/>
                Isi / Cek KRS
              </Button>
            </Link>
            <Link href="/student/khs">
              <Button variant="outline">
                <FileText className="h-4 w-4"/>
                Buka KHS
              </Button>
            </Link>
          </>}/>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Semester Aktif" value={activePeriod?.name ?? "—"} subtitle={activePeriod ? `${activePeriod.academic_year}` : "Belum diatur"} icon={<Calendar className="h-5 w-5"/>}/>
        <StatCard title="Status KRS" value={krs ? `${krs.total_credits} SKS` : "Belum Mengisi"} subtitle={krs ? `Status: ${krs.status}` : "Silakan pilih mata kuliah"} icon={<CheckCircle2 className="h-5 w-5"/>}/>
        <StatCard title="Kehadiran Semester" value={`${attendancePct}%`} subtitle={`${totalPresent} dari ${totalSessions} sesi tercatat`} icon={<QrCode className="h-5 w-5"/>}/>
        <StatCard title="Nilai Diterbitkan" value={publishedGrades.length} subtitle={attendance.openQrSessions.length > 0 ? `${attendance.openQrSessions.length} sesi QR aktif!` : "Semua mata kuliah"} icon={<Award className="h-5 w-5"/>}/>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Jadwal Kuliah Terdekat</CardTitle>
            <Link href="/student/schedule" className="text-xs font-medium text-[#2457A6] hover:underline">
              Jadwal lengkap
            </Link>
          </CardHeader>
          <CardContent>
            {scheduleRes.rows.length === 0 ? (<p className="text-sm text-[#64748B]">
                Belum ada jadwal kuliah disetujui pada periode aktif.
              </p>) : (<ul className="divide-y divide-[#E2E8F0]">
                {scheduleRes.rows.map((s, idx) => (<li key={`${s.course_code}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-[#F8FAFC] -mx-2">
                    <div>
                      <p className="font-semibold text-[#172033]">
                        {s.course_code}-{s.class_code} • {s.course_name}
                      </p>
                      <p className="text-xs text-[#64748B]">{s.room}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#172033]">
                      <Clock className="h-3.5 w-3.5 text-[#2457A6]" aria-hidden="true"/>
                      {formatDayName(s.day_of_week)}, {formatTimeRange(s.start_time, s.end_time)}
                    </span>
                  </li>))}
              </ul>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Aksi Cepat</CardTitle>
            {krs ? <StatusBadge status={krs.status}/> : null}
          </CardHeader>
          <CardContent className="grid gap-2.5">
            <Link href="/student/attendance" className="group interactive-tile flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3 text-sm font-medium hover:border-[#2457A6]/40 hover:bg-[#F8FAFF] hover:shadow-xs">
              <span className="flex items-center gap-2.5">
                <QrCode className="h-4 w-4 text-[#2457A6]" aria-hidden="true"/>
                Presensi QR / Kode
              </span>
              <span className="flex items-center gap-1.5">
                {attendance.openQrSessions.length > 0 ? (<span className="rounded-full bg-[#16803D] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {attendance.openQrSessions.length} Aktif
                  </span>) : null}
                <ChevronRight className="h-4 w-4 text-[#64748B] transition-transform duration-150 motion-safe:group-hover:translate-x-0.5" aria-hidden="true"/>
              </span>
            </Link>
            <Link href="/student/schedule" className="group interactive-tile flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3 text-sm font-medium hover:border-[#2457A6]/40 hover:bg-[#F8FAFF] hover:shadow-xs">
              <span className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-[#2457A6]" aria-hidden="true"/>
                Jadwal Kuliah Mingguan
              </span>
              <ChevronRight className="h-4 w-4 text-[#64748B] transition-transform duration-150 motion-safe:group-hover:translate-x-0.5" aria-hidden="true"/>
            </Link>
            <Link href="/student/grades" className="group interactive-tile flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3 text-sm font-medium hover:border-[#2457A6]/40 hover:bg-[#F8FAFF] hover:shadow-xs">
              <span className="flex items-center gap-2.5">
                <Award className="h-4 w-4 text-[#2457A6]" aria-hidden="true"/>
                Lihat Nilai Terbaru
              </span>
              <ChevronRight className="h-4 w-4 text-[#64748B] transition-transform duration-150 motion-safe:group-hover:translate-x-0.5" aria-hidden="true"/>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Nilai Terbaru Diterbitkan</CardTitle>
            <Link href="/student/grades" className="text-xs font-medium text-[#2457A6] hover:underline">
              Semua nilai
            </Link>
          </CardHeader>
          <CardContent>
            {publishedGrades.length === 0 ? (<p className="text-sm text-[#64748B]">Belum ada nilai yang diterbitkan.</p>) : (<ul className="divide-y divide-[#E2E8F0]">
                {publishedGrades.slice(0, 4).map((g) => (<li key={g.class_offering_id} className="flex items-center justify-between rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-[#F8FAFC] -mx-2">
                    <div>
                      <p className="font-medium">{g.course_code} — {g.course_name}</p>
                      <p className="text-xs text-[#64748B]">{g.period_name}</p>
                    </div>
                    <span className="rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-sm font-bold text-[#2457A6]">
                      {g.published_letter_grade} ({g.published_final_score})
                    </span>
                  </li>))}
              </ul>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pengumuman Akademik</CardTitle>
            <Link href="/student/announcements" className="text-xs font-medium text-[#2457A6] hover:underline">
              Lihat semua
            </Link>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (<p className="text-sm text-[#64748B]">Tidak ada pengumuman terbaru.</p>) : (<ul className="divide-y divide-[#E2E8F0]">
                {announcements.slice(0, 3).map((a) => (<li key={a.id} className="rounded-lg px-2 py-2.5 transition-colors hover:bg-[#F8FAFC] -mx-2">
                    <p className="text-sm font-semibold text-[#172033]">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#64748B]">{a.content}</p>
                    <p className="mt-1 text-[11px] text-[#64748B]">{formatDateID(a.published_at)}</p>
                  </li>))}
              </ul>)}
          </CardContent>
        </Card>
      </div>
    </div>);
}
