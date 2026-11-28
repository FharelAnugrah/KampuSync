import { requirePageUser } from "@/lib/auth/guards";
import { query } from "@/lib/db/pool";
import { formatDateTimeID } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, StatusBadge } from "@/components/ui/feedback";
export default async function AdminKrsOverviewPage() {
    await requirePageUser(["ADMIN"]);
    const res = await query(`SELECT
       sp.id, st.nim, st.full_name AS student_name,
       prog.name AS program_name, adv.full_name AS advisor_name,
       ap.name AS period_name, sp.status::text,
       COALESCE(SUM(spd.credits_snapshot), 0)::int AS total_credits,
       sp.submitted_at::text, sp.approved_at::text
     FROM study_plans sp
     JOIN students st ON st.id = sp.student_id
     JOIN study_programs prog ON prog.id = st.study_program_id
     LEFT JOIN lecturers adv ON adv.id = st.advisor_lecturer_id
     JOIN academic_periods ap ON ap.id = sp.academic_period_id
     LEFT JOIN study_plan_details spd ON spd.study_plan_id = sp.id
     WHERE ap.is_active = true
     GROUP BY sp.id, st.nim, st.full_name, prog.name, adv.full_name, ap.name
     ORDER BY sp.updated_at DESC`);
    return (<div>
      <PageHeader title="Monitoring KRS Periode Aktif" description="Pantau status pengisian dan persetujuan KRS seluruh mahasiswa pada periode berjalan." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "KRS" }]}/>
      {res.rows.length === 0 ? (<EmptyState title="Belum ada KRS pada periode aktif" description="Mahasiswa belum menyimpan atau mengajukan KRS pada semester aktif saat ini."/>) : (<Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIM</TableHead>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Program Studi</TableHead>
                <TableHead>Dosen Wali</TableHead>
                <TableHead>Total SKS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Diajukan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {res.rows.map((r) => (<TableRow key={r.id}>
                  <TableCell className="font-semibold">{r.nim}</TableCell>
                  <TableCell>{r.student_name}</TableCell>
                  <TableCell>{r.program_name}</TableCell>
                  <TableCell>{r.advisor_name ?? "—"}</TableCell>
                  <TableCell>{r.total_credits} SKS</TableCell>
                  <TableCell><StatusBadge status={r.status}/></TableCell>
                  <TableCell className="text-xs text-[#64748B]">{formatDateTimeID(r.submitted_at)}</TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </Card>)}
    </div>);
}
