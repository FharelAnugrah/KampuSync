import { requirePageUser } from "@/lib/auth/guards";
import { listPublishedAnnouncements } from "@/modules/portal/portal.service";
import { formatDateTimeID } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
export default async function StudentAnnouncementsPage() {
    await requirePageUser(["STUDENT", "LECTURER", "ADMIN"]);
    const announcements = await listPublishedAnnouncements();
    return (<div>
      <PageHeader title="Pengumuman" description="Informasi dan pengumuman resmi akademik Kampusync." breadcrumbs={[{ label: "Beranda", href: "/student" }, { label: "Pengumuman" }]}/>

      {announcements.length === 0 ? (<EmptyState title="Belum ada pengumuman" description="Belum ada pengumuman yang dipublikasikan."/>) : (<div className="space-y-4">
          {announcements.map((a) => (<Card key={a.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{a.title}</CardTitle>
                <Badge variant="info">{a.category}</Badge>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#475569]">
                  {a.content}
                </p>
                <p className="mt-3 text-xs text-[#64748B]">
                  Diterbitkan {formatDateTimeID(a.published_at)}
                </p>
              </CardContent>
            </Card>))}
        </div>)}
    </div>);
}
