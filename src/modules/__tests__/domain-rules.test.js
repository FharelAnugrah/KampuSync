import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSessionToken, verifySessionToken } from "@/lib/auth/session-token";
import { slotsOverlap } from "@/lib/schedule-utils";
import { validateStudyPlanRules } from "@/modules/study-plans/study-plan.service";
import { evaluateQrCheckIn, hashAttendanceToken } from "@/modules/attendance/attendance.service";
import { computeWeightedFinalScore } from "@/modules/grades/grades.service";
import { DEFAULT_POLICIES, resolveLetterGrade, resolveMaxCreditsForIps, } from "@/modules/policies/policy.service";
describe("Password & Session Security (NFR-001)", () => {
    it("hashes and verifies passwords safely without plaintext storage", () => {
        const hash = hashPassword("Kampusync123!");
        expect(hash.startsWith("scrypt$")).toBe(true);
        expect(hash).not.toContain("Kampusync123!");
        expect(verifyPassword("Kampusync123!", hash)).toBe(true);
        expect(verifyPassword("WrongPassword", hash)).toBe(false);
    });
    it("signs, verifies, and rejects tampered or expired session tokens", async () => {
        const token = await signSessionToken({ userId: "user-1", role: "STUDENT" }, 300);
        const verified = await verifySessionToken(token);
        expect(verified?.userId).toBe("user-1");
        expect(verified?.role).toBe("STUDENT");
        const tampered = `${token}tamper`;
        expect(await verifySessionToken(tampered)).toBeNull();
        const expired = await signSessionToken({ userId: "user-1", role: "ADMIN" }, -10);
        expect(await verifySessionToken(expired)).toBeNull();
    });
});
describe("Schedule Conflict Detection (FR-010)", () => {
    it("detects overlapping intervals and ignores touching boundaries", () => {
        expect(slotsOverlap({ dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }, { dayOfWeek: 1, startTime: "09:30", endTime: "11:00" })).toBe(true);
        expect(slotsOverlap({ dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }, { dayOfWeek: 1, startTime: "10:00", endTime: "12:00" })).toBe(false);
        expect(slotsOverlap({ dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }, { dayOfWeek: 2, startTime: "08:00", endTime: "10:00" })).toBe(false);
    });
});
describe("KRS Validation Rules (FR-013)", () => {
    const baseOffering = (overrides = {}) => ({
        id: "off-1",
        courseId: "crs-1",
        courseCode: "IF202",
        courseName: "Basis Data",
        classCode: "A",
        credits: 3,
        capacity: 30,
        enrolledCount: 10,
        academicPeriodId: "per-1",
        status: "ACTIVE",
        schedules: [{ dayOfWeek: 1, startTime: "08:00", endTime: "10:30" }],
        prerequisites: [],
        ...overrides,
    });
    const baseInput = () => ({
        targetPeriodId: "per-1",
        krsStartAt: new Date("2026-08-01T00:00:00Z"),
        krsEndAt: new Date("2026-08-30T23:59:59Z"),
        now: new Date("2026-08-10T10:00:00Z"),
        maxCredits: 24,
        selectedOfferings: [baseOffering()],
        passedCourseGrades: new Map(),
        gradingScale: DEFAULT_POLICIES.grading_scale,
    });
    it("passes valid selection", () => {
        const issues = validateStudyPlanRules(baseInput());
        expect(issues).toHaveLength(0);
    });
    it("rejects closed KRS window", () => {
        const input = baseInput();
        input.now = new Date("2026-09-05T10:00:00Z");
        const issues = validateStudyPlanRules(input);
        expect(issues.some((i) => i.code === "KRS_WINDOW_CLOSED")).toBe(true);
    });
    it("rejects missing prerequisite and low prerequisite grade", () => {
        const input = baseInput();
        input.selectedOfferings = [
            baseOffering({
                prerequisites: [
                    { prerequisiteCourseId: "crs-pre", code: "IF101", name: "Algoritma", minimumGrade: "C" },
                ],
            }),
        ];
        expect(validateStudyPlanRules(input).some((i) => i.code === "PREREQUISITE_NOT_MET")).toBe(true);
        input.passedCourseGrades.set("crs-pre", "D");
        expect(validateStudyPlanRules(input).some((i) => i.code === "PREREQUISITE_GRADE_LOW")).toBe(true);
        input.passedCourseGrades.set("crs-pre", "B");
        expect(validateStudyPlanRules(input)).toHaveLength(0);
    });
    it("rejects duplicate course, full capacity, schedule overlap, and credit overflow", () => {
        const input = baseInput();
        input.maxCredits = 5;
        input.selectedOfferings = [
            baseOffering({ id: "off-1", courseId: "crs-1", credits: 3 }),
            baseOffering({
                id: "off-2",
                courseId: "crs-2",
                courseCode: "IF301",
                classCode: "A",
                credits: 3,
                capacity: 10,
                enrolledCount: 10,
                schedules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "11:00" }],
            }),
        ];
        const codes = validateStudyPlanRules(input).map((i) => i.code);
        expect(codes).toContain("CAPACITY_FULL");
        expect(codes).toContain("SCHEDULE_CONFLICT");
        expect(codes).toContain("CREDIT_LIMIT_EXCEEDED");
    });
});
describe("QR Attendance Validation (FR-019, FR-020)", () => {
    const tokenHash = hashAttendanceToken("secret-token-123");
    const codeHash = hashAttendanceToken("7K9M2P");
    const validBase = () => ({
        sessionStatus: "OPEN",
        opensAt: new Date("2026-08-10T08:00:00Z"),
        closesAt: new Date("2026-08-10T08:15:00Z"),
        now: new Date("2026-08-10T08:05:00Z"),
        qrTokenHash: tokenHash,
        fallbackCodeHash: codeHash,
        submittedTokenOrCode: "secret-token-123",
        isEnrolled: true,
        alreadyRecorded: false,
    });
    it("accepts valid QR token or case-insensitive fallback code", () => {
        expect(() => evaluateQrCheckIn(validBase())).not.toThrow();
        expect(() => evaluateQrCheckIn({ ...validBase(), submittedTokenOrCode: "7k9m2p" })).not.toThrow();
    });
    it("rejects non-enrolled, expired, closed, duplicate, or invalid token", () => {
        expect(() => evaluateQrCheckIn({ ...validBase(), isEnrolled: false })).toThrow();
        expect(() => evaluateQrCheckIn({ ...validBase(), now: new Date("2026-08-10T08:20:00Z") })).toThrow();
        expect(() => evaluateQrCheckIn({ ...validBase(), sessionStatus: "CLOSED" })).toThrow();
        expect(() => evaluateQrCheckIn({ ...validBase(), alreadyRecorded: true })).toThrow();
        expect(() => evaluateQrCheckIn({ ...validBase(), submittedTokenOrCode: "WRONG" })).toThrow();
    });
});
describe("Grade & Policy Calculations (FR-023, FR-026)", () => {
    it("computes weighted scores, letter grades, and IPS credit limits", () => {
        const score = computeWeightedFinalScore([
            { id: "c1", weight: 30 },
            { id: "c2", weight: 35 },
            { id: "c3", weight: 35 },
        ], { c1: 90, c2: 80, c3: 86 });
        expect(score).toBe(85.1);
        expect(resolveLetterGrade(score).letter).toBe("A");
        expect(resolveMaxCreditsForIps(3.4)).toBe(24);
        expect(resolveMaxCreditsForIps(2.2)).toBe(20);
    });
});
