"use client";
import * as React from "react";
import { CalendarDays, List } from "lucide-react";
import { cn, formatDayName, formatTimeRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";

export function ScheduleView({ items }) {
  const [mode, setMode] = React.useState("list");
  const [selectedDay, setSelectedDay] = React.useState("ALL");

  const availableDays = React.useMemo(() => {
    const set = new Set(items.map((item) => item.dayOfWeek));
    return [1, 2, 3, 4, 5, 6].filter((d) => set.has(d));
  }, [items]);

  const filteredList = React.useMemo(() => {
    if (selectedDay === "ALL") return items;
    return items.filter((item) => item.dayOfWeek === Number(selectedDay));
  }, [items, selectedDay]);

  const byDay = React.useMemo(() => {
    const map = new Map();
    for (const d of [1, 2, 3, 4, 5, 6]) map.set(d, []);
    for (const item of items) {
      const list = map.get(item.dayOfWeek) ?? [];
      list.push(item);
      map.set(item.dayOfWeek, list);
    }
    return map;
  }, [items]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Belum ada jadwal kuliah"
        description="Jadwal tampil setelah KRS disetujui atau kelas memiliki slot jadwal."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {mode === "list" && availableDays.length > 1 ? (
          <div
            role="group"
            aria-label="Filter hari kuliah"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              onClick={() => setSelectedDay("ALL")}
              aria-pressed={selectedDay === "ALL"}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                selectedDay === "ALL"
                  ? "bg-[#2457A6] text-white"
                  : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F6F8FB]"
              )}
            >
              Semua Hari
            </button>
            {availableDays.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(String(day))}
                aria-pressed={selectedDay === String(day)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedDay === String(day)
                    ? "bg-[#2457A6] text-white"
                    : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F6F8FB]"
                )}
              >
                {formatDayName(day)}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}

        <div
          role="group"
          aria-label="Mode tampilan jadwal"
          className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-1 shadow-xs"
        >
          <button
            type="button"
            onClick={() => setMode("list")}
            aria-pressed={mode === "list"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "list"
                ? "bg-[#2457A6] text-white"
                : "text-[#475569] hover:bg-[#F6F8FB] hover:text-[#172033]"
            )}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            Tampilan Daftar
          </button>
          <button
            type="button"
            onClick={() => setMode("weekly")}
            aria-pressed={mode === "weekly"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "weekly"
                ? "bg-[#2457A6] text-white"
                : "text-[#475569] hover:bg-[#F6F8FB] hover:text-[#172033]"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Kalender Mingguan
          </button>
        </div>
      </div>

      {mode === "list" ? (
        <div key={`list-${selectedDay}`} className="portal-page-enter space-y-3">
          {filteredList.map((item) => (
            <Card key={item.id} interactive>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[#172033]">
                    {item.courseCode}-{item.classCode} • {item.courseName} ({item.credits} SKS)
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {item.partnerLabel} • {item.room}
                  </p>
                </div>
                <div className="inline-flex w-fit items-center rounded-lg bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#2457A6]">
                  {formatDayName(item.dayOfWeek)}, {formatTimeRange(item.startTime, item.endTime)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div key="weekly" className="portal-page-enter grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((day) => {
            const dayItems = byDay.get(day) ?? [];
            return (
              <Card key={day}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{formatDayName(day)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-[#64748B]">Tidak ada jadwal</p>
                  ) : (
                    dayItems.map((it) => (
                      <div
                        key={it.id}
                        className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs transition-colors hover:border-[#2457A6]/40 hover:bg-[#F8FAFF]"
                      >
                        <p className="font-semibold text-[#2457A6]">
                          {formatTimeRange(it.startTime, it.endTime)}
                        </p>
                        <p className="mt-1 font-semibold text-[#172033]">
                          {it.courseCode}-{it.classCode} • {it.courseName}
                        </p>
                        <p className="mt-0.5 text-[#64748B]">
                          {it.room} • {it.partnerLabel}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
