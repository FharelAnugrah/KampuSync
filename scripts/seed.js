import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { hashPassword } from "../src/lib/auth/password.js";
function loadEnvFile(filename) {
    const filepath = join(process.cwd(), filename);
    if (!existsSync(filepath))
        return;
    const lines = readFileSync(filepath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex <= 0)
            continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
            process.env[key] = val;
        }
    }
}
async function run() {
    loadEnvFile(".env.local");
    loadEnvFile(".env");
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("Error: DATABASE_URL is not configured.");
        process.exit(1);
    }
    const pool = new Pool({ connectionString });
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // 1. Academic policies (configurable defaults)
        const defaultPolicies = [
            {
                key: "max_credits_per_semester",
                value: { defaultMax: 24, byIps: [{ minIps: 3.0, max: 24 }, { minIps: 2.5, max: 22 }, { minIps: 2.0, max: 20 }, { minIps: 0, max: 18 }] },
                description: "Batas maksimal SKS per semester berdasarkan IPS sebelumnya",
            },
            {
                key: "grading_scale",
                value: [
                    { letter: "A", minScore: 85, gradePoint: 4.0 },
                    { letter: "A-", minScore: 80, gradePoint: 3.75 },
                    { letter: "B+", minScore: 75, gradePoint: 3.5 },
                    { letter: "B", minScore: 70, gradePoint: 3.0 },
                    { letter: "B-", minScore: 65, gradePoint: 2.75 },
                    { letter: "C+", minScore: 60, gradePoint: 2.5 },
                    { letter: "C", minScore: 55, gradePoint: 2.0 },
                    { letter: "D", minScore: 45, gradePoint: 1.0 },
                    { letter: "E", minScore: 0, gradePoint: 0.0 },
                ],
                description: "Skala konversi nilai angka ke nilai huruf dan bobot mutu",
            },
            {
                key: "qr_attendance_ttl_minutes",
                value: { minutes: 15 },
                description: "Durasi aktif default sesi presensi QR Code (menit)",
            },
            {
                key: "minimum_attendance_percentage",
                value: { percentage: 75 },
                description: "Persentase kehadiran minimum yang disarankan",
            },
            {
                key: "allow_post_publish_grade_edit",
                value: { enabled: true, requireReason: true },
                description: "Kebijakan perubahan nilai setelah publikasi (sebelum status LOCKED)",
            },
        ];
        for (const p of defaultPolicies) {
            await client.query(`INSERT INTO academic_policies (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING`, [p.key, JSON.stringify(p.value), p.description]);
        }
        // Check if demo users already seeded
        const existingAdmin = await client.query("SELECT id FROM users WHERE email = 'admin@kampusync.ac.id' LIMIT 1");
        if (existingAdmin.rowCount && existingAdmin.rowCount > 0) {
            await client.query("COMMIT");
            console.log("Demo data already seeded. Skipping duplicate seed.");
            return;
        }
        const demoPasswordHash = hashPassword("Kampusync123!");
        // 2. Users (synthetic demo accounts)
        const adminUser = await client.query(`INSERT INTO users (email, password_hash, role)
       VALUES ('admin@kampusync.ac.id', $1, 'ADMIN')
       RETURNING id`, [demoPasswordHash]);
        const adminUserId = adminUser.rows[0].id;
        const lecturerUsers = await client.query(`INSERT INTO users (email, password_hash, role)
       VALUES
         ('ahmad.fauzi@kampusync.ac.id', $1, 'LECTURER'),
         ('siti.rahma@kampusync.ac.id', $1, 'LECTURER'),
         ('budi.santoso@kampusync.ac.id', $1, 'LECTURER')
       RETURNING id, email`, [demoPasswordHash]);
        const studentUsers = await client.query(`INSERT INTO users (email, password_hash, role)
       VALUES
         ('nadia.putri@student.kampusync.ac.id', $1, 'STUDENT'),
         ('rizky.pratama@student.kampusync.ac.id', $1, 'STUDENT'),
         ('dewi.lestari@student.kampusync.ac.id', $1, 'STUDENT'),
         ('farhan.hakim@student.kampusync.ac.id', $1, 'STUDENT')
       RETURNING id, email`, [demoPasswordHash]);
        // 3. Faculties & Study Programs
        const fti = await client.query(`INSERT INTO faculties (code, name) VALUES ('FTI', 'Fakultas Teknologi Informasi') RETURNING id`);
        const feb = await client.query(`INSERT INTO faculties (code, name) VALUES ('FEB', 'Fakultas Ekonomi dan Bisnis') RETURNING id`);
        const prodiIf = await client.query(`INSERT INTO study_programs (faculty_id, code, name, degree_level)
       VALUES ($1, 'IF', 'Teknik Informatika', 'S1') RETURNING id`, [fti.rows[0].id]);
        const prodiSi = await client.query(`INSERT INTO study_programs (faculty_id, code, name, degree_level)
       VALUES ($1, 'SI', 'Sistem Informasi', 'S1') RETURNING id`, [fti.rows[0].id]);
        const prodiMn = await client.query(`INSERT INTO study_programs (faculty_id, code, name, degree_level)
       VALUES ($1, 'MN', 'Manajemen', 'S1') RETURNING id`, [feb.rows[0].id]);
        // 4. Lecturers
        const lec1 = await client.query(`INSERT INTO lecturers (user_id, nidn, full_name, phone)
       VALUES ($1, '0012048501', 'Dr. Ahmad Fauzi, S.Kom., M.T.', '081234560001') RETURNING id`, [lecturerUsers.rows[0].id]);
        const lec2 = await client.query(`INSERT INTO lecturers (user_id, nidn, full_name, phone)
       VALUES ($1, '0018098802', 'Siti Rahma, S.Si., M.Cs.', '081234560002') RETURNING id`, [lecturerUsers.rows[1].id]);
        const lec3 = await client.query(`INSERT INTO lecturers (user_id, nidn, full_name, phone)
       VALUES ($1, '0022119003', 'Budi Santoso, S.E., M.M.', '081234560003') RETURNING id`, [lecturerUsers.rows[2].id]);
        // 5. Students (lec1 is Dosen Wali for student 1 & 2; lec2 is Dosen Wali for student 3; lec3 has no advisees)
        const stu1 = await client.query(`INSERT INTO students (user_id, study_program_id, advisor_lecturer_id, nim, full_name, entry_year, phone)
       VALUES ($1, $2, $3, '2024101001', 'Nadia Putri', 2024, '081300010001') RETURNING id`, [studentUsers.rows[0].id, prodiIf.rows[0].id, lec1.rows[0].id]);
        const stu2 = await client.query(`INSERT INTO students (user_id, study_program_id, advisor_lecturer_id, nim, full_name, entry_year, phone)
       VALUES ($1, $2, $3, '2024101002', 'Rizky Pratama', 2024, '081300010002') RETURNING id`, [studentUsers.rows[1].id, prodiIf.rows[0].id, lec1.rows[0].id]);
        const stu3 = await client.query(`INSERT INTO students (user_id, study_program_id, advisor_lecturer_id, nim, full_name, entry_year, phone)
       VALUES ($1, $2, $3, '2024102001', 'Dewi Lestari', 2024, '081300010003') RETURNING id`, [studentUsers.rows[2].id, prodiSi.rows[0].id, lec2.rows[0].id]);
        await client.query(`INSERT INTO students (user_id, study_program_id, advisor_lecturer_id, nim, full_name, entry_year, phone)
       VALUES ($1, $2, $3, '2024201001', 'Farhan Hakim', 2024, '081300010004')`, [studentUsers.rows[3].id, prodiMn.rows[0].id, lec2.rows[0].id]);
        // 6. Courses & Prerequisites
        const cAlg = await client.query(`INSERT INTO courses (study_program_id, code, name, credits, recommended_semester, description)
       VALUES ($1, 'IF101', 'Algoritma dan Pemrograman', 4, 1, 'Dasar pemrograman terstruktur dan pemecahan masalah algoritmik.') RETURNING id`, [prodiIf.rows[0].id]);
        const cStrukdat = await client.query(`INSERT INTO courses (study_program_id, code, name, credits, recommended_semester, description)
       VALUES ($1, 'IF201', 'Struktur Data', 4, 2, 'Implementasi stack, queue, tree, graph, dan analisis kompleksitas.') RETURNING id`, [prodiIf.rows[0].id]);
        const cBasdat = await client.query(`INSERT INTO courses (study_program_id, code, name, credits, recommended_semester, description)
       VALUES ($1, 'IF202', 'Basis Data Relasional', 3, 3, 'Perancangan ER, normalisasi, dan SQL tingkat lanjut.') RETURNING id`, [prodiIf.rows[0].id]);
        const cRpl = await client.query(`INSERT INTO courses (study_program_id, code, name, credits, recommended_semester, description)
       VALUES ($1, 'IF301', 'Rekayasa Perangkat Lunak', 3, 3, 'Siklus hidup pengembangan perangkat lunak, arsitektur, dan pengujian.') RETURNING id`, [prodiIf.rows[0].id]);
        const cWeb = await client.query(`INSERT INTO courses (study_program_id, code, name, credits, recommended_semester, description)
       VALUES ($1, 'IF302', 'Pemrograman Web Modern', 3, 3, 'Pengembangan aplikasi web full-stack berbasis standar modern.') RETURNING id`, [prodiIf.rows[0].id]);
        const cMan = await client.query(`INSERT INTO courses (study_program_id, code, name, credits, recommended_semester, description)
       VALUES ($1, 'SI201', 'Analisis Proses Bisnis', 3, 3, 'Pemodelan dan evaluasi proses bisnis organisasi.') RETURNING id`, [prodiSi.rows[0].id]);
        // Prerequisite: IF201 requires IF101; IF301 requires IF201
        await client.query(`INSERT INTO course_prerequisites (course_id, prerequisite_course_id, minimum_grade)
       VALUES ($1, $2, 'C'), ($3, $1, 'C')`, [cStrukdat.rows[0].id, cAlg.rows[0].id, cRpl.rows[0].id]);
        // 7. Academic Periods (1 past, 1 active with open KRS)
        const pastPeriod = await client.query(`INSERT INTO academic_periods (name, academic_year, term, start_date, end_date, krs_start_at, krs_end_at, is_active)
       VALUES (
         '2025/2026 Genap',
         '2025/2026',
         'GENAP',
         '2026-02-01',
         '2026-06-30',
         '2026-01-15T00:00:00+08:00',
         '2026-02-10T23:59:59+08:00',
         false
       ) RETURNING id`);
        const activePeriod = await client.query(`INSERT INTO academic_periods (name, academic_year, term, start_date, end_date, krs_start_at, krs_end_at, is_active)
       VALUES (
         '2026/2027 Ganjil',
         '2026/2027',
         'GANJIL',
         '2026-08-24',
         '2027-01-15',
         now() - interval '14 days',
         now() + interval '45 days',
         true
       ) RETURNING id`);
        // 8. Past Period Class Offerings + Approved KRS + Published Grades for Nadia (stu1) so prerequisites & KHS work out of the box
        const pastCo1 = await client.query(`INSERT INTO class_offerings (course_id, lecturer_id, academic_period_id, class_code, capacity)
       VALUES ($1, $2, $3, 'A', 40) RETURNING id`, [cAlg.rows[0].id, lec1.rows[0].id, pastPeriod.rows[0].id]);
        const pastCo2 = await client.query(`INSERT INTO class_offerings (course_id, lecturer_id, academic_period_id, class_code, capacity)
       VALUES ($1, $2, $3, 'A', 40) RETURNING id`, [cStrukdat.rows[0].id, lec2.rows[0].id, pastPeriod.rows[0].id]);
        const pastKrsStu1 = await client.query(`INSERT INTO study_plans (student_id, academic_period_id, status, submitted_at, approved_at)
       VALUES ($1, $2, 'APPROVED', '2026-01-20T10:00:00+08:00', '2026-01-21T09:00:00+08:00')
       RETURNING id`, [stu1.rows[0].id, pastPeriod.rows[0].id]);
        await client.query(`INSERT INTO study_plan_details (study_plan_id, class_offering_id, credits_snapshot)
       VALUES ($1, $2, 4), ($1, $3, 4)`, [pastKrsStu1.rows[0].id, pastCo1.rows[0].id, pastCo2.rows[0].id]);
        await client.query(`INSERT INTO krs_approval_histories (study_plan_id, lecturer_id, decision, reason, decided_at)
       VALUES ($1, $2, 'APPROVED', 'Memenuhi prasyarat dan batas SKS.', '2026-01-21T09:00:00+08:00')`, [pastKrsStu1.rows[0].id, lec1.rows[0].id]);
        await client.query(`INSERT INTO grades (student_id, class_offering_id, final_score, letter_grade, publication_status, published_at)
       VALUES
         ($1, $2, 88.50, 'A', 'PUBLISHED', '2026-06-25T14:00:00+08:00'),
         ($1, $3, 82.00, 'A-', 'PUBLISHED', '2026-06-25T14:00:00+08:00')`, [stu1.rows[0].id, pastCo1.rows[0].id, pastCo2.rows[0].id]);
        // 9. Active Period Class Offerings & Schedules
        const actBasdat = await client.query(`INSERT INTO class_offerings (course_id, lecturer_id, academic_period_id, class_code, capacity)
       VALUES ($1, $2, $3, 'A', 35) RETURNING id`, [cBasdat.rows[0].id, lec1.rows[0].id, activePeriod.rows[0].id]);
        const actRpl = await client.query(`INSERT INTO class_offerings (course_id, lecturer_id, academic_period_id, class_code, capacity)
       VALUES ($1, $2, $3, 'A', 35) RETURNING id`, [cRpl.rows[0].id, lec1.rows[0].id, activePeriod.rows[0].id]);
        const actWeb = await client.query(`INSERT INTO class_offerings (course_id, lecturer_id, academic_period_id, class_code, capacity)
       VALUES ($1, $2, $3, 'A', 30) RETURNING id`, [cWeb.rows[0].id, lec2.rows[0].id, activePeriod.rows[0].id]);
        const actMan = await client.query(`INSERT INTO class_offerings (course_id, lecturer_id, academic_period_id, class_code, capacity)
       VALUES ($1, $2, $3, 'A', 40) RETURNING id`, [cMan.rows[0].id, lec3.rows[0].id, activePeriod.rows[0].id]);
        const actStrukdat = await client.query(`INSERT INTO class_offerings (course_id, lecturer_id, academic_period_id, class_code, capacity)
       VALUES ($1, $2, $3, 'B', 30) RETURNING id`, [cStrukdat.rows[0].id, lec2.rows[0].id, activePeriod.rows[0].id]);
        await client.query(`INSERT INTO schedules (class_offering_id, day_of_week, start_time, end_time, room)
       VALUES
         ($1, 1, '08:00', '10:30', 'Lab Basis Data 1'),
         ($2, 2, '10:30', '13:00', 'Ruang Kuliah 302'),
         ($3, 3, '13:30', '16:00', 'Lab Pemrograman 2'),
         ($4, 4, '08:00', '10:30', 'Ruang Kuliah 201'),
         ($5, 5, '09:00', '11:30', 'Ruang Kuliah 305')`, [actBasdat.rows[0].id, actRpl.rows[0].id, actWeb.rows[0].id, actMan.rows[0].id, actStrukdat.rows[0].id]);
        // 10. Active Period KRS:
        // - Nadia (stu1): APPROVED for Basdat & RPL (so lecturer attendance & grades work immediately)
        // - Rizky (stu2): SUBMITTED for Basdat & Web (so Dosen Wali approval queue has an item)
        const actKrsStu1 = await client.query(`INSERT INTO study_plans (student_id, academic_period_id, status, submitted_at, approved_at)
       VALUES ($1, $2, 'APPROVED', now() - interval '3 days', now() - interval '2 days')
       RETURNING id`, [stu1.rows[0].id, activePeriod.rows[0].id]);
        await client.query(`INSERT INTO study_plan_details (study_plan_id, class_offering_id, credits_snapshot)
       VALUES ($1, $2, 3), ($1, $3, 3)`, [actKrsStu1.rows[0].id, actBasdat.rows[0].id, actRpl.rows[0].id]);
        await client.query(`INSERT INTO krs_approval_histories (study_plan_id, lecturer_id, decision, reason)
       VALUES ($1, $2, 'APPROVED', 'Rencana studi sesuai kurikulum semester 3.')`, [actKrsStu1.rows[0].id, lec1.rows[0].id]);
        const actKrsStu2 = await client.query(`INSERT INTO study_plans (student_id, academic_period_id, status, submitted_at)
       VALUES ($1, $2, 'SUBMITTED', now() - interval '1 day')
       RETURNING id`, [stu2.rows[0].id, activePeriod.rows[0].id]);
        await client.query(`INSERT INTO study_plan_details (study_plan_id, class_offering_id, credits_snapshot)
       VALUES ($1, $2, 3), ($1, $3, 3)`, [actKrsStu2.rows[0].id, actBasdat.rows[0].id, actWeb.rows[0].id]);
        // Default grade components for active Basdat class
        await client.query(`INSERT INTO grade_components (class_offering_id, name, weight)
       VALUES ($1, 'Tugas & Kuis', 30), ($1, 'UTS', 35), ($1, 'UAS', 35)`, [actBasdat.rows[0].id]);
        // Sample closed attendance session for Basdat
        const sess1 = await client.query(`INSERT INTO attendance_sessions (class_offering_id, meeting_number, topic, method, status, opens_at, closes_at, created_by)
       VALUES ($1, 1, 'Pengantar Model Relasional & Normalisasi', 'MANUAL', 'CLOSED', now() - interval '2 days', now() - interval '2 days' + interval '2 hours', $2)
       RETURNING id`, [actBasdat.rows[0].id, lec1.rows[0].id]);
        await client.query(`INSERT INTO attendance_records (attendance_session_id, student_id, attendance_status, recorded_by)
       VALUES ($1, $2, 'PRESENT', $3)`, [sess1.rows[0].id, stu1.rows[0].id, lecturerUsers.rows[0].id]);
        // 11. Announcements, Academic Events & Notifications
        await client.query(`INSERT INTO announcements (title, content, category, created_by)
       VALUES
         ('Pembukaan Masa Pengisian KRS Semester Ganjil 2026/2027', 'Mahasiswa diharapkan berkonsultasi dengan Dosen Wali sebelum mengajukan KRS melalui portal Kampusync.', 'KRS', $1),
         ('Pemutakhiran Kebijakan Presensi QR Code', 'Presensi QR Code aktif selama 15 menit sejak sesi dibuka oleh dosen pengampu. Pastikan kamera atau kode presensi siap saat perkuliahan.', 'AKADEMIK', $1)`, [adminUserId]);
        await client.query(`INSERT INTO academic_events (academic_period_id, title, description, start_date, end_date, event_type)
       VALUES
         ($1, 'Masa Pengisian & Perwalian KRS', 'Pengisian KRS online dan persetujuan oleh Dosen Wali.', CURRENT_DATE - 7, CURRENT_DATE + 14, 'KRS'),
         ($1, 'Perkuliahan Pekan 1–7', 'Perkuliahan paruh pertama sebelum Ujian Tengah Semester.', '2026-09-01', '2026-10-17', 'PERKULIAHAN'),
         ($1, 'Ujian Tengah Semester (UTS)', 'Evaluasi tengah semester seluruh mata kuliah.', '2026-10-19', '2026-10-30', 'UJIAN')`, [activePeriod.rows[0].id]);
        await client.query(`INSERT INTO notifications (user_id, title, message, target_url)
       VALUES
         ($1, 'KRS Mahasiswa Menunggu Persetujuan', 'Rizky Pratama (2024101002) telah mengajukan KRS untuk periode 2026/2027 Ganjil.', '/lecturer/perwalian'),
         ($2, 'KRS Disetujui Dosen Wali', 'KRS Anda pada periode 2026/2027 Ganjil telah disetujui oleh Dr. Ahmad Fauzi, S.Kom., M.T.', '/student/krs')`, [lecturerUsers.rows[0].id, studentUsers.rows[0].id]);
        await client.query("COMMIT");
        console.log("Demo data seeded successfully.");
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
        await pool.end();
    }
}
run().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
