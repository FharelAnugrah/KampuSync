import { requirePageUser } from "@/lib/auth/guards";
import { getAdvisorStudyPlanDetail } from "@/modules/study-plans/study-plan.service";
import { formatDateTimeID } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/feedback";
import { PerwalianDecisionClient } from "@/components/lecturer/perwalian-decision-client";
export default async function LecturerPerwalianDetailPage({ params, }) {
    const user = await requirePageUser(["LECTURER"]);
    const { id } = await params;
    const detail = await getAdvisorStudyPlanDetail(user.lecturer.id, id);
    const totalCredits = detail.items.reduce((a, b) => a + b.credits, 0);
    return (<div className="space-y-6">
      <PageHeader title={`Tinjau KRS — ${detail.plan.student_name}`} description={`NIM ${detail.plan.nim} • ${detail.plan.study_program_name} • ${detail.plan.period_name}`} breadcrumbs={[
            { label: "Beranda", href: "/lecturer" },
            { label: "Persetujuan KRS", href: "/lecturer/perwalian" },
            { label: detail.plan.nim },
        ]} actions={<StatusBadge status={detail.plan.status}/>}/>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Daftar Kelas Dipilih</CardTitle>
          <span className="text-sm font-bold text-[#2457A6]">{totalCredits} SKS</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Mata Kuliah</TableHead>
                <TableHead>SKS</TableHead>
                <TableHead>Dosen Pengampu</TableHead>
                <TableHead>Jadwal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.items.map((it) => (<TableRow key={it.class_offering_id}>
                  <TableCell className="font-semibold">{it.course_code}-{it.class_code}</TableCell>
                  <TableCell>{it.course_name}</TableCell>
                  <TableCell>{it.credits}</TableCell>
                  <TableCell>{it.lecturer_name}</TableCell>
                  <TableCell className="text-xs text-[#64748B]">{it.schedule_summary ?? "Belum dijadwalkan"}</TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PerwalianDecisionClient studyPlanId={detail.plan.id} status={detail.plan.status}/>

      {detail.histories.length > 0 ? (<Card>
          <CardHeader>
            <CardTitle>Riwayat Keputusan KRS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.histories.map((h) => (<div key={h.id} className="rounded-lg border border-[#E2E8F0] p-3 text-sm">
                <div className="flex items-center justify-between">
                  <StatusBadge status={h.decision}/>
                  <span className="text-xs text-[#64748B]">{formatDateTimeID(h.decided_at)}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-[#172033]">Oleh {h.lecturer_name}</p>
                {h.reason ? <p className="mt-1 text-sm text-[#475569]">{h.reason}</p> : null}
              </div>))}
          </CardContent>
        </Card>) : null}
    </div>);
}
