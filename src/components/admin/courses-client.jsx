"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/form-controls";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FeedbackAlert, StatusBadge } from "@/components/ui/feedback";
export function CoursesClient({ initialItems, programs, }) {
    const router = useRouter();
    const [search, setSearch] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [editTarget, setEditTarget] = React.useState(null);
    const [archiveTarget, setArchiveTarget] = React.useState(null);
    const [studyProgramId, setStudyProgramId] = React.useState(programs[0]?.id ?? "");
    const [code, setCode] = React.useState("");
    const [name, setName] = React.useState("");
    const [credits, setCredits] = React.useState("3");
    const [recommendedSemester, setRecommendedSemester] = React.useState("1");
    const [description, setDescription] = React.useState("");
    const [prerequisiteIds, setPrerequisiteIds] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return initialItems;
        return initialItems.filter((c) => c.code.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            c.study_program_name.toLowerCase().includes(q));
    }, [initialItems, search]);
    function togglePrereq(id) {
        setPrerequisiteIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    }
    async function handleSave(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            if (editTarget) {
                await apiFetch(`/api/admin/courses/${editTarget.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        name,
                        credits: Number(credits),
                        recommendedSemester: recommendedSemester ? Number(recommendedSemester) : null,
                        description: description || null,
                        prerequisiteIds,
                    }),
                });
                setFeedback({ type: "success", message: "Mata kuliah diperbarui." });
                setEditTarget(null);
            }
            else {
                await apiFetch("/api/admin/courses", {
                    method: "POST",
                    body: JSON.stringify({
                        studyProgramId,
                        code,
                        name,
                        credits: Number(credits),
                        recommendedSemester: recommendedSemester ? Number(recommendedSemester) : null,
                        description: description || null,
                        prerequisiteIds,
                    }),
                });
                setFeedback({ type: "success", message: "Mata kuliah ditambahkan." });
                setOpen(false);
            }
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    async function handleToggleStatus() {
        if (!archiveTarget)
            return;
        setLoading(true);
        try {
            const next = archiveTarget.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
            await apiFetch(`/api/admin/courses/${archiveTarget.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: next }),
            });
            setArchiveTarget(null);
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="space-y-4">
      {feedback ? <FeedbackAlert type={feedback.type} message={feedback.message}/> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]"/>
          <Input placeholder="Cari kode atau nama mata kuliah..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"/>
        </div>
        <Button onClick={() => {
            setEditTarget(null);
            setStudyProgramId(programs[0]?.id ?? "");
            setCode("");
            setName("");
            setCredits("3");
            setRecommendedSemester("1");
            setDescription("");
            setPrerequisiteIds([]);
            setOpen(true);
        }}>
          <Plus className="h-4 w-4"/>
          Tambah Mata Kuliah
        </Button>
      </div>

      {filtered.length === 0 ? (<EmptyState title="Belum ada mata kuliah" description="Tambahkan mata kuliah dan prasyaratnya."/>) : (<Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Mata Kuliah</TableHead>
                <TableHead>Prodi</TableHead>
                <TableHead>SKS</TableHead>
                <TableHead>Prasyarat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (<TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.code}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.recommended_semester ? (<p className="text-xs text-[#64748B]">Saran Semester {c.recommended_semester}</p>) : null}
                    </div>
                  </TableCell>
                  <TableCell>{c.study_program_name}</TableCell>
                  <TableCell>{c.credits} SKS</TableCell>
                  <TableCell>
                    {c.prerequisites.length === 0 ? (<span className="text-xs text-[#64748B]">Tidak ada</span>) : (<div className="flex flex-wrap gap-1">
                        {c.prerequisites.map((p) => (<Badge key={p.prerequisiteCourseId} variant="info">
                            {p.code}
                          </Badge>))}
                      </div>)}
                  </TableCell>
                  <TableCell><StatusBadge status={c.status}/></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => {
                    setEditTarget(c);
                    setStudyProgramId(c.study_program_id);
                    setCode(c.code);
                    setName(c.name);
                    setCredits(String(c.credits));
                    setRecommendedSemester(c.recommended_semester ? String(c.recommended_semester) : "");
                    setDescription(c.description ?? "");
                    setPrerequisiteIds(c.prerequisites.map((p) => p.prerequisiteCourseId));
                }}>
                      Ubah
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(c)}>
                      {c.status === "ACTIVE" ? "Arsipkan" : "Aktifkan"}
                    </Button>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </Card>)}

      <Modal open={open || Boolean(editTarget)} onClose={() => {
            setOpen(false);
            setEditTarget(null);
        }} title={editTarget ? `Ubah Mata Kuliah (${editTarget.code})` : "Tambah Mata Kuliah"}>
        <form onSubmit={handleSave} className="space-y-4">
          {!editTarget ? (<div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="crs-prodi" required>Program Studi</Label>
                <Select id="crs-prodi" value={studyProgramId} onChange={(e) => setStudyProgramId(e.target.value)}>
                  {programs.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="crs-code" required>Kode MK</Label>
                <Input id="crs-code" value={code} onChange={(e) => setCode(e.target.value)} required/>
              </div>
            </div>) : null}

          <div className="space-y-1.5">
            <Label htmlFor="crs-name" required>Nama Mata Kuliah</Label>
            <Input id="crs-name" value={name} onChange={(e) => setName(e.target.value)} required/>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="crs-sks" required>SKS</Label>
              <Input id="crs-sks" type="number" min={1} max={12} value={credits} onChange={(e) => setCredits(e.target.value)} required/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crs-sem">Rekomendasi Semester</Label>
              <Input id="crs-sem" type="number" min={1} max={14} value={recommendedSemester} onChange={(e) => setRecommendedSemester(e.target.value)}/>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crs-desc">Deskripsi</Label>
            <Textarea id="crs-desc" value={description} onChange={(e) => setDescription(e.target.value)}/>
          </div>

          <div className="space-y-1.5">
            <Label>Mata Kuliah Prasyarat</Label>
            <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-[#E2E8F0] p-2.5">
              {initialItems
            .filter((c) => c.id !== editTarget?.id)
            .map((c) => (<label key={c.id} className="flex items-center gap-2 text-xs text-[#172033] cursor-pointer">
                    <input type="checkbox" checked={prerequisiteIds.includes(c.id)} onChange={() => togglePrereq(c.id)} className="rounded border-[#CBD5E1]"/>
                    <span>{c.code} — {c.name}</span>
                  </label>))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); setEditTarget(null); }}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} onConfirm={handleToggleStatus} loading={loading} destructive={archiveTarget?.status === "ACTIVE"} title={archiveTarget?.status === "ACTIVE" ? "Arsipkan Mata Kuliah?" : "Aktifkan Mata Kuliah?"} description={`Riwayat kelas dan nilai untuk ${archiveTarget?.name} tetap terjaga. Lanjutkan?`}/>
    </div>);
}
