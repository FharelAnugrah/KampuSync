import { z } from "zod";
import { query } from "@/lib/db/pool";
export async function listUserNotifications(userId) {
    const res = await query(`SELECT id, user_id, title, message, target_url, is_read, created_at::text, read_at::text
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`, [userId]);
    return res.rows;
}
export async function markNotificationRead(userId, notificationId) {
    if (notificationId) {
        await query(`UPDATE notifications
       SET is_read = true, read_at = now()
       WHERE id = $1 AND user_id = $2`, [notificationId, userId]);
    }
    else {
        await query(`UPDATE notifications
       SET is_read = true, read_at = now()
       WHERE user_id = $1 AND is_read = false`, [userId]);
    }
}
export async function listPublishedAnnouncements() {
    const res = await query(`SELECT id, title, content, category, is_published, published_at::text
     FROM announcements
     WHERE is_published = true
     ORDER BY published_at DESC
     LIMIT 30`);
    return res.rows;
}
export async function createAnnouncement(userId, raw) {
    const input = z
        .object({
        title: z.string().trim().min(3).max(200),
        content: z.string().trim().min(5).max(4000),
        category: z.string().trim().min(2).max(40).default("AKADEMIK"),
    })
        .parse(raw);
    const res = await query(`INSERT INTO announcements (title, content, category, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`, [input.title, input.content, input.category.toUpperCase(), userId]);
    return res.rows[0];
}
export async function listAcademicEvents() {
    const res = await query(`SELECT
       ae.id, ae.academic_period_id, ap.name AS period_name,
       ae.title, ae.description,
       ae.start_date::text, ae.end_date::text, ae.event_type
     FROM academic_events ae
     LEFT JOIN academic_periods ap ON ap.id = ae.academic_period_id
     ORDER BY ae.start_date ASC`);
    return res.rows;
}
export async function createAcademicEvent(raw) {
    const input = z
        .object({
        academicPeriodId: z.string().uuid().nullable().optional(),
        title: z.string().trim().min(3).max(200),
        description: z.string().trim().max(1000).nullable().optional(),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        eventType: z.string().trim().min(2).max(40).default("AKADEMIK"),
    })
        .parse(raw);
    const res = await query(`INSERT INTO academic_events (academic_period_id, title, description, start_date, end_date, event_type)
     VALUES ($1, $2, $3, $4::date, $5::date, $6)
     RETURNING *`, [
        input.academicPeriodId ?? null,
        input.title,
        input.description ?? null,
        input.startDate,
        input.endDate,
        input.eventType.toUpperCase(),
    ]);
    return res.rows[0];
}
