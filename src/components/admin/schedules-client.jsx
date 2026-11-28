"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatDayName, formatTimeRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { FeedbackAlert } from "@/components/ui/feedback";
export function SchedulesClient({ classes }) {
    const router = useRouter();
    const [classOfferingId, setClassOfferingId] = React.useState(classes[0]?.id ?? "");
    const [dayOfWeek, setDayOfWeek] = React.useState("1");
    const [startTime, setStartTime] = React.useState("08:00");
    const [endTime, setEndTime] = React.useState("10:30");
    const [room, setRoom] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    async function handleAddSchedule(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch("/api/admin/schedules", {
                method: "POST",
                body: JSON.stringify({
                    classOfferingId,
                    dayOfWeek: Number(dayOfWeek),
                    startTime,
                    endTime,
                    room,
                }),
            });
            setRoom("");
            setFeedback({ type: "success", message: "Jadwal berhasil ditambahkan tanpa bentrok." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    async function handleDelete(scheduleId) {
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch(`/api/admin/schedules/${scheduleId}`, { method: "DELETE" });
            setFeedback({ type: "success", message: "Slot jadwal dihapus." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>Tambah Slot Jadwal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSchedule} className="space-y-4">
            {feedback ? <FeedbackAlert type={feedback.type} message={feedback.message}/> : null}
            <div className="space-y-1.5">
              <Label htmlFor="sch-class" required>Kelas</Label>
              <Select id="sch-class" value={classOfferingId} onChange={(e) => setClassOfferingId(e.target.value)}>
                {classes.map((c) => (<option key={c.id} value={c.id}>
                    {c.course_code}-{c.class_code} ({c.course_name}) — {c.period_name}
                  </option>))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sch-day" required>Hari</Label>
              <Select id="sch-day" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                {[1, 2, 3, 4, 5, 6].map((d) => (<option key={d} value={d}>{formatDayName(d)}</option>))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sch-start" required>Mulai</Label>
                <Input id="sch-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required/>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sch-end" required>Selesai</Label>
                <Input id="sch-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required/>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sch-room" required>Ruangan</Label>
              <Input id="sch-room" placeholder="Ruang Kuliah 302" value={room} onChange={(e) => setRoom(e.target.value)} required/>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Plus className="h-4 w-4"/>
              {loading ? "Memeriksa Bentrok..." : "Simpan Jadwal"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Daftar Jadwal Perkuliahan</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[#E2E8F0]">
          {classes.map((c) => (<div key={c.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-[#172033]">
                  {c.course_code}-{c.class_code} • {c.course_name}
                </p>
                <span className="text-xs text-[#64748B]">{c.lecturer_name} • {c.period_name}</span>
              </div>
              {c.schedules.length === 0 ? (<p className="mt-1 text-xs text-[#B7791F]">Belum memiliki jadwal.</p>) : (<ul className="mt-2 space-y-1.5">
                  {c.schedules.map((s) => (<li key={s.id} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs">
                      <span>
                        <strong>{formatDayName(s.dayOfWeek)}</strong>,{" "}
                        {formatTimeRange(s.startTime, s.endTime)} • {s.room}
                      </span>
                      <button type="button" onClick={() => handleDelete(s.id)} aria-label="Hapus slot jadwal" className="rounded p-1 text-[#C53030] hover:bg-[#FEF2F2] cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5"/>
                      </button>
                    </li>))}
                </ul>)}
            </div>))}
        </CardContent>
      </Card>
    </div>);
}
