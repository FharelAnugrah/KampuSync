"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatDateTimeID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, FeedbackAlert } from "@/components/ui/feedback";

export function NotificationsClient({ items }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null);

  async function markRead(notificationId) {
    setLoading(true);
    setFeedback(null);
    try {
      await apiFetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationId }),
      });
      setFeedback({
        type: "success",
        message: notificationId
          ? "Notifikasi ditandai sudah dibaca."
          : "Semua notifikasi ditandai sudah dibaca.",
      });
      router.refresh();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-5 w-5" aria-hidden="true" />}
        title="Tidak ada notifikasi"
        description="Notifikasi persetujuan KRS dan publikasi nilai akan muncul di sini."
      />
    );
  }

  return (
    <div className="space-y-4">
      {feedback ? (
        <FeedbackAlert
          type={feedback.type}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => markRead()} disabled={loading}>
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          Tandai Semua Sudah Dibaca
        </Button>
      </div>

      <div className="space-y-2.5">
        {items.map((n) => (
          <Card
            key={n.id}
            interactive
            className={!n.is_read ? "border-[#2457A6]/40 bg-[#F8FAFF]" : ""}
          >
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#172033]">{n.title}</h3>
                  {!n.is_read ? <Badge variant="info">Baru</Badge> : null}
                </div>
                <p className="text-sm text-[#475569]">{n.message}</p>
                <p className="text-xs text-[#64748B]">{formatDateTimeID(n.created_at)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {n.target_url ? (
                  <Link href={n.target_url}>
                    <Button size="sm" variant="outline">
                      Buka
                    </Button>
                  </Link>
                ) : null}
                {!n.is_read ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markRead(n.id)}
                    disabled={loading}
                  >
                    Tandai dibaca
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
