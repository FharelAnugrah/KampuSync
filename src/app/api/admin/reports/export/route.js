import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";
import { getAdminReportsSummary } from "@/modules/reports/reports.service";
function escapeCsv(val) {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}
export async function GET(req) {
    try {
        await requireApiUser(["ADMIN"]);
        const url = new URL(req.url);
        const periodId = url.searchParams.get("academicPeriodId") ?? undefined;
        const summary = await getAdminReportsSummary(periodId);
        const lines = [
            "Laporan Statistik Program Studi",
            "Fakultas,Kode Prodi,Program Studi,Jenjang,Mahasiswa Aktif,Mahasiswa Nonaktif,Mata Kuliah Aktif",
            ...summary.programStats.map((p) => [
                p.faculty_name,
                p.program_code,
                p.program_name,
                p.degree_level,
                p.active_students,
                p.inactive_students,
                p.active_courses,
            ]
                .map(escapeCsv)
                .join(",")),
            "",
            "Rekap Presensi Kelas",
            "Kode MK,Mata Kuliah,Kelas,Total Sesi,Hadir,Izin,Sakit,Alpa",
            ...summary.attendanceSummary.map((a) => [
                a.course_code,
                a.course_name,
                a.class_code,
                a.total_sessions,
                a.present_count,
                a.excused_count,
                a.sick_count,
                a.absent_count,
            ]
                .map(escapeCsv)
                .join(",")),
        ];
        return new NextResponse(lines.join("\r\n"), {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="kampusync-laporan-akademik.csv"',
            },
        });
    }
    catch (err) {
        return jsonError(err);
    }
}
