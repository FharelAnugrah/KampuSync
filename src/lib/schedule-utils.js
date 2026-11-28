/**
 * Parses a PostgreSQL time string ("HH:MM" or "HH:MM:SS") to minutes since midnight.
 */
export function timeToMinutes(time) {
    const [hStr = "0", mStr = "0"] = time.split(":");
    return Number(hStr) * 60 + Number(mStr);
}
/**
 * Returns true if two schedule time slots overlap on the same day.
 * Touching boundaries (e.g., 08:00-10:00 and 10:00-12:00) do NOT conflict.
 */
export function slotsOverlap(a, b) {
    if (a.dayOfWeek !== b.dayOfWeek)
        return false;
    const startA = timeToMinutes(a.startTime);
    const endA = timeToMinutes(a.endTime);
    const startB = timeToMinutes(b.startTime);
    const endB = timeToMinutes(b.endTime);
    return startA < endB && startB < endA;
}
