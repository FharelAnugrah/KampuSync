"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FeedbackAlert, StatusBadge } from "@/components/ui/feedback";
export function StudentsClient({ initialItems, programs, lecturers, }) {
    const router = useRouter();
    const [search, setSearch] = React.useState("");
    const [programFilter, setProgramFilter] = React.useState("");
    const [createOpen, setCreateOpen] = React.useState(false);
    const [editTarget, setEditTarget] = React.useState(null);
    const [archiveTarget, setArchiveTarget] = React.useState(null);
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("Kampusync123!");
    const [nim, setNim] = React.useState("");
    const [fullName, setFullName] = React.useState("");
    const [studyProgramId, setStudyProgramId] = React.useState(programs[0]?.id ?? "");
    const [advisorLecturerId, setAdvisorLecturerId] = React.useState("");
    const [entryYear, setEntryYear] = React.useState("2026");
    const [phone, setPhone] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        return initialItems.filter((s) => {
            if (programFilter && s.study_program_id !== programFilter)
                return false;
            if (!q)
                return true;
            return (s.nim.toLowerCase().includes(q) ||
                s.full_name.toLowerCase().includes(q) ||
                s.email.toLowerCase().includes(q));
        });
    }, [initialItems, search, programFilter]);
    async function handleSave(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            if (editTarget) {
                await apiFetch(`/api/admin/students/${editTarget.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        fullName,
                        studyProgramId,
                        advisorLecturerId: advisorLecturerId || null,
                        phone: phone || null,
                    }),
                });
                setFeedback({ type: "success", message: "Data mahasiswa diperbarui." });
                setEditTarget(null);
            }
            else {
                await apiFetch("/api/admin/students", {
                    method: "POST",
                    body: JSON.stringify({
                        email,
                        password,
                        nim,
                        fullName,
                        studyProgramId,
                        advisorLecturerId: advisorLecturerId || null,
                        entryYear: Number(entryYear),
                        phone: phone || null,
                    }),
                });
                setFeedback({ type: "success", message: "Akun & profil mahasiswa berhasil dibuat." });
                setCreateOpen(false);
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
            const nextStatus = archiveTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await apiFetch(`/api/admin/students/${archiveTarget.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: nextStatus }),
            });
            setFeedback({
                type: "success",
                message: `Status akun & profil ${archiveTarget.full_name} diubah menjadi ${nextStatus}.`,
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
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]"/>
            <Input placeholder="Cari NIM, nama, atau email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"/>
          </div>
          <Select aria-label="Filter program studi" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="w-full sm:w-56">
            <option value="">Semua Program Studi</option>
            {programs.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </Select>
        </div>

        <Button onClick={() => {
            setEditTarget(null);
            setEmail("");
            setPassword("Kampusync123!");
            setNim("");
            setFullName("");
            setStudyProgramId(programs[0]?.id ?? "");
            setAdvisorLecturerId("");
            setEntryYear("2026");
            setPhone("");
            setCreateOpen(true);
        }}>
          <Plus className="h-4 w-4"/>
          Registrasi Mahasiswa
        </Button>
      </div>

      {filtered.length === 0 ? (<EmptyState title="Mahasiswa tidak ditemukan" description="Sesuaikan kata kunci pencarian atau daftarkan mahasiswa baru."/>) : (<Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIM</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Program Studi</TableHead>
                <TableHead>Dosen Wali</TableHead>
                <TableHead>Angkatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (<TableRow key={s.id}>
                  <TableCell className="font-semibold">{s.nim}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{s.full_name}</p>
                      <p className="text-xs text-[#64748B]">{s.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{s.study_program_name}</TableCell>
                  <TableCell>{s.advisor_name ?? <span className="text-[#64748B]">Belum ditetapkan</span>}</TableCell>
                  <TableCell>{s.entry_year}</TableCell>
                  <TableCell><StatusBadge status={s.status}/></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => {
                    setEditTarget(s);
                    setFullName(s.full_name);
                    setStudyProgramId(s.study_program_id);
                    setAdvisorLecturerId(s.advisor_lecturer_id ?? "");
                    setPhone(s.phone ?? "");
                }}>
                      Ubah
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(s)}>
                      {s.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </Card>)}

      <Modal open={createOpen || Boolean(editTarget)} onClose={() => {
            setCreateOpen(false);
            setEditTarget(null);
        }} title={editTarget ? `Ubah Mahasiswa (${editTarget.nim})` : "Registrasi Mahasiswa Baru"}>
        <form onSubmit={handleSave} className="space-y-4">
          {!editTarget ? (<>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="stu-nim" required>NIM</Label>
                  <Input id="stu-nim" value={nim} onChange={(e) => setNim(e.target.value)} required/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stu-year" required>Tahun Masuk</Label>
                  <Input id="stu-year" type="number" value={entryYear} onChange={(e) => setEntryYear(e.target.value)} required/>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="stu-email" required>Email</Label>
                  <Input id="stu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stu-pw" required>Password Awal</Label>
                  <Input id="stu-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
                </div>
              </div>
            </>) : null}

          <div className="space-y-1.5">
            <Label htmlFor="stu-name" required>Nama Lengkap</Label>
            <Input id="stu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required/>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stu-prodi" required>Program Studi</Label>
              <Select id="stu-prodi" value={studyProgramId} onChange={(e) => setStudyProgramId(e.target.value)}>
                {programs.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stu-adv">Dosen Wali</Label>
              <Select id="stu-adv" value={advisorLecturerId} onChange={(e) => setAdvisorLecturerId(e.target.value)}>
                <option value="">— Belum ditentukan —</option>
                {lecturers.map((l) => (<option key={l.id} value={l.id}>{l.full_name}</option>))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stu-phone">Nomor Telepon</Label>
            <Input id="stu-phone" value={phone} onChange={(e) => setPhone(e.target.value)}/>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditTarget(null); }}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} onConfirm={handleToggleStatus} loading={loading} destructive={archiveTarget?.status === "ACTIVE"} title={archiveTarget?.status === "ACTIVE" ? "Nonaktifkan Mahasiswa?" : "Aktifkan Mahasiswa?"} description={`Riwayat KRS, presensi, dan nilai ${archiveTarget?.full_name} tetap disimpan. Lanjutkan?`}/>
    </div>);
}
