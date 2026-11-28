import { z } from "zod";
import { requireApiUser } from "@/lib/auth/guards";
import { jsonError, jsonOk } from "@/lib/http";
import { listUserNotifications, markNotificationRead } from "@/modules/portal/portal.service";

const schema = z.object({
  notificationId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const items = await listUserNotifications(user.id);
    return jsonOk({
      items: items.slice(0, 6),
      unreadCount: user.unreadNotifications,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req) {
  try {
    const user = await requireApiUser();
    const { notificationId } = schema.parse(await req.json());
    await markNotificationRead(user.id, notificationId);
    return jsonOk({ updated: true });
  } catch (err) {
    return jsonError(err);
  }
}
