import { requirePageUser } from "@/lib/auth/guards";
import { getStudentKhsReport } from "@/modules/khs/khs.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { KhsClient } from "@/components/student/khs-client";
export default async function StudentKhsPage({ searchParams, }) {
    const user = await requirePageUser(["STUDENT"]);
    const student = user.student;
    const params = await searchParams;
    const khs = await getStudentKhsReport(student.id, params.periodId);
    return (<div>
      <PageHeader title="Kartu Hasil Studi (KHS)" description="Ringkasan hasil studi, IPS, dan IPK berdasarkan nilai yang telah diterbitkan." breadcrumbs={[{ label: "Beranda", href: "/student" }, { label: "KHS" }]}/>
      {!khs.selectedPeriodId ? (<EmptyState title="Belum ada riwayat KHS" description="KHS tersedia setelah Anda memiliki KRS yang disetujui pada suatu periode akademik."/>) : (<KhsClient studentName={user.fullName} nim={student.nim} studyProgramName={student.studyProgramName} periods={khs.periods} selectedPeriodId={khs.selectedPeriodId} items={khs.items} totalCredits={khs.totalCredits} publishedCredits={khs.publishedCredits} ips={khs.ips} ipk={khs.ipk} hasUnpublishedGrades={khs.hasUnpublishedGrades}/>)}
    </div>);
}
