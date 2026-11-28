import { requirePageUser } from "@/lib/auth/guards";
import { listClassOfferings } from "@/modules/classes/classes.service";
import { PageHeader } from "@/components/layout/page-header";
import { SchedulesClient } from "@/components/admin/schedules-client";
export default async function AdminSchedulesPage() {
    await requirePageUser(["ADMIN"]);
    const classes = await listClassOfferings({});
    return (<div>
      <PageHeader title="Jadwal Perkuliahan" description="Tetapkan hari, jam, dan ruang kelas dengan deteksi bentrok dosen, ruang, dan kelas otomatis." breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Jadwal" }]}/>
      <SchedulesClient classes={classes}/>
    </div>);
}
