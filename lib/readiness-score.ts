export type ReadinessProfile = { homeAllowed?: string; household?: string; absence?: number; careMinutes?: number; safety?: string; longAbsence?: string; monthlyBudget?: number; emergencyFund?: number };

const legacyAnswers = [1, 2, 1, 2, 1, 1, 1, 1, 1, 1];
const chapterAnswers = [1, 1, 2, 2];
const readinessAnswers = [0, 1, 0, 2, 1, 2, 0, 1, 0, 2, 1, 0, 0, 2, 2, 0, 1];
export function educationScore(submitted: unknown) { const values = Array.isArray(submitted) ? submitted.map(Number) : []; const answers = values.length === chapterAnswers.length ? chapterAnswers : values.length === readinessAnswers.length ? readinessAnswers : legacyAnswers; return Math.round(answers.reduce((score, answer, index) => score + (values[index] === answer ? 1 : 0), 0) / answers.length * 100); }
export function readinessScore(species: "cat" | "dog", profile: ReadinessProfile) { return Math.max(35, Math.min(98, 50 + (profile.homeAllowed === "yes" ? 10 : -12) + (profile.household === "yes" ? 8 : -5) + (Number(profile.absence) <= 6 ? 9 : Number(profile.absence) <= 9 ? 3 : -7) + (Number(profile.careMinutes) >= (species === "dog" ? 90 : 45) ? 8 : 2) + (profile.safety === "ready" ? 7 : 0) + (profile.longAbsence === "ready" ? 5 : 0) + (Number(profile.monthlyBudget) >= (species === "dog" ? 200000 : 150000) ? 6 : 1) + (Number(profile.emergencyFund) >= 1000000 ? 5 : 1))); }
