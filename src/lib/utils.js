import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function formatDayName(day) {
    const names = {
        1: "Senin",
        2: "Selasa",
        3: "Rabu",
        4: "Kamis",
        5: "Jumat",
        6: "Sabtu",
        7: "Minggu",
    };
    return names[day] ?? `Hari ${day}`;
}
export function formatTimeRange(start, end) {
    return `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
}
export function formatDateTimeID(value) {
    if (!value)
        return "—";
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime()))
        return "—";
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Makassar",
    }).format(d);
}
export function formatDateID(value) {
    if (!value)
        return "—";
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime()))
        return "—";
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeZone: "Asia/Makassar",
    }).format(d);
}
