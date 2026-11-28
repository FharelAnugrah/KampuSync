"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatDayName, formatTimeRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { Modal } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FeedbackAlert, StatusBadge } from "@/components/ui/feedback";
export function ClassesClient({ initialItems, courses, lecturers, periods, }) {
    const router = useRouter();
    const [search, setSearch] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const activePeriod = periods.find((p) => p.is_active) ?? periods[0];
    const [courseId, setCourseId] = React.useState(courses[0]?.id ?? "");
    const [lecturerId, setLecturerId] = React.useState(lecturers[0]?.id ?? "");
    const [academicPeriodId, setAcademicPeriodId] = React.useState(activePeriod?.id ?? "");
    const [classCode, setClassCode] = React.useState("A");
    const [capacity, setCapacity] = React.useState("35");
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return initialItems;
        return initialItems.filter((c) => c.course_code.toLowerCase().includes(q) ||
            c.course_name.toLowerCase().includes(q) ||
            c.lecturer_name.toLowerCase().includes(q));
    }, [initialItems, search]);
    async function handleCreate(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch("/api/admin/classes", {
                method: "POST",
                body: JSON.stringify({
                    courseId,
                    lecturerId,
                    academicPeriodId,
                    classCode,
                    capacity: Number(capacity),
                }),
            });
            setOpen(false);
            setFeedback({ type: "success", message: "Kelas perkuliahan berhasil dibuka." });
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
          <Input placeholder="Cari mata kuliah atau dosen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"/>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4"/>
          Buka Kelas Baru
        </Button>
      </div>

      {filtered.length === 0 ? (<EmptyState title="Belum ada kelas dibuka" description="Buka kelas dari mata kuliah pada periode aktif."/>) : (<Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mata Kuliah</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Dosen Pengampu</TableHead>
                <TableHead>Jadwal</TableHead>
                <TableHead>Peserta</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (<TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold">{c.course_code} — {c.course_name}</p>
                      <p className="text-xs text-[#64748B]">{c.credits} SKS • {c.study_program_name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{c.class_code}</TableCell>
                  <TableCell className="text-xs">{c.period_name}</TableCell>
                  <TableCell>{c.lecturer_name}</TableCell>
                  <TableCell className="text-xs text-[#475569]">
                    {c.schedules.length === 0 ? (<span className="text-[#B7791F]">Belum dijadwalkan</span>) : (c.schedules.map((s) => (<div key={s.id}>
                          {formatDayName(s.dayOfWeek)} {formatTimeRange(s.startTime, s.endTime)} ({s.room})
                        </div>)))}
                  </TableCell>
                  <TableCell>{c.enrolled_count}/{c.capacity}</TableCell>
                  <TableCell><StatusBadge status={c.status}/></TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </Card>)}

      <Modal open={open} onClose={() => setOpen(false)} title="Buka Kelas Perkuliahan">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cls-period" required>Periode Akademik</Label>
            <Select id="cls-period" value={academicPeriodId} onChange={(e) => setAcademicPeriodId(e.target.value)}>
              {periods.map((p) => (<option key={p.id} value={p.id}>{p.name}{p.is_active ? " (Aktif)" : ""}</option>))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cls-course" required>Mata Kuliah</Label>
            <Select id="cls-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.name} ({c.credits} SKS)</option>))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cls-lec" required>Dosen Pengampu</Label>
            <Select id="cls-lec" value={lecturerId} onChange={(e) => setLecturerId(e.target.value)}>
              {lecturers.map((l) => (<option key={l.id} value={l.id}>{l.full_name}</option>))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cls-code" required>Kode Kelas</Label>
              <Input id="cls-code" value={classCode} onChange={(e) => setClassCode(e.target.value)} required/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cls-cap" required>Kapasitas</Label>
              <Input id="cls-cap" type="number" min={1} max={500} value={capacity} onChange={(e) => setCapacity(e.target.value)} required/>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </Modal>
    </div>);
}
