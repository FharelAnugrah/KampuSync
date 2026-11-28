import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "./badge";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }) {
  const map = {
    ACTIVE: { label: "Aktif", variant: "success" },
    INACTIVE: { label: "Nonaktif", variant: "warning" },
    ARCHIVED: { label: "Diarsipkan", variant: "neutral" },
    DRAFT: { label: "Draft", variant: "neutral" },
    SUBMITTED: { label: "Diajukan", variant: "warning" },
    APPROVED: { label: "Disetujui", variant: "success" },
    REJECTED: { label: "Ditolak", variant: "danger" },
    OPEN: { label: "Aktif", variant: "info" },
    CLOSED: { label: "Ditutup", variant: "neutral" },
    CANCELLED: { label: "Dibatalkan", variant: "danger" },
    PRESENT: { label: "Hadir", variant: "success" },
    EXCUSED: { label: "Izin", variant: "info" },
    SICK: { label: "Sakit", variant: "warning" },
    ABSENT: { label: "Alpa", variant: "danger" },
    PUBLISHED: { label: "Diterbitkan", variant: "success" },
    LOCKED: { label: "Dikunci", variant: "primary" },
  };
  const cfg = map[status] ?? { label: status, variant: "neutral" };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function StatCard({ title, value, subtitle, icon, className }) {
  return (
    <Card
      className={cn(
        "group overflow-hidden transition-[border-color,box-shadow] duration-150 hover:border-[#CBD5E1] hover:shadow-sm",
        className
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#172033]">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2457A6] transition-transform duration-150 motion-safe:group-hover:scale-105">
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-10 text-center">
      {icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]">
          {icon}
        </div>
      ) : null}
      <h4 className="text-sm font-semibold text-[#172033]">{title}</h4>
      <p className="mt-1 max-w-md text-sm text-[#64748B]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function FeedbackAlert({ type, message, onDismiss }) {
  const styles = {
    success: "border-[#BBF7D0] bg-[#F0FDF4] text-[#16803D]",
    error: "border-[#FECACA] bg-[#FEF2F2] text-[#C53030]",
    warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#B7791F]",
    info: "border-[#BFDBFE] bg-[#EFF6FF] text-[#2457A6]",
  }[type];

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={cn(
        "alert-reveal flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium",
        styles
      )}
    >
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup pesan"
          className="rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
