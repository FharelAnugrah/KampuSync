import { requirePageUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/feedback";
export default async function ProfilePage() {
    const user = await requirePageUser();
    return (<div className="space-y-6">
      <PageHeader title="Profil Pengguna" description="Informasi akun dan identitas akademik Anda pada portal Kampusync."/>

      <Card className="max-w-2xl">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{user.fullName}</CardTitle>
          <StatusBadge status={user.isActive ? "ACTIVE" : "INACTIVE"}/>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-[#64748B]">Email Institusi</p>
            <p className="font-medium text-[#172033]">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748B]">Peran Akun</p>
            <p className="font-medium text-[#172033]">{user.role}</p>
          </div>

          {user.student ? (<>
              <div>
                <p className="text-xs text-[#64748B]">NIM</p>
                <p className="font-medium text-[#172033]">{user.student.nim}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Angkatan</p>
                <p className="font-medium text-[#172033]">{user.student.entryYear}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Program Studi</p>
                <p className="font-medium text-[#172033]">
                  {user.student.studyProgramName} ({user.student.facultyName})
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Dosen Wali</p>
                <p className="font-medium text-[#172033]">
                  {user.student.advisorName ?? "Belum ditetapkan"}
                </p>
              </div>
            </>) : null}

          {user.lecturer ? (<>
              <div>
                <p className="text-xs text-[#64748B]">NIDN</p>
                <p className="font-medium text-[#172033]">{user.lecturer.nidn ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Mahasiswa Bimbingan Aktif</p>
                <p className="font-medium text-[#172033]">{user.lecturer.adviseeCount} mahasiswa</p>
              </div>
            </>) : null}
        </CardContent>
      </Card>
    </div>);
}
