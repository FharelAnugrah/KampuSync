"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form-controls";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FeedbackAlert, StatusBadge } from "@/components/ui/feedback";
export function LecturersClient({ initialItems }) {
    const router = useRouter();
    const [search, setSearch] = React.useState("");
    const [createOpen, setCreateOpen] = React.useState(false);
    const [editTarget, setEditTarget] = React.useState(null);
    const [archiveTarget, setArchiveTarget] = React.useState(null);
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("Kampusync123!");
    const [nidn, setNidn] = React.useState("");
    const [fullName, setFullName] = React.useState("");
    const [phone, setPhone] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return initialItems;
        return initialItems.filter((l) => (l.nidn ?? "").toLowerCase().includes(q) ||
            l.full_name.toLowerCase().includes(q) ||
            l.email.toLowerCase().includes(q));
    }, [initialItems, search]);
    async function handleSave(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            if (editTarget) {
                await apiFetch(`/api/admin/lecturers/${editTarget.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ nidn: nidn || null, fullName, phone: phone || null }),
                });
                setFeedback({ type: "success", message: "Data dosen diperbarui." });
                setEditTarget(null);
            }
            else {
                await apiFetch("/api/admin/lecturers", {
                    method: "POST",
                    body: JSON.stringify({ email, password, nidn: nidn || null, fullName, phone: phone || null }),
                });
                setFeedback({ type: "success", message: "Akun & profil dosen dibuat." });
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
            const next = archiveTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await apiFetch(`/api/admin/lecturers/${archiveTarget.id}`, {
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
          <Input placeholder="Cari NIDN, nama, atau email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"/>
        </div>
        <Button onClick={() => {
            setEditTarget(null);
            setEmail("");
            setPassword("Kampusync123!");
            setNidn("");
            setFullName("");
            setPhone("");
            setCreateOpen(true);
        }}>
          <Plus className="h-4 w-4"/>
          Tambah Dosen
        </Button>
      </div>

      {filtered.length === 0 ? (<EmptyState title="Belum ada data dosen" description="Tambahkan dosen untuk pengampuan kelas dan perwalian."/>) : (<Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIDN</TableHead>
                <TableHead>Nama Dosen</TableHead>
                <TableHead>Mahasiswa Bimbingan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (<TableRow key={l.id}>
                  <TableCell className="font-semibold">{l.nidn ?? "—"}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{l.full_name}</p>
                      <p className="text-xs text-[#64748B]">{l.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{l.advisee_count} mahasiswa</TableCell>
                  <TableCell><StatusBadge status={l.status}/></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => {
                    setEditTarget(l);
                    setNidn(l.nidn ?? "");
                    setFullName(l.full_name);
                    setPhone(l.phone ?? "");
                }}>
                      Ubah
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(l)}>
                      {l.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </Card>)}

      <Modal open={createOpen || Boolean(editTarget)} onClose={() => {
            setCreateOpen(false);
            setEditTarget(null);
        }} title={editTarget ? "Ubah Data Dosen" : "Tambah Dosen Baru"}>
        <form onSubmit={handleSave} className="space-y-4">
          {!editTarget ? (<div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lec-email" required>Email</Label>
                <Input id="lec-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lec-pw" required>Password Awal</Label>
                <Input id="lec-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
              </div>
            </div>) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lec-nidn">NIDN</Label>
              <Input id="lec-nidn" value={nidn} onChange={(e) => setNidn(e.target.value)}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lec-phone">Telepon</Label>
              <Input id="lec-phone" value={phone} onChange={(e) => setPhone(e.target.value)}/>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lec-name" required>Nama Lengkap & Gelar</Label>
            <Input id="lec-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required/>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditTarget(null); }}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} onConfirm={handleToggleStatus} loading={loading} destructive={archiveTarget?.status === "ACTIVE"} title={archiveTarget?.status === "ACTIVE" ? "Nonaktifkan Dosen?" : "Aktifkan Dosen?"} description={`Riwayat pengajaran ${archiveTarget?.full_name} tetap terjaga. Lanjutkan?`}/>
    </div>);
}
