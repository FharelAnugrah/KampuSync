import Link from "next/link";
import { Download } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { getAdminReportsSummary } from "@/modules/reports/reports.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/feedback";
export default async function AdminReportsPage() {
    await requirePageUser(["ADMIN"]);
    const summary = await getAdminReportsSummary();
    return (<div className="space-y-6">
      <PageHeader title="Laporan Akademik" description="Ringkasan statistik mahasiswa per program studi, status KRS, dan rekap presensi kelas." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Laporan" }]} actions={<Link href="/api/admin/reports/export">
            <Button>
              <Download className="h-4 w-4"/>
              Ekspor CSV
            </Button>
          </Link>}/>

      <Card>
        <CardHeader>
          <CardTitle>Statistik Program Studi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fakultas</TableHead>
                <TableHead>Program Studi</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Mahasiswa Aktif</TableHead>
                <TableHead>Mahasiswa Nonaktif</TableHead>
                <TableHead>Mata Kuliah Aktif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.programStats.map((p) => (<TableRow key={p.study_program_id}>
                  <TableCell>{p.faculty_name}</TableCell>
                  <TableCell className="font-medium">{p.program_code} — {p.program_name}</TableCell>
                  <TableCell>{p.degree_level}</TableCell>
                  <TableCell className="font-semibold">{p.active_students}</TableCell>
                  <TableCell>{p.inactive_students}</TableCell>
                  <TableCell>{p.active_courses}</TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Rekap Status KRS Periode Aktif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {summary.krsSummary.length === 0 ? (<p className="text-sm text-[#64748B]">Belum ada data KRS pada periode aktif.</p>) : (summary.krsSummary.map((row) => (<div key={row.status} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] px-3 py-2.5">
                  <StatusBadge status={row.status}/>
                  <span className="text-sm font-bold text-[#172033]">{row.total} mahasiswa</span>
                </div>)))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rekap Presensi Kelas Periode Aktif</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Sesi</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead>Izin</TableHead>
                  <TableHead>Sakit</TableHead>
                  <TableHead>Alpa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.attendanceSummary.map((a) => (<TableRow key={a.class_offering_id}>
                    <TableCell className="font-medium">
                      {a.course_code}-{a.class_code} ({a.course_name})
                    </TableCell>
                    <TableCell>{a.total_sessions}</TableCell>
                    <TableCell className="text-[#16803D] font-semibold">{a.present_count}</TableCell>
                    <TableCell>{a.excused_count}</TableCell>
                    <TableCell>{a.sick_count}</TableCell>
                    <TableCell className="text-[#C53030]">{a.absent_count}</TableCell>
                  </TableRow>))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>);
}
