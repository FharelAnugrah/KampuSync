"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form-controls";
import { Modal, ConfirmDialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FeedbackAlert, StatusBadge } from "@/components/ui/feedback";
export function FacultiesClient({ initialItems }) {
    const router = useRouter();
    const [search, setSearch] = React.useState("");
    const [createOpen, setCreateOpen] = React.useState(false);
    const [editTarget, setEditTarget] = React.useState(null);
    const [archiveTarget, setArchiveTarget] = React.useState(null);
    const [code, setCode] = React.useState("");
    const [name, setName] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return initialItems;
        return initialItems.filter((f) => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
    }, [initialItems, search]);
    async function handleSave(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            if (editTarget) {
                await apiFetch(`/api/admin/faculties/${editTarget.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ code, name }),
                });
                setFeedback({ type: "success", message: "Data fakultas diperbarui." });
                setEditTarget(null);
            }
            else {
                await apiFetch("/api/admin/faculties", {
                    method: "POST",
                    body: JSON.stringify({ code, name }),
                });
                setFeedback({ type: "success", message: "Fakultas baru berhasil ditambahkan." });
                setCreateOpen(false);
            }
            setCode("");
            setName("");
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
            const nextStatus = archiveTarget.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
            await apiFetch(`/api/admin/faculties/${archiveTarget.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: nextStatus }),
            });
            setFeedback({
                type: "success",
                message: `Status fakultas ${archiveTarget.name} diubah menjadi ${nextStatus}.`,
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
          <Input placeholder="Cari kode atau nama fakultas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"/>
        </div>
        <Button onClick={() => {
            setCode("");
            setName("");
            setEditTarget(null);
            setCreateOpen(true);
        }}>
          <Plus className="h-4 w-4"/>
          Tambah Fakultas
        </Button>
      </div>

      {filtered.length === 0 ? (<EmptyState title="Belum ada data fakultas" description="Tambahkan fakultas terlebih dahulu sebelum membuat program studi."/>) : (<Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Fakultas</TableHead>
                <TableHead>Jumlah Prodi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (<TableRow key={f.id}>
                  <TableCell className="font-semibold">{f.code}</TableCell>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.program_count}</TableCell>
                  <TableCell>
                    <StatusBadge status={f.status}/>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => {
                    setEditTarget(f);
                    setCode(f.code);
                    setName(f.name);
                }}>
                      Ubah
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(f)}>
                      {f.status === "ACTIVE" ? "Arsipkan" : "Aktifkan"}
                    </Button>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </Card>)}

      <Modal open={createOpen || Boolean(editTarget)} onClose={() => {
            setCreateOpen(false);
            setEditTarget(null);
        }} title={editTarget ? "Ubah Fakultas" : "Tambah Fakultas"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fac-code" required>Kode Fakultas</Label>
            <Input id="fac-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="FTI" required/>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fac-name" required>Nama Fakultas</Label>
            <Input id="fac-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fakultas Teknologi Informasi" required/>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
            setCreateOpen(false);
            setEditTarget(null);
        }}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} onConfirm={handleToggleStatus} loading={loading} destructive={archiveTarget?.status === "ACTIVE"} title={archiveTarget?.status === "ACTIVE" ? "Arsipkan Fakultas?" : "Aktifkan Fakultas?"} description={`Riwayat akademik tetap dipertahankan. Ubah status "${archiveTarget?.name}"?`} confirmLabel={archiveTarget?.status === "ACTIVE" ? "Arsipkan" : "Aktifkan"}/>
    </div>);
}
