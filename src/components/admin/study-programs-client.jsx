"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { Modal, ConfirmDialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FeedbackAlert, StatusBadge } from "@/components/ui/feedback";
export function StudyProgramsClient({ initialItems, faculties, }) {
    const router = useRouter();
    const [search, setSearch] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [editTarget, setEditTarget] = React.useState(null);
    const [archiveTarget, setArchiveTarget] = React.useState(null);
    const [facultyId, setFacultyId] = React.useState(faculties[0]?.id ?? "");
    const [code, setCode] = React.useState("");
    const [name, setName] = React.useState("");
    const [degreeLevel, setDegreeLevel] = React.useState("S1");
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return initialItems;
        return initialItems.filter((p) => p.code.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.faculty_name.toLowerCase().includes(q));
    }, [initialItems, search]);
    async function handleSave(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            if (editTarget) {
                await apiFetch(`/api/admin/study-programs/${editTarget.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ facultyId, code, name, degreeLevel }),
                });
                setFeedback({ type: "success", message: "Program studi diperbarui." });
                setEditTarget(null);
            }
            else {
                await apiFetch("/api/admin/study-programs", {
                    method: "POST",
                    body: JSON.stringify({ facultyId, code, name, degreeLevel }),
                });
                setFeedback({ type: "success", message: "Program studi ditambahkan." });
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
            await apiFetch(`/api/admin/study-programs/${archiveTarget.id}`, {
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
          <Input placeholder="Cari prodi atau fakultas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"/>
        </div>
        <Button onClick={() => {
            setEditTarget(null);
            setFacultyId(faculties[0]?.id ?? "");
            setCode("");
            setName("");
            setDegreeLevel("S1");
            setOpen(true);
        }}>
          <Plus className="h-4 w-4"/>
          Tambah Program Studi
        </Button>
      </div>

      {filtered.length === 0 ? (<EmptyState title="Belum ada program studi" description="Tambahkan program studi untuk menghubungkan mahasiswa dan mata kuliah."/>) : (<Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Program Studi</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Fakultas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (<TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.code}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.degree_level}</TableCell>
                  <TableCell>{p.faculty_name}</TableCell>
                  <TableCell><StatusBadge status={p.status}/></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => {
                    setEditTarget(p);
                    setFacultyId(p.faculty_id);
                    setCode(p.code);
                    setName(p.name);
                    setDegreeLevel(p.degree_level);
                }}>
                      Ubah
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(p)}>
                      {p.status === "ACTIVE" ? "Arsipkan" : "Aktifkan"}
                    </Button>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </Card>)}

      <Modal open={open || Boolean(editTarget)} onClose={() => {
            setOpen(false);
            setEditTarget(null);
        }} title={editTarget ? "Ubah Program Studi" : "Tambah Program Studi"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sp-fac" required>Fakultas</Label>
            <Select id="sp-fac" value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
              {faculties.map((f) => (<option key={f.id} value={f.id}>{f.code} — {f.name}</option>))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-code" required>Kode Prodi</Label>
              <Input id="sp-code" value={code} onChange={(e) => setCode(e.target.value)} required/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-deg" required>Jenjang</Label>
              <Select id="sp-deg" value={degreeLevel} onChange={(e) => setDegreeLevel(e.target.value)}>
                {["D3", "D4", "S1", "S2", "S3", "PROFESSION"].map((d) => (<option key={d} value={d}>{d}</option>))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-name" required>Nama Program Studi</Label>
            <Input id="sp-name" value={name} onChange={(e) => setName(e.target.value)} required/>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); setEditTarget(null); }}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} onConfirm={handleToggleStatus} loading={loading} destructive={archiveTarget?.status === "ACTIVE"} title={archiveTarget?.status === "ACTIVE" ? "Arsipkan Program Studi?" : "Aktifkan Program Studi?"} description={`Riwayat akademik mahasiswa tetap terjaga. Lanjutkan perubahan status "${archiveTarget?.name}"?`}/>
    </div>);
}
