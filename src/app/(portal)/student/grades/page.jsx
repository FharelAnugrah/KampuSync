import { requirePageUser } from "@/lib/auth/guards";
import { getStudentPublishedGrades } from "@/modules/grades/grades.service";
import { formatDateTimeID } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/feedback";
export default async function StudentGradesPage() {
    const user = await requirePageUser(["STUDENT"]);
    const rows = await getStudentPublishedGrades(user.student.id);
    return (<div>
      <PageHeader title="Nilai Mata Kuliah" description="Nilai akhir hanya ditampilkan setelah resmi diterbitkan oleh dosen pengampu." breadcrumbs={[{ label: "Beranda", href: "/student" }, { label: "Nilai" }]}/>

      {rows.length === 0 ? (<EmptyState title="Belum ada data mata kuliah" description="Daftar mata kuliah muncul setelah KRS disetujui."/>) : (<Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Mata Kuliah</TableHead>
                <TableHead>SKS</TableHead>
                <TableHead>Dosen Pengampu</TableHead>
                <TableHead>Nilai Angka</TableHead>
                <TableHead>Nilai Huruf</TableHead>
                <TableHead>Status Publikasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const published = r.publication_status === "PUBLISHED" || r.publication_status === "LOCKED";
                return (<TableRow key={`${r.period_name}-${r.class_offering_id}`}>
                    <TableCell className="text-xs text-[#64748B]">{r.period_name}</TableCell>
                    <TableCell className="font-medium">
                      {r.course_code}-{r.class_code} • {r.course_name}
                    </TableCell>
                    <TableCell>{r.credits}</TableCell>
                    <TableCell>{r.lecturer_name}</TableCell>
                    <TableCell className="font-semibold">
                      {published && r.published_final_score !== null ? r.published_final_score : "—"}
                    </TableCell>
                    <TableCell>
                      {published && r.published_letter_grade ? (<Badge variant="primary">{r.published_letter_grade}</Badge>) : (<span className="text-xs text-[#64748B]">Menunggu publikasi</span>)}
                    </TableCell>
                    <TableCell className="text-xs text-[#64748B]">
                      {published ? `Diterbitkan ${formatDateTimeID(r.published_at)}` : "Draft"}
                    </TableCell>
                  </TableRow>);
            })}
            </TableBody>
          </Table>
        </Card>)}
    </div>);
}
