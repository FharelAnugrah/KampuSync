import { z } from "zod";
import { AppError } from "@/lib/http";
import { createAcademicPeriodRepo, createCourseRepo, createFacultyRepo, createStudyProgramRepo, setActiveAcademicPeriodRepo, updateAcademicPeriodKrsWindowRepo, updateCourseRepo, updateFacultyRepo, updateStudyProgramRepo, } from "./master.repository";
export const recordStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const createFacultySchema = z.object({
    code: z.string().trim().min(2, "Kode fakultas minimal 2 karakter.").max(30),
    name: z.string().trim().min(3, "Nama fakultas minimal 3 karakter.").max(150),
});
export const createStudyProgramSchema = z.object({
    facultyId: z.string().uuid("Fakultas tidak valid."),
    code: z.string().trim().min(2, "Kode program studi minimal 2 karakter.").max(30),
    name: z.string().trim().min(3, "Nama program studi minimal 3 karakter.").max(150),
    degreeLevel: z.enum(["D3", "D4", "S1", "S2", "S3", "PROFESSION"]),
});
export const createCourseSchema = z.object({
    studyProgramId: z.string().uuid("Program studi tidak valid."),
    code: z.string().trim().min(2, "Kode mata kuliah minimal 2 karakter.").max(30),
    name: z.string().trim().min(3, "Nama mata kuliah minimal 3 karakter.").max(200),
    credits: z.coerce.number().int().min(1, "SKS harus lebih dari 0.").max(12),
    recommendedSemester: z.coerce.number().int().min(1).max(20).nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    prerequisiteIds: z.array(z.string().uuid()).optional(),
});
export const createPeriodSchema = z.object({
    name: z.string().trim().min(3, "Nama periode wajib diisi.").max(100),
    academicYear: z.string().trim().min(4, "Tahun akademik wajib diisi.").max(20),
    term: z.enum(["GANJIL", "GENAP", "PENDEK"]),
    startDate: z.string().min(1, "Tanggal mulai wajib diisi."),
    endDate: z.string().min(1, "Tanggal selesai wajib diisi."),
    krsStartAt: z.string().nullable().optional(),
    krsEndAt: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
});
function handlePgUniqueError(err, message) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
        throw new AppError(message, 409, "CONFLICT");
    }
    throw err;
}
export async function createFaculty(raw) {
    const input = createFacultySchema.parse(raw);
    try {
        return await createFacultyRepo(input);
    }
    catch (err) {
        handlePgUniqueError(err, "Kode fakultas sudah digunakan.");
    }
}
export async function updateFaculty(id, raw) {
    const input = z
        .object({
        code: z.string().trim().min(2).max(30).optional(),
        name: z.string().trim().min(3).max(150).optional(),
        status: recordStatusSchema.optional(),
    })
        .parse(raw);
    try {
        const updated = await updateFacultyRepo(id, input);
        if (!updated)
            throw new AppError("Fakultas tidak ditemukan.", 404, "NOT_FOUND");
        return updated;
    }
    catch (err) {
        handlePgUniqueError(err, "Kode fakultas sudah digunakan.");
    }
}
export async function createStudyProgram(raw) {
    const input = createStudyProgramSchema.parse(raw);
    try {
        return await createStudyProgramRepo(input);
    }
    catch (err) {
        handlePgUniqueError(err, "Kode program studi sudah digunakan.");
    }
}
export async function updateStudyProgram(id, raw) {
    const input = z
        .object({
        facultyId: z.string().uuid().optional(),
        code: z.string().trim().min(2).max(30).optional(),
        name: z.string().trim().min(3).max(150).optional(),
        degreeLevel: z.enum(["D3", "D4", "S1", "S2", "S3", "PROFESSION"]).optional(),
        status: recordStatusSchema.optional(),
    })
        .parse(raw);
    try {
        const updated = await updateStudyProgramRepo(id, input);
        if (!updated)
            throw new AppError("Program studi tidak ditemukan.", 404, "NOT_FOUND");
        return updated;
    }
    catch (err) {
        handlePgUniqueError(err, "Kode program studi sudah digunakan.");
    }
}
export async function createCourse(raw) {
    const input = createCourseSchema.parse(raw);
    try {
        return await createCourseRepo({
            studyProgramId: input.studyProgramId,
            code: input.code,
            name: input.name,
            credits: input.credits,
            recommendedSemester: input.recommendedSemester ?? null,
            description: input.description ?? null,
            prerequisiteIds: input.prerequisiteIds ?? [],
        });
    }
    catch (err) {
        handlePgUniqueError(err, "Kode mata kuliah sudah ada di program studi tersebut.");
    }
}
export async function updateCourse(id, raw) {
    const input = z
        .object({
        name: z.string().trim().min(3).max(200).optional(),
        credits: z.coerce.number().int().min(1).max(12).optional(),
        recommendedSemester: z.coerce.number().int().min(1).max(20).nullable().optional(),
        description: z.string().trim().max(1000).nullable().optional(),
        status: recordStatusSchema.optional(),
        prerequisiteIds: z.array(z.string().uuid()).optional(),
    })
        .parse(raw);
    if (input.prerequisiteIds?.includes(id)) {
        throw new AppError("Mata kuliah tidak dapat menjadi prasyarat bagi dirinya sendiri.", 400);
    }
    const updated = await updateCourseRepo(id, input);
    if (!updated)
        throw new AppError("Mata kuliah tidak ditemukan.", 404, "NOT_FOUND");
    return updated;
}
export async function createAcademicPeriod(raw) {
    const input = createPeriodSchema.parse(raw);
    if (new Date(input.endDate) <= new Date(input.startDate)) {
        throw new AppError("Tanggal selesai harus setelah tanggal mulai.", 400);
    }
    if (input.krsStartAt && input.krsEndAt && new Date(input.krsEndAt) <= new Date(input.krsStartAt)) {
        throw new AppError("Waktu tutup KRS harus setelah waktu buka KRS.", 400);
    }
    try {
        return await createAcademicPeriodRepo({
            name: input.name,
            academicYear: input.academicYear,
            term: input.term,
            startDate: input.startDate,
            endDate: input.endDate,
            krsStartAt: input.krsStartAt || null,
            krsEndAt: input.krsEndAt || null,
            isActive: Boolean(input.isActive),
        });
    }
    catch (err) {
        handlePgUniqueError(err, "Nama periode akademik sudah ada.");
    }
}
export async function activateAcademicPeriod(id) {
    const updated = await setActiveAcademicPeriodRepo(id);
    if (!updated)
        throw new AppError("Periode akademik tidak ditemukan.", 404, "NOT_FOUND");
    return updated;
}
export async function updateAcademicPeriodKrsWindow(id, raw) {
    const input = z
        .object({
        krsStartAt: z.string().nullable(),
        krsEndAt: z.string().nullable(),
    })
        .parse(raw);
    if (input.krsStartAt && input.krsEndAt && new Date(input.krsEndAt) <= new Date(input.krsStartAt)) {
        throw new AppError("Waktu tutup KRS harus setelah waktu buka KRS.", 400);
    }
    const updated = await updateAcademicPeriodKrsWindowRepo(id, input.krsStartAt, input.krsEndAt);
    if (!updated)
        throw new AppError("Periode akademik tidak ditemukan.", 404, "NOT_FOUND");
    return updated;
}
