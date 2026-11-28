"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form-controls";
import { FeedbackAlert } from "@/components/ui/feedback";
export function SettingsClient({ initialPolicies }) {
    const router = useRouter();
    const [defaultMaxCredits, setDefaultMaxCredits] = React.useState(String(initialPolicies.max_credits_per_semester.defaultMax));
    const [qrMinutes, setQrMinutes] = React.useState(String(initialPolicies.qr_attendance_ttl_minutes.minutes));
    const [minAttendance, setMinAttendance] = React.useState(String(initialPolicies.minimum_attendance_percentage.percentage));
    const [allowPostEdit, setAllowPostEdit] = React.useState(initialPolicies.allow_post_publish_grade_edit.enabled);
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    async function handleSave(e) {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch("/api/admin/policies", {
                method: "PATCH",
                body: JSON.stringify({
                    key: "max_credits_per_semester",
                    value: {
                        ...initialPolicies.max_credits_per_semester,
                        defaultMax: Number(defaultMaxCredits),
                    },
                }),
            });
            await apiFetch("/api/admin/policies", {
                method: "PATCH",
                body: JSON.stringify({
                    key: "qr_attendance_ttl_minutes",
                    value: { minutes: Number(qrMinutes) },
                }),
            });
            await apiFetch("/api/admin/policies", {
                method: "PATCH",
                body: JSON.stringify({
                    key: "minimum_attendance_percentage",
                    value: { percentage: Number(minAttendance) },
                }),
            });
            await apiFetch("/api/admin/policies", {
                method: "PATCH",
                body: JSON.stringify({
                    key: "allow_post_publish_grade_edit",
                    value: { enabled: allowPostEdit, requireReason: true },
                }),
            });
            setFeedback({ type: "success", message: "Kebijakan akademik berhasil disimpan." });
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
          <CardTitle>Kebijakan Akademik Terkonfigurasi</CardTitle>
          <CardDescription>
            Aturan operasional KRS, presensi QR, dan publikasi nilai disimpan di database tanpa hardcode permanen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <Label htmlFor="pol-sks">Batas SKS Default (Semester Awal / Tanpa IPS Sebelumnya)</Label>
              <Input id="pol-sks" type="number" min={12} max={24} value={defaultMaxCredits} onChange={(e) => setDefaultMaxCredits(e.target.value)}/>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pol-qr">Durasi Aktif QR Presensi (menit)</Label>
                <Input id="pol-qr" type="number" min={1} max={180} value={qrMinutes} onChange={(e) => setQrMinutes(e.target.value)}/>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pol-att">Minimal Kehadiran Disarankan (%)</Label>
                <Input id="pol-att" type="number" min={0} max={100} value={minAttendance} onChange={(e) => setMinAttendance(e.target.value)}/>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#172033]">
              <input type="checkbox" checked={allowPostEdit} onChange={(e) => setAllowPostEdit(e.target.checked)}/>
              Izinkan perubahan nilai setelah publikasi (wajib disertai alasan & tercatat di audit log)
            </label>

            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Kebijakan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skala Konversi Nilai Aktif</CardTitle>
          <CardDescription>Acuan perhitungan nilai huruf dan mutu KHS/IPS.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {initialPolicies.grading_scale.map((b) => (<div key={b.letter} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-center">
                <p className="text-base font-bold text-[#172033]">{b.letter}</p>
                <p className="text-xs text-[#64748B]">≥ {b.minScore} • Bobot {b.gradePoint.toFixed(2)}</p>
              </div>))}
          </div>
        </CardContent>
      </Card>
    </div>);
}
