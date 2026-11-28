import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guards";
import { listAdvisorStudyPlans } from "@/modules/study-plans/study-plan.service";
import { formatDateTimeID } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, StatusBadge } from "@/components/ui/feedback";
export default async function LecturerPerwalianPage({ searchParams, }) {
    const user = await requirePageUser(["LECTURER"]);
    const lecturer = user.lecturer;
    const params = await searchParams;
    const filter = params.status;
    const rows = await listAdvisorStudyPlans(lecturer.id, filter);
    return (<div className="space-y-4">
      <PageHeader title="Persetujuan KRS (Perwalian)" description="Tinjau, setujui, atau tolak KRS mahasiswa bimbingan pada periode akademik aktif." breadcrumbs={[{ label: "Beranda", href: "/lecturer" }, { label: "Persetujuan KRS" }]}/>

      <div className="flex flex-wrap gap-2">
        {[
            { label: "Semua", val: "" },
            { label: "Diajukan (SUBMITTED)", val: "SUBMITTED" },
            { label: "Disetujui", val: "APPROVED" },
            { label: "Ditolak", val: "REJECTED" },
        ].map((tab) => {
            const active = (filter ?? "") === tab.val;
            return (<Link key={tab.label} href={tab.val ? `/lecturer/perwalian?status=${tab.val}` : "/lecturer/perwalian"}>
              <Button size="sm" variant={active ? "default" : "outline"}>
                {tab.label}
              </Button>
            </Link>);
        })}
      </div>

      {rows.length === 0 ? (<EmptyState title="Tidak ada data perwalian" description="Belum ada mahasiswa bimbingan dengan filter status yang dipilih."/>) : (<Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIM</TableHead>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Program Studi</TableHead>
                <TableHead>SKS / Kelas</TableHead>
                <TableHead>Status KRS</TableHead>
                <TableHead>Waktu Ajuan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (<TableRow key={r.student_id}>
                  <TableCell className="font-semibold">{r.nim}</TableCell>
                  <TableCell>{r.student_name}</TableCell>
                  <TableCell>{r.study_program_name}</TableCell>
                  <TableCell>{r.total_credits} SKS ({r.class_count} kelas)</TableCell>
                  <TableCell>
                    {r.status ? <StatusBadge status={r.status}/> : <span className="text-xs text-[#64748B]">Belum isi</span>}
                  </TableCell>
                  <TableCell className="text-xs text-[#64748B]">{formatDateTimeID(r.submitted_at)}</TableCell>
                  <TableCell className="text-right">
                    {r.study_plan_id ? (<Link href={`/lecturer/perwalian/${r.study_plan_id}`}>
                        <Button size="sm" variant={r.status === "SUBMITTED" ? "default" : "outline"}>
                          {r.status === "SUBMITTED" ? "Tinjau KRS" : "Detail"}
                        </Button>
                      </Link>) : (<span className="text-xs text-[#64748B]">—</span>)}
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </Card>)}
    </div>);
}
