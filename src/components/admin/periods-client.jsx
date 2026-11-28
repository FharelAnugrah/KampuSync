"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatDateID, formatDateTimeID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { Modal } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FeedbackAlert } from "@/components/ui/feedback";
export function PeriodsClient({ initialItems }) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [krsTarget, setKrsTarget] = React.useState(null);
    const [name, setName] = React.useState("");
    const [academicYear, setAcademicYear] = React.useState("2026/2027");
    const [term, setTerm] = React.useState("GANJIL");
    const [startDate, setStartDate] = React.useState("");
    const [endDate, setEndDate] = React.useState("");
    const [krsStartAt, setKrsStartAt] = React.useState("");
    const [krsEndAt, setKrsEndAt] = React.useState("");
    const [isActive, setIsActive] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    async function handleCreate(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch("/api/admin/periods", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    academicYear,
                    term,
                    startDate,
                    endDate,
                    krsStartAt: krsStartAt ? new Date(krsStartAt).toISOString() : null,
                    krsEndAt: krsEndAt ? new Date(krsEndAt).toISOString() : null,
                    isActive,
                }),
            });
            setOpen(false);
            setFeedback({ type: "success", message: "Periode akademik berhasil dibuat." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    async function handleActivate(id) {
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch(`/api/admin/periods/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ action: "activate" }),
            });
            setFeedback({ type: "success", message: "Periode aktif berhasil diganti." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSaveKrsWindow(e) {
        e.preventDefault();
        if (!krsTarget)
            return;
        setLoading(true);
        try {
            await apiFetch(`/api/admin/periods/${krsTarget.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    action: "krs_window",
                    krsStartAt: krsStartAt ? new Date(krsStartAt).toISOString() : null,
                    krsEndAt: krsEndAt ? new Date(krsEndAt).toISOString() : null,
                }),
            });
            setKrsTarget(null);
            setFeedback({ type: "success", message: "Jendela pengisian KRS diperbarui." });
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

      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4"/>
          Tambah Periode Akademik
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periode</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Rentang Periode</TableHead>
              <TableHead>Jadwal KRS</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialItems.map((p) => (<TableRow key={p.id}>
                <TableCell className="font-semibold">{p.name}</TableCell>
                <TableCell>{p.academic_year} • {p.term}</TableCell>
                <TableCell className="text-xs text-[#475569]">
                  {formatDateID(p.start_date)} – {formatDateID(p.end_date)}
                </TableCell>
                <TableCell className="text-xs text-[#475569]">
                  {p.krs_start_at && p.krs_end_at
                ? `${formatDateTimeID(p.krs_start_at)} s/d ${formatDateTimeID(p.krs_end_at)}`
                : "Belum diatur"}
                </TableCell>
                <TableCell>
                  {p.is_active ? (<Badge variant="success">
                      <CheckCircle2 className="h-3 w-3"/>
                      Aktif
                    </Badge>) : (<Badge variant="neutral">Tidak Aktif</Badge>)}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => {
                setKrsTarget(p);
                setKrsStartAt(p.krs_start_at ? p.krs_start_at.slice(0, 16) : "");
                setKrsEndAt(p.krs_end_at ? p.krs_end_at.slice(0, 16) : "");
            }}>
                    Atur KRS
                  </Button>
                  {!p.is_active ? (<Button size="sm" onClick={() => handleActivate(p.id)} disabled={loading}>
                      Aktifkan
                    </Button>) : null}
                </TableCell>
              </TableRow>))}
          </TableBody>
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Periode Akademik">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="per-name" required>Nama Periode</Label>
            <Input id="per-name" placeholder="2026/2027 Genap" value={name} onChange={(e) => setName(e.target.value)} required/>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="per-year" required>Tahun Akademik</Label>
              <Input id="per-year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} required/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="per-term" required>Term</Label>
              <Select id="per-term" value={term} onChange={(e) => setTerm(e.target.value)}>
                <option value="GANJIL">GANJIL</option>
                <option value="GENAP">GENAP</option>
                <option value="PENDEK">PENDEK</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="per-start" required>Tanggal Mulai</Label>
              <Input id="per-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="per-end" required>Tanggal Selesai</Label>
              <Input id="per-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required/>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#172033]">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}/>
            Jadikan periode akademik aktif saat ini
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(krsTarget)} onClose={() => setKrsTarget(null)} title={`Jadwal KRS — ${krsTarget?.name ?? ""}`}>
        <form onSubmit={handleSaveKrsWindow} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="krs-open">Dibuka Pada</Label>
            <Input id="krs-open" type="datetime-local" value={krsStartAt} onChange={(e) => setKrsStartAt(e.target.value)}/>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="krs-close">Ditutup Pada</Label>
            <Input id="krs-close" type="datetime-local" value={krsEndAt} onChange={(e) => setKrsEndAt(e.target.value)}/>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setKrsTarget(null)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Jadwal KRS"}</Button>
          </div>
        </form>
      </Modal>
    </div>);
}
