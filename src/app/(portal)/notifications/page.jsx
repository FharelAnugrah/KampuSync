import { requirePageUser } from "@/lib/auth/guards";
import { listUserNotifications } from "@/modules/portal/portal.service";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationsClient } from "@/components/shared/notifications-client";
export default async function NotificationsPage() {
    const user = await requirePageUser();
    const items = await listUserNotifications(user.id);
    return (<div>
      <PageHeader title="Notifikasi" description="Pemberitahuan aktivitas KRS, perwalian, dan publikasi nilai Anda."/>
      <NotificationsClient items={items}/>
    </div>);
}
