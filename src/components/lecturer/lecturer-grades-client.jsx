"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock, Plus, Save, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FeedbackAlert, StatusBadge } from "@/components/ui/feedback";
export function LecturerGradesClient({ classes, selectedClassId, initialComponents, initialStudents, }) {
    const router = useRouter();
    const [components, setComponents] = React.useState(initialComponents.length > 0
        ? initialComponents.map((c) => ({ name: c.name, weight: String(c.weight) }))
        : [
            { name: "Tugas & Kuis", weight: "30" },
            { name: "UTS", weight: "35" },
            { name: "UAS", weight: "35" },
        ]);
    const [scoresByStudent, setScoresByStudent] = React.useState(() => {
        const map = {};
        for (const s of initialStudents) {
            map[s.studentId] = {};
            for (const comp of initialComponents) {
                map[s.studentId][comp.id] =
                    s.scores[comp.id] !== undefined ? String(s.scores[comp.id]) : "0";
            }
        }
        return map;
    });
    const [changeReason, setChangeReason] = React.useState("");
    const [publishConfirm, setPublishConfirm] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const totalWeight = components.reduce((acc, c) => acc + (Number(c.weight) || 0), 0);
    const hasPublished = initialStudents.some((s) => s.publicationStatus === "PUBLISHED");
    const isLocked = initialStudents.some((s) => s.publicationStatus === "LOCKED");
    async function handleSaveComponents(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch("/api/lecturer/grades/components", {
                method: "POST",
                body: JSON.stringify({
                    classOfferingId: selectedClassId,
                    components: components.map((c) => ({ name: c.name, weight: Number(c.weight) })),
                }),
            });
            setFeedback({ type: "success", message: "Komponen & bobot penilaian disimpan." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSaveScores() {
        setLoading(true);
        setFeedback(null);
        try {
            const entries = initialStudents.map((s) => ({
                studentId: s.studentId,
                scores: Object.fromEntries(initialComponents.map((c) => [c.id, Number(scoresByStudent[s.studentId]?.[c.id] ?? 0)])),
            }));
            await apiFetch("/api/lecturer/grades/scores", {
                method: "POST",
                body: JSON.stringify({
                    classOfferingId: selectedClassId,
                    reason: changeReason || undefined,
                    entries,
                }),
            });
            setChangeReason("");
            setFeedback({ type: "success", message: "Nilai mahasiswa dihitung dan disimpan." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    async function handlePublish(lock) {
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch("/api/lecturer/grades/publish", {
                method: "POST",
                body: JSON.stringify({ classOfferingId: selectedClassId, lock }),
            });
            setPublishConfirm(null);
            setFeedback({
                type: "success",
                message: lock ? "Nilai diterbitkan dan dikunci permanen." : "Nilai berhasil diterbitkan ke mahasiswa.",
            });
            router.refresh();
        }
        catch (err) {
            setPublishConfirm(null);
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    if (classes.length === 0) {
        return <EmptyState title="Belum ada kelas diampu" description="Anda belum ditugaskan mengampu kelas."/>;
    }
    return (<div className="space-y-6">
      {feedback ? <FeedbackAlert type={feedback.type} message={feedback.message}/> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="lec-grd-class">Kelas:</Label>
        <Select id="lec-grd-class" value={selectedClassId} onChange={(e) => router.push(`/lecturer/grades?classId=${e.target.value}`)} className="w-full sm:w-96">
          {classes.map((c) => (<option key={c.id} value={c.id}>
              {c.course_code}-{c.class_code} • {c.course_name}
            </option>))}
        </Select>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Komponen & Bobot Penilaian</CardTitle>
            <CardDescription>
              Total bobot harus tepat 100% sebelum nilai dapat diterbitkan.
            </CardDescription>
          </div>
          <span className={`text-sm font-bold ${Math.abs(totalWeight - 100) < 0.01 ? "text-[#16803D]" : "text-[#B7791F]"}`}>
            Total: {totalWeight.toFixed(0)}%
          </span>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveComponents} className="space-y-3">
            {components.map((comp, idx) => (<div key={idx} className="flex flex-wrap items-center gap-2">
                <Input placeholder="Nama komponen" value={comp.name} disabled={isLocked} onChange={(e) => setComponents((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} className="flex-1 min-w-[180px]" required/>
                <Input type="number" min={1} max={100} step="0.01" value={comp.weight} disabled={isLocked} onChange={(e) => setComponents((prev) => prev.map((item, i) => (i === idx ? { ...item, weight: e.target.value } : item)))} className="w-28" required/>
                <span className="text-xs text-[#64748B]">%</span>
                {components.length > 1 && !isLocked ? (<button type="button" onClick={() => setComponents((prev) => prev.filter((_, i) => i !== idx))} aria-label="Hapus komponen" className="rounded p-1.5 text-[#C53030] hover:bg-[#FEF2F2] cursor-pointer">
                    <Trash2 className="h-4 w-4"/>
                  </button>) : null}
              </div>))}
            {!isLocked ? (<div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setComponents((prev) => [...prev, { name: "", weight: "0" }])}>
                  <Plus className="h-4 w-4"/>
                  Tambah Komponen
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  Simpan Komponen
                </Button>
              </div>) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Input Nilai Mahasiswa ({initialStudents.length})</CardTitle>
            <CardDescription>
              Nilai akhir dan nilai huruf dihitung otomatis sesuai skala aktif.
            </CardDescription>
          </div>
          {!isLocked && initialComponents.length > 0 && initialStudents.length > 0 ? (<div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleSaveScores} disabled={loading}>
                <Save className="h-4 w-4"/>
                Simpan Draft Nilai
              </Button>
              <Button size="sm" onClick={() => setPublishConfirm("publish")} disabled={loading}>
                <CheckCircle2 className="h-4 w-4"/>
                Terbitkan Nilai
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setPublishConfirm("lock")} disabled={loading}>
                <Lock className="h-4 w-4"/>
                Terbitkan & Kunci
              </Button>
            </div>) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPublished && !isLocked ? (<div className="max-w-md space-y-1.5">
              <Label htmlFor="grade-reason">Alasan Perubahan (wajib jika mengubah nilai yang sudah diterbitkan)</Label>
              <Input id="grade-reason" placeholder="Contoh: Koreksi nilai UAS" value={changeReason} onChange={(e) => setChangeReason(e.target.value)}/>
            </div>) : null}

          {initialComponents.length === 0 ? (<p className="text-sm text-[#64748B]">Simpan komponen penilaian terlebih dahulu.</p>) : initialStudents.length === 0 ? (<p className="text-sm text-[#64748B]">Belum ada mahasiswa terdaftar pada kelas ini.</p>) : (<Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIM</TableHead>
                  <TableHead>Nama Mahasiswa</TableHead>
                  {initialComponents.map((c) => (<TableHead key={c.id}>
                      {c.name} ({c.weight}%)
                    </TableHead>))}
                  <TableHead>Pratinjau Akhir</TableHead>
                  <TableHead>Tersimpan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialStudents.map((s) => {
                const preview = initialComponents.reduce((acc, c) => {
                    const v = Number(scoresByStudent[s.studentId]?.[c.id] ?? 0);
                    return acc + (v * c.weight) / 100;
                }, 0);
                return (<TableRow key={s.studentId}>
                      <TableCell className="font-semibold">{s.nim}</TableCell>
                      <TableCell>{s.fullName}</TableCell>
                      {initialComponents.map((c) => (<TableCell key={c.id}>
                          <Input type="number" min={0} max={100} step="0.01" disabled={s.publicationStatus === "LOCKED"} value={scoresByStudent[s.studentId]?.[c.id] ?? "0"} onChange={(e) => setScoresByStudent((prev) => ({
                            ...prev,
                            [s.studentId]: {
                                ...(prev[s.studentId] ?? {}),
                                [c.id]: e.target.value,
                            },
                        }))} className="w-24"/>
                        </TableCell>))}
                      <TableCell className="font-semibold text-[#2457A6]">
                        {preview.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {s.finalScore !== null
                        ? `${s.finalScore.toFixed(2)} (${s.letterGrade ?? "—"})`
                        : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.publicationStatus}/>
                      </TableCell>
                    </TableRow>);
            })}
              </TableBody>
            </Table>)}
        </CardContent>
      </Card>

      <ConfirmDialog open={Boolean(publishConfirm)} onClose={() => setPublishConfirm(null)} onConfirm={() => handlePublish(publishConfirm === "lock")} loading={loading} title={publishConfirm === "lock" ? "Terbitkan & Kunci Nilai?" : "Terbitkan Nilai ke Mahasiswa?"} description={publishConfirm === "lock"
            ? "Nilai yang dikunci tidak dapat diubah lagi oleh dosen. Pastikan seluruh nilai sudah benar."
            : "Mahasiswa akan dapat melihat nilai akhir ini di menu Nilai dan KHS."} confirmLabel={publishConfirm === "lock" ? "Terbitkan & Kunci" : "Terbitkan"}/>
    </div>);
}
