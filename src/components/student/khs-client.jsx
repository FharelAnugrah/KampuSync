"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/form-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FeedbackAlert, StatCard } from "@/components/ui/feedback";
export function KhsClient({ studentName, nim, studyProgramName, periods, selectedPeriodId, items, totalCredits, publishedCredits, ips, ipk, hasUnpublishedGrades, }) {
    const router = useRouter();
    return (<div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="khs-period" className="text-sm font-medium text-[#172033]">
            Periode Akademik:
          </label>
          <Select id="khs-period" value={selectedPeriodId} onChange={(e) => router.push(`/student/khs?periodId=${e.target.value}`)} className="w-56">
            {periods.map((p) => (<option key={p.id} value={p.id}>
                {p.name}
              </option>))}
          </Select>
        </div>

        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4"/>
          Cetak / Unduh PDF
        </Button>
      </div>

      {/* Print header */}
      <div className="hidden print-only border-b border-[#CBD5E1] pb-4 mb-4">
        <h2 className="text-lg font-bold">KARTU HASIL STUDI (KHS) — KAMPUSYNC</h2>
        <p className="text-sm">
          {studentName} • NIM {nim} • {studyProgramName}
        </p>
      </div>

      {hasUnpublishedGrades ? (<FeedbackAlert type="info" message="Sebagian mata kuliah belum memiliki nilai yang diterbitkan. Nilai yang belum diterbitkan tidak dihitung sebagai nilai final pada IPS sementara."/>) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="IPS Periode" value={ips.toFixed(2)} subtitle={`Dari ${publishedCredits} SKS bernilai`}/>
        <StatCard title="IPK Kumulatif" value={ipk.toFixed(2)} subtitle="Seluruh periode diterbitkan"/>
        <StatCard title="Total SKS Diambil" value={`${totalCredits} SKS`} subtitle="Sesuai KRS disetujui"/>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Hasil Studi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Mata Kuliah</TableHead>
                <TableHead>SKS</TableHead>
                <TableHead>Nilai Angka</TableHead>
                <TableHead>Nilai Huruf</TableHead>
                <TableHead>Mutu</TableHead>
                <TableHead>SKS × Mutu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (<TableRow key={`${it.courseCode}-${it.classCode}`}>
                  <TableCell className="font-semibold">{it.courseCode}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{it.courseName} (Kelas {it.classCode})</p>
                      <p className="text-xs text-[#64748B]">{it.lecturerName}</p>
                    </div>
                  </TableCell>
                  <TableCell>{it.credits}</TableCell>
                  <TableCell>{it.isPublished && it.finalScore !== null ? it.finalScore.toFixed(2) : "—"}</TableCell>
                  <TableCell>
                    {it.isPublished && it.letterGrade ? (<Badge variant="primary">{it.letterGrade}</Badge>) : (<span className="text-xs text-[#64748B]">Belum terbit</span>)}
                  </TableCell>
                  <TableCell>{it.gradePoint !== null ? it.gradePoint.toFixed(2) : "—"}</TableCell>
                  <TableCell className="font-semibold">
                    {it.qualityPoints !== null ? it.qualityPoints.toFixed(2) : "—"}
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);
}
