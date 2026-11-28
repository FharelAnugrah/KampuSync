"use client";
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Lock, Plus, QrCode, RefreshCw, Save } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatDateTimeID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FeedbackAlert, StatusBadge } from "@/components/ui/feedback";
export function LecturerAttendanceClient({ classes, selectedClassId, sessions, selectedSessionId, students, defaultQrMinutes, }) {
    const router = useRouter();
    const nextMeeting = (sessions[0]?.meeting_number ?? 0) + 1;
    const [meetingNumber, setMeetingNumber] = React.useState(String(nextMeeting));
    const [topic, setTopic] = React.useState("");
    const [method, setMethod] = React.useState("QR");
    const [durationMinutes, setDurationMinutes] = React.useState(String(defaultQrMinutes));
    const [qrDataUrl, setQrDataUrl] = React.useState(null);
    const [fallbackCode, setFallbackCode] = React.useState(null);
    const [qrClosesAt, setQrClosesAt] = React.useState(null);
    const [statusMap, setStatusMap] = React.useState(() => {
        const initial = {};
        for (const s of students) {
            initial[s.student_id] = s.attendance_status ?? "PRESENT";
        }
        return initial;
    });
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const activeSession = sessions.find((s) => s.id === selectedSessionId) ?? null;
    async function renderQr(payload) {
        const dataUrl = await QRCode.toDataURL(payload, { width: 220, margin: 2 });
        setQrDataUrl(dataUrl);
    }
    async function handleCreateSession(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            const res = await apiFetch("/api/lecturer/attendance/sessions", {
                method: "POST",
                body: JSON.stringify({
                    classOfferingId: selectedClassId,
                    meetingNumber: Number(meetingNumber),
                    topic: topic || undefined,
                    method,
                    durationMinutes: method === "QR" ? Number(durationMinutes) : undefined,
                }),
            });
            if (res.qrPayload) {
                await renderQr(res.qrPayload);
                setFallbackCode(res.fallbackCode);
                setQrClosesAt(res.session.closes_at);
            }
            else {
                setQrDataUrl(null);
                setFallbackCode(null);
            }
            setTopic("");
            setFeedback({ type: "success", message: `Sesi pertemuan ke-${res.session.meeting_number} dibuka.` });
            router.push(`/lecturer/attendance?classId=${selectedClassId}&sessionId=${res.session.id}`);
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    async function handleRotateQr() {
        if (!activeSession)
            return;
        setLoading(true);
        setFeedback(null);
        try {
            const res = await apiFetch(`/api/lecturer/attendance/sessions/${activeSession.id}`, { method: "PATCH", body: JSON.stringify({ action: "rotate_qr" }) });
            await renderQr(res.qrPayload);
            setFallbackCode(res.fallbackCode);
            setQrClosesAt(res.closesAt);
            setFeedback({ type: "success", message: "QR Code dan kode presensi diperbarui." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    async function handleCloseSession() {
        if (!activeSession)
            return;
        setLoading(true);
        try {
            await apiFetch(`/api/lecturer/attendance/sessions/${activeSession.id}`, {
                method: "PATCH",
                body: JSON.stringify({ action: "close" }),
            });
            setQrDataUrl(null);
            setFallbackCode(null);
            setFeedback({ type: "success", message: "Sesi presensi ditutup." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSaveManual() {
        if (!activeSession)
            return;
        setLoading(true);
        setFeedback(null);
        try {
            const entries = students.map((s) => ({
                studentId: s.student_id,
                status: statusMap[s.student_id] ?? "PRESENT",
            }));
            await apiFetch(`/api/lecturer/attendance/sessions/${activeSession.id}`, {
                method: "POST",
                body: JSON.stringify({ entries }),
            });
            setFeedback({ type: "success", message: "Data presensi manual berhasil disimpan." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    if (classes.length === 0) {
        return (<EmptyState title="Belum ada kelas diampu" description="Anda belum ditugaskan mengampu kelas pada periode aktif."/>);
    }
    return (<div className="space-y-6">
      {feedback ? <FeedbackAlert type={feedback.type} message={feedback.message}/> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="lec-att-class">Kelas:</Label>
        <Select id="lec-att-class" value={selectedClassId} onChange={(e) => router.push(`/lecturer/attendance?classId=${e.target.value}`)} className="w-full sm:w-96">
          {classes.map((c) => (<option key={c.id} value={c.id}>
              {c.course_code}-{c.class_code} • {c.course_name} ({c.enrolled_count} mhs)
            </option>))}
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Buka Sesi Pertemuan</CardTitle>
            <CardDescription>Pilih metode Manual atau QR Code untuk sesi perkuliahan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sess-num" required>Pertemuan Ke-</Label>
                  <Input id="sess-num" type="number" min={1} max={32} value={meetingNumber} onChange={(e) => setMeetingNumber(e.target.value)} required/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sess-method" required>Metode</Label>
                  <Select id="sess-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="QR">QR Code</option>
                    <option value="MANUAL">Manual</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sess-topic">Topik Pertemuan</Label>
                <Input id="sess-topic" placeholder="Contoh: Normalisasi Basis Data" value={topic} onChange={(e) => setTopic(e.target.value)}/>
              </div>
              {method === "QR" ? (<div className="space-y-1.5">
                  <Label htmlFor="sess-dur">Durasi Aktif (menit)</Label>
                  <Input id="sess-dur" type="number" min={1} max={180} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)}/>
                </div>) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                <Plus className="h-4 w-4"/>
                {loading ? "Membuka Sesi..." : "Buka Sesi Presensi"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Daftar Sesi Pertemuan</CardTitle>
              <CardDescription>Pilih sesi untuk menampilkan QR atau mengisi presensi manual.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (<p className="text-sm text-[#64748B]">Belum ada sesi pertemuan untuk kelas ini.</p>) : (<div className="space-y-2">
                {sessions.map((s) => (<button key={s.id} type="button" onClick={() => router.push(`/lecturer/attendance?classId=${selectedClassId}&sessionId=${s.id}`)} className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors cursor-pointer ${s.id === activeSession?.id
                    ? "border-[#2457A6] bg-[#EFF6FF]"
                    : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"}`}>
                    <div>
                      <p className="font-semibold text-[#172033]">
                        Pertemuan {s.meeting_number} {s.topic ? `• ${s.topic}` : ""}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Metode: {s.method} • Tercatat: {s.recorded_count} mahasiswa • Dibuka {formatDateTimeID(s.opens_at)}
                      </p>
                    </div>
                    <StatusBadge status={s.status}/>
                  </button>))}
              </div>)}
          </CardContent>
        </Card>
      </div>

      {activeSession ? (<Card>
          <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                Detail Sesi: Pertemuan {activeSession.meeting_number} ({activeSession.method})
              </CardTitle>
              <CardDescription>
                {activeSession.closes_at ? `Batas waktu: ${formatDateTimeID(qrClosesAt ?? activeSession.closes_at)}` : "Sesi manual"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeSession.method === "QR" && activeSession.status === "OPEN" ? (<Button size="sm" variant="outline" onClick={handleRotateQr} disabled={loading}>
                  <RefreshCw className="h-4 w-4"/>
                  {qrDataUrl ? "Perbarui QR" : "Tampilkan / Perbarui QR"}
                </Button>) : null}
              {activeSession.status === "OPEN" ? (<Button size="sm" variant="destructive" onClick={handleCloseSession} disabled={loading}>
                  <Lock className="h-4 w-4"/>
                  Tutup Sesi
                </Button>) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeSession.method === "QR" && activeSession.status === "OPEN" ? (<div className="flex flex-col items-center gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:flex-row">
                {qrDataUrl ? (<Image src={qrDataUrl} alt="QR Code Presensi Kampusync" width={192} height={192} unoptimized className="h-48 w-48 rounded-lg border border-[#E2E8F0] bg-white p-2"/>) : (<div className="flex h-48 w-48 flex-col items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-white text-center p-4">
                    <QrCode className="h-8 w-8 text-[#64748B]"/>
                    <p className="mt-2 text-xs text-[#64748B]">
                      Klik &ldquo;Tampilkan / Perbarui QR&rdquo; untuk membuat kode QR aktif baru.
                    </p>
                  </div>)}
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-[#172033]">Instruksi Presensi Mahasiswa</p>
                  <p className="text-[#475569]">
                    Mahasiswa dapat memindai QR Code atau memasukkan kode alternatif berikut di menu Presensi:
                  </p>
                  {fallbackCode ? (<div className="inline-block rounded-lg border border-[#BFDBFE] bg-white px-4 py-2 font-mono text-2xl font-bold tracking-widest text-[#2457A6]">
                      {fallbackCode}
                    </div>) : (<p className="text-xs text-[#64748B]">Kode hanya ditampilkan saat sesi dibuat/diperbarui demi keamanan token.</p>)}
                </div>
              </div>) : null}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#172033]">
                  Daftar Peserta Kelas ({students.length})
                </h4>
                <Button size="sm" onClick={handleSaveManual} disabled={loading || students.length === 0}>
                  <Save className="h-4 w-4"/>
                  Simpan Presensi Manual
                </Button>
              </div>
              {students.length === 0 ? (<p className="text-sm text-[#64748B]">Belum ada mahasiswa dengan KRS disetujui pada kelas ini.</p>) : (<Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NIM</TableHead>
                      <TableHead>Nama Mahasiswa</TableHead>
                      <TableHead>Status Kehadiran</TableHead>
                      <TableHead>Waktu Tercatat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (<TableRow key={s.student_id}>
                        <TableCell className="font-semibold">{s.nim}</TableCell>
                        <TableCell>{s.full_name}</TableCell>
                        <TableCell>
                          <Select aria-label={`Status kehadiran ${s.full_name}`} value={statusMap[s.student_id] ?? "PRESENT"} onChange={(e) => setStatusMap((prev) => ({
                        ...prev,
                        [s.student_id]: e.target.value,
                    }))} className="w-36">
                            <option value="PRESENT">Hadir</option>
                            <option value="EXCUSED">Izin</option>
                            <option value="SICK">Sakit</option>
                            <option value="ABSENT">Alpa</option>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-[#64748B]">
                          {s.recorded_at ? formatDateTimeID(s.recorded_at) : "Belum tercatat"}
                        </TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>)}
            </div>
          </CardContent>
        </Card>) : null}
    </div>);
}
