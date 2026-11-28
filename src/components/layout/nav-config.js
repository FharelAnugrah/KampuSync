export function getNavGroupsForUser(user) {
    if (user.role === "STUDENT") {
        return [
            {
                items: [{ label: "Beranda", href: "/student", icon: "home" }],
            },
            {
                title: "Akademik",
                items: [
                    { label: "Kartu Rencana Studi (KRS)", href: "/student/krs", icon: "clipboard" },
                    { label: "Jadwal Kuliah", href: "/student/schedule", icon: "clock" },
                    { label: "Presensi", href: "/student/attendance", icon: "qr" },
                    { label: "Nilai", href: "/student/grades", icon: "award" },
                    { label: "Kartu Hasil Studi (KHS)", href: "/student/khs", icon: "file" },
                ],
            },
            {
                title: "Informasi",
                items: [
                    { label: "Kalender Akademik", href: "/student/calendar", icon: "calendar" },
                    { label: "Pengumuman", href: "/student/announcements", icon: "megaphone" },
                ],
            },
            {
                items: [{ label: "Profil", href: "/profile", icon: "user" }],
            },
        ];
    }
    if (user.role === "LECTURER") {
        const groups = [
            {
                items: [{ label: "Beranda", href: "/lecturer", icon: "home" }],
            },
            {
                title: "Pengajaran",
                items: [
                    { label: "Kelas Saya", href: "/lecturer/classes", icon: "layers" },
                    { label: "Jadwal Mengajar", href: "/lecturer/schedule", icon: "clock" },
                    { label: "Presensi", href: "/lecturer/attendance", icon: "qr" },
                    { label: "Pengelolaan Nilai", href: "/lecturer/grades", icon: "award" },
                ],
            },
        ];
        if ((user.lecturer?.adviseeCount ?? 0) > 0) {
            groups.push({
                title: "Perwalian",
                items: [
                    { label: "Persetujuan KRS", href: "/lecturer/perwalian", icon: "clipboard" },
                ],
            });
        }
        groups.push({
            items: [{ label: "Profil", href: "/profile", icon: "user" }],
        });
        return groups;
    }
    // ADMIN
    return [
        {
            items: [{ label: "Dashboard", href: "/admin", icon: "home" }],
        },
        {
            title: "Data Akademik",
            items: [
                { label: "Fakultas", href: "/admin/faculties", icon: "building" },
                { label: "Program Studi", href: "/admin/study-programs", icon: "layers" },
                { label: "Mahasiswa", href: "/admin/students", icon: "users" },
                { label: "Dosen", href: "/admin/lecturers", icon: "user" },
                { label: "Mata Kuliah", href: "/admin/courses", icon: "book" },
                { label: "Periode Akademik", href: "/admin/periods", icon: "calendar" },
            ],
        },
        {
            title: "Operasional",
            items: [
                { label: "Kelas Perkuliahan", href: "/admin/classes", icon: "layers" },
                { label: "Jadwal", href: "/admin/schedules", icon: "clock" },
                { label: "KRS", href: "/admin/krs", icon: "clipboard" },
            ],
        },
        {
            items: [
                { label: "Laporan", href: "/admin/reports", icon: "chart" },
                { label: "Pengaturan", href: "/admin/settings", icon: "settings" },
            ],
        },
    ];
}
