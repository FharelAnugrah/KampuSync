"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, QrCode } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatDateTimeID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState, FeedbackAlert } from "@/components/ui/feedback";
export function StudentAttendanceClient({ openQrSessions, recaps, }) {
    const router = useRouter();
    const pendingSessions = openQrSessions.filter((s) => !s.already_recorded);
    const [sessionId, setSessionId] = React.useState(pendingSessions[0]?.session_id ?? "");
    const [tokenOrCode, setTokenOrCode] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    async function handleCheckIn(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch("/api/student/attendance/checkin", {
                method: "POST",
                body: JSON.stringify({
                    sessionId: sessionId || undefined,
                    tokenOrCode,
                }),
            });
            setTokenOrCode("");
            setFeedback({ type: "success", message: "Presensi Anda berhasil dicatat (Hadir)." });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="space-y-6">
      {feedback ? <FeedbackAlert type={feedback.type} message={feedback.message}/> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[#2457A6]"/>
            Presensi Sesi QR / Kode Aktif
          </CardTitle>
          <CardDescription>
            Tempel hasil pemindaian QR atau masukkan 6 karakter kode presensi yang ditampilkan dosen di kelas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {openQrSessions.length === 0 ? (<p className="text-sm text-[#64748B]">
              Saat ini belum ada sesi presensi QR yang sedang berlangsung pada kelas Anda.
            </p>) : (<form onSubmit={handleCheckIn} className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <Label htmlFor="att-sess">Pilih Sesi Pertemuan</Label>
                <Select id="att-sess" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                  {openQrSessions.map((s) => (<option key={s.session_id} value={s.session_id} disabled={s.already_recorded}>
                      {s.course_code}-{s.class_code} • Pertemuan {s.meeting_number}
                      {s.already_recorded ? " (Sudah Presensi)" : ` (Tutup: ${formatDateTimeID(s.closes_at)})`}
                    </option>))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="att-code" required>Kode Presensi / Payload QR</Label>
                <Input id="att-code" placeholder="Contoh: 7K9M2P atau JSON QR" value={tokenOrCode} onChange={(e) => setTokenOrCode(e.target.value)} required/>
              </div>
              <Button type="submit" disabled={loading || pendingSessions.length === 0}>
                <CheckCircle2 className="h-4 w-4"/>
                {loading ? "Memvalidasi..." : "Kirim Presensi"}
              </Button>
            </form>)}
        </CardContent>
      </Card>

      {recaps.length === 0 ? (<EmptyState title="Belum ada riwayat presensi" description="Rekap kehadiran muncul setelah KRS disetujui dan dosen membuka sesi presensi."/>) : (<Card>
          <CardHeader>
            <CardTitle>Rekap Kehadiran Per Mata Kuliah</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mata Kuliah</TableHead>
                  <TableHead>Total Sesi</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead>Izin</TableHead>
                  <TableHead>Sakit</TableHead>
                  <TableHead>Alpa</TableHead>
                  <TableHead>Persentase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recaps.map((r) => {
                const pct = r.total_sessions > 0
                    ? Math.round((r.present_count / r.total_sessions) * 100)
                    : 100;
                return (<TableRow key={r.class_offering_id}>
                      <TableCell className="font-medium">
                        {r.course_code}-{r.class_code} • {r.course_name}
                      </TableCell>
                      <TableCell>{r.total_sessions}</TableCell>
                      <TableCell className="font-semibold text-[#16803D]">{r.present_count}</TableCell>
                      <TableCell>{r.excused_count}</TableCell>
                      <TableCell>{r.sick_count}</TableCell>
                      <TableCell className="text-[#C53030]">{r.absent_count}</TableCell>
                      <TableCell>
                        <Badge variant={pct >= 75 ? "success" : "warning"}>{pct}%</Badge>
                      </TableCell>
                    </TableRow>);
            })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>)}
    </div>);
}
