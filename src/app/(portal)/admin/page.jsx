import Link from "next/link";
import { BookOpen, Calendar, ChevronRight, ClipboardCheck, GraduationCap, Layers, Users, } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { query } from "@/lib/db/pool";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, StatusBadge } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default async function AdminDashboardPage() {
    await requirePageUser(["ADMIN"]);
    const statsRes = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM students WHERE status = 'ACTIVE') AS active_students,
      (SELECT COUNT(*)::int FROM lecturers WHERE status = 'ACTIVE') AS active_lecturers,
      (SELECT COUNT(*)::int FROM study_programs WHERE status = 'ACTIVE') AS active_programs,
      (SELECT COUNT(*)::int FROM class_offerings co JOIN academic_periods ap ON ap.id = co.academic_period_id WHERE ap.is_active = true AND co.status = 'ACTIVE') AS active_classes,
      (SELECT COUNT(*)::int FROM study_plans sp JOIN academic_periods ap ON ap.id = sp.academic_period_id WHERE ap.is_active = true AND sp.status = 'SUBMITTED') AS submitted_krs,
      (SELECT COUNT(*)::int FROM study_plans sp JOIN academic_periods ap ON ap.id = sp.academic_period_id WHERE ap.is_active = true AND sp.status = 'APPROVED') AS approved_krs
  `);
    const stats = statsRes.rows[0];
    const periodRes = await query(`SELECT name, academic_year, term FROM academic_periods WHERE is_active = true LIMIT 1`);
    const activePeriod = periodRes.rows[0];
    const recentKrsRes = await query(`SELECT sp.id, st.nim, st.full_name, sp.status::text, sp.submitted_at::text
     FROM study_plans sp
     JOIN students st ON st.id = sp.student_id
     JOIN academic_periods ap ON ap.id = sp.academic_period_id AND ap.is_active = true
     ORDER BY sp.updated_at DESC
     LIMIT 6`);
    return (<div>
      <PageHeader title="Dashboard Admin Akademik" description={activePeriod
            ? `Periode Aktif: ${activePeriod.name} (${activePeriod.academic_year})`
            : "Belum ada periode akademik aktif."} actions={<>
            <Link href="/admin/students">
              <Button variant="outline">Kelola Mahasiswa</Button>
            </Link>
            <Link href="/admin/classes">
              <Button>Buka Kelas Perkuliahan</Button>
            </Link>
          </>}/>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Mahasiswa Aktif" value={stats?.active_students ?? 0} subtitle="Terdaftar aktif" icon={<GraduationCap className="h-5 w-5"/>}/>
        <StatCard title="Dosen Aktif" value={stats?.active_lecturers ?? 0} subtitle="Pengajar & Dosen Wali" icon={<Users className="h-5 w-5"/>}/>
        <StatCard title="Program Studi" value={stats?.active_programs ?? 0} subtitle="Prodi aktif" icon={<BookOpen className="h-5 w-5"/>}/>
        <StatCard title="Kelas Periode Aktif" value={stats?.active_classes ?? 0} subtitle={`${stats?.submitted_krs ?? 0} KRS menunggu persetujuan`} icon={<Layers className="h-5 w-5"/>}/>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Aktivitas KRS Terbaru</CardTitle>
            <Link href="/admin/krs" className="text-xs font-medium text-[#2457A6] hover:underline">
              Lihat semua
            </Link>
          </CardHeader>
          <CardContent>
            {recentKrsRes.rows.length === 0 ? (<p className="text-sm text-[#64748B]">Belum ada pengisian KRS pada periode aktif.</p>) : (<ul className="divide-y divide-[#E2E8F0]">
                {recentKrsRes.rows.map((item) => (<li key={item.id} className="flex items-center justify-between rounded-lg px-2 py-3 text-sm transition-colors hover:bg-[#F8FAFC] -mx-2">
                    <div>
                      <p className="font-medium text-[#172033]">{item.full_name}</p>
                      <p className="text-xs text-[#64748B]">NIM {item.nim}</p>
                    </div>
                    <StatusBadge status={item.status}/>
                  </li>))}
              </ul>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Akses Cepat Operasional</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            <Link href="/admin/periods" className="group interactive-tile flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3 text-sm font-medium hover:border-[#2457A6]/40 hover:bg-[#F8FAFF] hover:shadow-xs">
              <span className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-[#2457A6]" aria-hidden="true"/>
                Atur Periode & Jadwal KRS
              </span>
              <ChevronRight className="h-4 w-4 text-[#64748B] transition-transform duration-150 motion-safe:group-hover:translate-x-0.5" aria-hidden="true"/>
            </Link>
            <Link href="/admin/schedules" className="group interactive-tile flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3 text-sm font-medium hover:border-[#2457A6]/40 hover:bg-[#F8FAFF] hover:shadow-xs">
              <span className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-[#2457A6]" aria-hidden="true"/>
                Jadwal & Deteksi Bentrok
              </span>
              <ChevronRight className="h-4 w-4 text-[#64748B] transition-transform duration-150 motion-safe:group-hover:translate-x-0.5" aria-hidden="true"/>
            </Link>
            <Link href="/admin/reports" className="group interactive-tile flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3 text-sm font-medium hover:border-[#2457A6]/40 hover:bg-[#F8FAFF] hover:shadow-xs">
              <span className="flex items-center gap-3">
                <ClipboardCheck className="h-4 w-4 text-[#2457A6]" aria-hidden="true"/>
                Laporan & Ekspor CSV
              </span>
              <ChevronRight className="h-4 w-4 text-[#64748B] transition-transform duration-150 motion-safe:group-hover:translate-x-0.5" aria-hidden="true"/>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>);
}
