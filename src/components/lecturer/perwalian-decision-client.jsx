"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/form-controls";
import { FeedbackAlert } from "@/components/ui/feedback";
export function PerwalianDecisionClient({ studyPlanId, status, }) {
    const router = useRouter();
    const [reason, setReason] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    async function handleDecide(decision) {
        if (decision === "REJECTED" && reason.trim().length < 3) {
            setFeedback({ type: "error", message: "Alasan penolakan wajib diisi minimal 3 karakter." });
            return;
        }
        setLoading(true);
        setFeedback(null);
        try {
            await apiFetch(`/api/lecturer/perwalian/${studyPlanId}`, {
                method: "POST",
                body: JSON.stringify({ decision, reason: reason.trim() || undefined }),
            });
            setFeedback({
                type: "success",
                message: decision === "APPROVED" ? "KRS berhasil disetujui." : "KRS telah ditolak dan dikembalikan ke mahasiswa.",
            });
            router.refresh();
        }
        catch (err) {
            setFeedback({ type: "error", message: err.message });
        }
        finally {
            setLoading(false);
        }
    }
    if (status !== "SUBMITTED") {
        return null;
    }
    return (<Card>
      <CardHeader>
        <CardTitle>Keputusan Dosen Wali</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback ? <FeedbackAlert type={feedback.type} message={feedback.message}/> : null}
        <div className="space-y-1.5">
          <Label htmlFor="krs-decision-reason">
            Catatan / Alasan (wajib bila menolak)
          </Label>
          <Textarea id="krs-decision-reason" placeholder="Tuliskan catatan akademik atau alasan penolakan..." value={reason} onChange={(e) => setReason(e.target.value)}/>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="success" onClick={() => handleDecide("APPROVED")} disabled={loading}>
            <CheckCircle2 className="h-4 w-4"/>
            Setujui KRS
          </Button>
          <Button variant="destructive" onClick={() => handleDecide("REJECTED")} disabled={loading}>
            <XCircle className="h-4 w-4"/>
            Tolak KRS
          </Button>
        </div>
      </CardContent>
    </Card>);
}
