import { query } from "@/lib/db/pool";
export const DEFAULT_POLICIES = {
    max_credits_per_semester: {
        defaultMax: 24,
        byIps: [
            { minIps: 3.0, max: 24 },
            { minIps: 2.5, max: 22 },
            { minIps: 2.0, max: 20 },
            { minIps: 0, max: 18 },
        ],
    },
    grading_scale: [
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
    qr_attendance_ttl_minutes: { minutes: 15 },
    minimum_attendance_percentage: { percentage: 75 },
    allow_post_publish_grade_edit: { enabled: true, requireReason: true },
};
export async function getAcademicPolicies() {
    const res = await query(`SELECT key, value FROM academic_policies`);
    const policies = structuredClone(DEFAULT_POLICIES);
    for (const row of res.rows) {
        if (row.key in policies) {
            policies[row.key] = row.value;
        }
    }
    return policies;
}
export async function updateAcademicPolicy(key, value, updatedByUserId) {
    await query(`INSERT INTO academic_policies (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, now())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`, [key, JSON.stringify(value), updatedByUserId]);
}
export function resolveLetterGrade(score, scale = DEFAULT_POLICIES.grading_scale) {
    const sorted = [...scale].sort((a, b) => b.minScore - a.minScore);
    for (const band of sorted) {
        if (score >= band.minScore) {
            return { letter: band.letter, gradePoint: band.gradePoint };
        }
    }
    const last = sorted[sorted.length - 1];
    return last ? { letter: last.letter, gradePoint: last.gradePoint } : { letter: "E", gradePoint: 0 };
}
export function getGradePointForLetter(letter, scale = DEFAULT_POLICIES.grading_scale) {
    if (!letter)
        return 0;
    const found = scale.find((b) => b.letter.toUpperCase() === letter.toUpperCase());
    return found ? found.gradePoint : 0;
}
export function resolveMaxCreditsForIps(previousIps, policy = DEFAULT_POLICIES.max_credits_per_semester) {
    if (previousIps === null || Number.isNaN(previousIps)) {
        return policy.defaultMax;
    }
    const sorted = [...policy.byIps].sort((a, b) => b.minIps - a.minIps);
    for (const tier of sorted) {
        if (previousIps >= tier.minIps) {
            return tier.max;
        }
    }
    return policy.defaultMax;
}
