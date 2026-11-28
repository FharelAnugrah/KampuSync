"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Plus, Search, Send, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { slotsOverlap } from "@/lib/schedule-utils";
import { cn, formatDateTimeID, formatDayName, formatTimeRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form-controls";
import { FeedbackAlert, StatusBadge } from "@/components/ui/feedback";

export function KrsClient({
  period,
  initialStatus,
  initialSelectedIds,
  maxCredits,
  previousIps,
  passedCourseGrades,
  offerings,
  histories,
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = React.useState(initialSelectedIds);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null);
  const isLocked = initialStatus === "SUBMITTED" || initialStatus === "APPROVED";

  const selectedOfferings = React.useMemo(
    () => offerings.filter((o) => selectedIds.includes(o.id)),
    [offerings, selectedIds]
  );

  const totalCredits = React.useMemo(
    () => selectedOfferings.reduce((acc, o) => acc + o.credits, 0),
    [selectedOfferings]
  );

  const creditPct = maxCredits > 0 ? Math.min(100, Math.round((totalCredits / maxCredits) * 100)) : 0;

  const filteredOfferings = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return offerings;
    return offerings.filter(
      (o) =>
        o.course_code.toLowerCase().includes(q) ||
        o.course_name.toLowerCase().includes(q) ||
        o.lecturer_name.toLowerCase().includes(q)
    );
  }, [offerings, search]);

  function getConflictReason(candidate) {
    if (selectedIds.includes(candidate.id)) return null;
    if (candidate.enrolled_count >= candidate.capacity) {
      return "Kapasitas penuh";
    }
    const sameCourse = selectedOfferings.find((s) => s.course_id === candidate.course_id);
    if (sameCourse) {
      return `Mata kuliah ${candidate.course_code} sudah dipilih (Kelas ${sameCourse.class_code})`;
    }
    for (const prereq of candidate.prerequisites) {
      if (!passedCourseGrades[prereq.prerequisiteCourseId]) {
        return `Prasyarat ${prereq.code} belum lulus`;
      }
    }
    for (const sel of selectedOfferings) {
      for (const a of sel.schedules) {
        for (const b of candidate.schedules) {
          if (slotsOverlap(a, b)) {
            return `Bentrok jadwal dengan ${sel.course_code}-${sel.class_code}`;
          }
        }
      }
    }
    if (totalCredits + candidate.credits > maxCredits) {
      return `Melebihi batas ${maxCredits} SKS`;
    }
    return null;
  }

  function toggleOffering(id) {
    if (isLocked) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave(mode) {
    setLoading(true);
    setFeedback(null);
    try {
      await apiFetch("/api/student/krs", {
        method: "POST",
        body: JSON.stringify({
          mode,
          academicPeriodId: period.id,
          classOfferingIds: selectedIds,
        }),
      });
      setFeedback({
        type: "success",
        message:
          mode === "SUBMITTED"
            ? "KRS berhasil diajukan ke Dosen Wali."
            : "Draft KRS berhasil disimpan.",
      });
      router.refresh();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <FeedbackAlert
          type={feedback.type}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-[#172033]">{period.name}</h2>
              {initialStatus ? (
                <StatusBadge status={initialStatus} />
              ) : (
                <Badge>Belum Disimpan</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Jendela KRS: {formatDateTimeID(period.krs_start_at)} –{" "}
              {formatDateTimeID(period.krs_end_at)}
              {previousIps !== null ? ` • IPS Terakhir: ${previousIps.toFixed(2)}` : ""}
            </p>
          </div>

          <div className="min-w-[180px] flex-1 sm:flex-initial">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs text-[#64748B]">Total SKS Dipilih</p>
              <p
                className={cn(
                  "text-xl font-bold transition-colors duration-150",
                  totalCredits > maxCredits ? "text-[#C53030]" : "text-[#2457A6]"
                )}
              >
                {totalCredits} / {maxCredits} SKS
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={totalCredits}
              aria-valuemin={0}
              aria-valuemax={maxCredits}
              aria-label="Progress jumlah SKS dipilih"
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width,background-color] duration-200 ease-out",
                  totalCredits > maxCredits
                    ? "bg-[#C53030]"
                    : creditPct >= 85
                      ? "bg-[#B7791F]"
                      : "bg-[#2457A6]"
                )}
                style={{ width: `${creditPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {initialStatus === "REJECTED" && histories[0]?.reason ? (
        <FeedbackAlert
          type="error"
          message={`KRS Ditolak oleh ${histories[0].lecturer_name}: "${histories[0].reason}". Perbaiki pilihan Anda lalu ajukan ulang.`}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]"
              aria-hidden="true"
            />
            <Input
              placeholder="Cari kode, nama mata kuliah, atau dosen..."
              aria-label="Cari mata kuliah"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white pl-9 pr-9"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-2 rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            {filteredOfferings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-[#64748B]">
                  Tidak ada kelas yang cocok dengan pencarian &ldquo;{search}&rdquo;.
                </CardContent>
              </Card>
            ) : (
              filteredOfferings.map((o) => {
                const selected = selectedIds.includes(o.id);
                const issue = getConflictReason(o);
                return (
                  <Card
                    key={o.id}
                    className={cn(
                      "transition-[border-color,box-shadow,background-color] duration-150",
                      selected
                        ? "border-[#2457A6] bg-[#F8FAFF] ring-1 ring-[#2457A6]"
                        : "hover:border-[#CBD5E1] hover:shadow-sm"
                    )}
                  >
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#172033]">
                            {o.course_code}-{o.class_code} • {o.course_name}
                          </span>
                          <Badge variant="primary">{o.credits} SKS</Badge>
                          <Badge variant={o.enrolled_count >= o.capacity ? "danger" : "neutral"}>
                            Kuota {o.enrolled_count}/{o.capacity}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B]">Dosen: {o.lecturer_name}</p>
                        <p className="text-xs text-[#475569]">
                          {o.schedules.length === 0
                            ? "Jadwal belum ditetapkan"
                            : o.schedules
                                .map(
                                  (s) =>
                                    `${formatDayName(s.dayOfWeek)} ${formatTimeRange(
                                      s.startTime,
                                      s.endTime
                                    )} (${s.room})`
                                )
                                .join(" • ")}
                        </p>
                        {o.prerequisites.length > 0 ? (
                          <p className="text-xs text-[#64748B]">
                            Prasyarat: {o.prerequisites.map((p) => p.code).join(", ")}
                          </p>
                        ) : null}
                        {issue && !selected ? (
                          <p className="inline-flex items-center gap-1 text-xs font-medium text-[#C53030]">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            {issue}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0">
                        {selected ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLocked || loading}
                            onClick={() => toggleOffering(o.id)}
                          >
                            <Check className="h-4 w-4 text-[#16803D]" aria-hidden="true" />
                            Dipilih
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isLocked || loading}
                            onClick={() => toggleOffering(o.id)}
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Pilih Kelas
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kelas Terpilih ({selectedOfferings.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedOfferings.length === 0 ? (
                <p className="text-sm text-[#64748B]">Belum ada kelas dipilih.</p>
              ) : (
                <ul className="divide-y divide-[#E2E8F0]">
                  {selectedOfferings.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-2 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#172033]">
                          {o.course_code}-{o.class_code} ({o.credits} SKS)
                        </p>
                        <p className="truncate text-xs text-[#64748B]">{o.course_name}</p>
                      </div>
                      {!isLocked ? (
                        <button
                          type="button"
                          onClick={() => toggleOffering(o.id)}
                          aria-label={`Hapus ${o.course_name}`}
                          className="rounded p-1 text-[#C53030] transition-colors hover:bg-[#FEF2F2]"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {!isLocked ? (
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleSave("DRAFT")}
                  >
                    Simpan Draft
                  </Button>
                  <Button
                    disabled={loading || selectedOfferings.length === 0}
                    onClick={() => handleSave("SUBMITTED")}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Ajukan KRS ke Dosen Wali
                  </Button>
                </div>
              ) : (
                <p className="rounded-lg bg-[#F8FAFC] p-3 text-xs text-[#475569]">
                  KRS berstatus <strong>{initialStatus}</strong> dan terkunci dari perubahan.
                </p>
              )}
            </CardContent>
          </Card>

          {histories.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Keputusan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {histories.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-lg border border-[#E2E8F0] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge status={h.decision} />
                      <span className="text-[#64748B]">
                        {formatDateTimeID(h.decided_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 font-medium text-[#172033]">{h.lecturer_name}</p>
                    {h.reason ? <p className="mt-1 text-[#475569]">{h.reason}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
