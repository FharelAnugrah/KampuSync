import { Calendar } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { listAcademicEvents } from "@/modules/portal/portal.service";
import { formatDateID } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
export default async function StudentCalendarPage() {
    await requirePageUser(["STUDENT", "LECTURER", "ADMIN"]);
    const events = await listAcademicEvents();
    return (<div>
      <PageHeader title="Kalender Akademik" description="Jadwal kegiatan akademik penting universitas dan tenggat KRS." breadcrumbs={[{ label: "Beranda", href: "/student" }, { label: "Kalender Akademik" }]}/>

      {events.length === 0 ? (<EmptyState title="Belum ada agenda kalender" description="Kalender akademik belum ditambahkan."/>) : (<div className="space-y-3">
          {events.map((ev) => (<Card key={ev.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">{ev.event_type}</Badge>
                    {ev.period_name ? (<span className="text-xs text-[#64748B]">{ev.period_name}</span>) : null}
                  </div>
                  <h3 className="font-semibold text-[#172033]">{ev.title}</h3>
                  {ev.description ? <p className="text-sm text-[#475569]">{ev.description}</p> : null}
                </div>
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#172033]">
                  <Calendar className="h-3.5 w-3.5 text-[#2457A6]"/>
                  {formatDateID(ev.start_date)} – {formatDateID(ev.end_date)}
                </div>
              </CardContent>
            </Card>))}
        </div>)}
    </div>);
}
