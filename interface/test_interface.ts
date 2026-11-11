// Validation + sanitization for every test payload (manual, pasted JSON, AI output).

export const QUESTION_TYPES = ["mcq_single", "mcq_multiple", "true_false", "short_answer", "long_answer"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type Mode = "tutor" | "ai";
export type ConsoleType = "hybrid" | "manual" | "auto";

export const TYPE_LABELS: Record<QuestionType, string> = {
  mcq_single: "Multiple choice (one answer)",
  mcq_multiple: "Multiple choice (many answers)",
  true_false: "True / False",
  short_answer: "Short answer",
  long_answer: "Long answer / essay",
};

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

/** Clean, validated question (what the backend receives). */
export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  explanation: string;
  requiresImage: boolean;
  options?: Option[];
  correctAnswer?: boolean;
  acceptedAnswers?: string[];
  rubric?: string;
}

/** Editable question state used by the manual builder (points may be a string while typing). */
export interface DraftQuestion {
  id: string;
  type: QuestionType;
  text: string;
  points: number | string;
  explanation: string;
  requiresImage: boolean;
  options: Option[];
  correctAnswer: boolean;
  acceptedAnswers: string[];
  rubric: string;
}

export interface TestData {
  title: string;
  description: string;
  durationMinutes: number | null;
  /** ISO 8601 UTC string, or null = never expires. */
  expiresAt: string | null;
  imageSubmission: { enabled: boolean };
  access: Access;
  questions: Question[];
}

/** Who can open the test. restricted=false means anyone with the link. */
export interface Access {
  restricted: boolean;
  usernames: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data: TestData | null;
}

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

const LIM = { title: 200, desc: 2000, q: 2000, opt: 500, expl: 2000, ans: 500, maxQ: 200, maxJsonChars: 1_000_000 };
const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

/** Strips HTML tags and control characters, trims, caps length. */
export const cleanText = (v: unknown, max = 2000): string =>
  typeof v === "string" || typeof v === "number"
    ? String(v)
        .replace(/<[^>]*>/g, "")
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim()
        .slice(0, max)
    : "";

/** JSON.parse that drops prototype-pollution keys and enforces a size limit. */
export function safeParse(text: string): unknown {
  if (!text.trim()) throw new Error("JSON is empty");
  if (text.length > LIM.maxJsonChars) throw new Error("JSON is too large (max ~1 MB)");
  try {
    return JSON.parse(text, (k, v) => (BLOCKED_KEYS.has(k) ? undefined : v));
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`);
  }
}

const toBool = (v: unknown): boolean | null =>
  typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : null;

// ---- Expiry ----
/**
 * Accepts a local "YYYY-MM-DDTHH:mm" string (from <input type="datetime-local">) or any ISO string.
 * Returns an ISO UTC string, or null when empty. Must be in the future.
 */
export function normalizeExpiry(v: unknown): { value: string | null; error?: string } {
  if (v === undefined || v === null || v === "") return { value: null };
  if (typeof v !== "string" && typeof v !== "number") return { value: null, error: "expiresAt must be a date string" };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { value: null, error: "expiresAt is not a valid date" };
  if (d.getTime() <= Date.now()) return { value: null, error: "Expiry must be in the future" };
  return { value: d.toISOString() };
}

// ---- Student access (usernames) ----
// Adjust this pattern to match your real username rules.
export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const MAX_USERNAMES = 500;

/** Trim, drop a leading "@", lowercase. */
export const normalizeUsername = (v: string): string => v.trim().replace(/^@/, "").toLowerCase();

/** Splits on commas, spaces, semicolons and new lines. Returns de-duplicated valid names + rejected entries. */
export function parseUsernames(input: string): { valid: string[]; invalid: string[] } {
  const valid = new Set<string>();
  const invalid: string[] = [];
  for (const part of input.split(/[\s,;]+/)) {
    const u = normalizeUsername(part);
    if (!u) continue;
    if (USERNAME_RE.test(u)) valid.add(u);
    else invalid.push(u.slice(0, 40));
  }
  return { valid: Array.from(valid), invalid };
}

export function normalizeAccess(raw: unknown): { access: Access; errors: string[] } {
  const none: Access = { restricted: false, usernames: [] };
  if (raw === undefined || raw === null) return { access: none, errors: [] };
  if (!isObj(raw)) return { access: none, errors: ['access must look like { "restricted": true, "usernames": ["name1"] }'] };

  const errors: string[] = [];
  const restricted = raw.restricted === true;
  const list: unknown[] = Array.isArray(raw.usernames) ? raw.usernames : [];
  const { valid, invalid } = parseUsernames(list.filter((x): x is string => typeof x === "string").join(","));

  if (invalid.length) {
    errors.push(`Invalid username(s): ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? "…" : ""} (use 3–32 letters, numbers, . _ -)`);
  }
  if (valid.length > MAX_USERNAMES) errors.push(`Too many usernames (max ${MAX_USERNAMES})`);
  if (restricted && valid.length === 0) {
    errors.push("Restricted access needs at least one student username (or choose “Anyone with the link”)");
  }
  return { access: { restricted, usernames: restricted ? valid.slice(0, MAX_USERNAMES) : [] }, errors };
}

export function normalizeQuestion(
  raw: unknown,
  idx: number,
  imageEnabled: boolean
): { q: Question | null; errors: string[] } {
  const label = `Question ${idx + 1}`;
  if (!isObj(raw)) return { q: null, errors: [`${label}: must be an object`] };

  const errors: string[] = [];
  const type = QUESTION_TYPES.find((t) => t === raw.type);
  if (!type) errors.push(`${label}: type must be one of ${QUESTION_TYPES.join(", ")}`);

  const text = cleanText(raw.text ?? raw.question, LIM.q);
  if (!text) errors.push(`${label}: question text is required`);
  if (!type) return { q: null, errors };

  const pts = Number(raw.points);
  const q: Question = {
    id: cleanText(raw.id, 64) || uid(),
    type,
    text,
    points: Number.isFinite(pts) && pts > 0 ? Math.min(pts, 100) : 1,
    explanation: cleanText(raw.explanation, LIM.expl),
    requiresImage: imageEnabled ? raw.requiresImage === true : false,
  };

  if (type === "mcq_single" || type === "mcq_multiple") {
    const src: unknown[] = Array.isArray(raw.options) ? raw.options.slice(0, 10) : [];
    q.options = src
      .map((o): Raw => (typeof o === "string" ? { text: o } : isObj(o) ? o : {}))
      .map((o) => ({ id: cleanText(o.id, 64) || uid(), text: cleanText(o.text, LIM.opt), isCorrect: o.isCorrect === true }))
      .filter((o) => o.text);
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (q.options.length < 2) errors.push(`${label}: needs at least 2 options`);
    if (type === "mcq_single" && correct !== 1) errors.push(`${label}: exactly 1 correct option required`);
    if (type === "mcq_multiple" && correct < 1) errors.push(`${label}: at least 1 correct option required`);
  } else if (type === "true_false") {
    const b = toBool(raw.correctAnswer);
    if (b === null) errors.push(`${label}: correctAnswer must be true or false`);
    else q.correctAnswer = b;
  } else if (type === "short_answer") {
    const a: unknown[] = Array.isArray(raw.acceptedAnswers) ? raw.acceptedAnswers : [raw.acceptedAnswers ?? raw.correctAnswer];
    q.acceptedAnswers = a.map((x) => cleanText(x, LIM.ans)).filter(Boolean).slice(0, 10);
    if (!q.acceptedAnswers.length) errors.push(`${label}: at least 1 accepted answer required`);
  } else {
    q.rubric = cleanText(raw.rubric, LIM.expl);
  }
  return { q, errors };
}

/** Accepts an array of questions OR { title, description, questions, ... }. */
export function validateTest(raw: unknown): ValidationResult {
  const obj: Raw | null = Array.isArray(raw) ? { questions: raw } : isObj(raw) ? raw : null;
  if (!obj) return { ok: false, errors: ["Test must be a JSON object or an array of questions"], data: null };

  const errors: string[] = [];
  const is = obj.imageSubmission;
  const imageEnabled = is === true || (isObj(is) && is.enabled === true);

  const title = cleanText(obj.title, LIM.title);
  if (!title) errors.push("Test title is required");
  const dur = Number(obj.durationMinutes);
  const acc = normalizeAccess(obj.access);
  errors.push(...acc.errors);
  const exp = normalizeExpiry(obj.expiresAt);
  if (exp.error) errors.push(exp.error);

  const list: unknown[] = Array.isArray(obj.questions) ? obj.questions : [];
  if (!list.length) errors.push("At least 1 question is required");
  if (list.length > LIM.maxQ) errors.push(`Too many questions (max ${LIM.maxQ})`);

  const questions: Question[] = [];
  list.slice(0, LIM.maxQ).forEach((r, i) => {
    const res = normalizeQuestion(r, i, imageEnabled);
    errors.push(...res.errors);
    if (res.q) questions.push(res.q);
  });

  const data: TestData = {
    title,
    description: cleanText(obj.description, LIM.desc),
    durationMinutes: Number.isFinite(dur) && dur > 0 ? Math.min(Math.round(dur), 1440) : null,
    expiresAt: exp.value,
    imageSubmission: { enabled: imageEnabled },
    access: acc.access,
    questions,
  };
  return { ok: errors.length === 0, errors, data };
}

/**
 * Pass a `seed` when creating state during render (e.g. useState initial value) so the ids are
 * deterministic and identical on server and client. Without a seed, random ids are used —
 * only do that inside event handlers.
 */
export const emptyQuestion = (type: QuestionType = "mcq_single", seed?: string): DraftQuestion => {
  const id = (suffix: string): string => (seed ? `${seed}-${suffix}` : uid());
  return {
    id: id("q"),
    type,
    text: "",
    points: 1,
    explanation: "",
    requiresImage: false,
    options: [
      { id: id("o1"), text: "", isCorrect: false },
      { id: id("o2"), text: "", isCorrect: false },
    ],
    correctAnswer: true,
    acceptedAnswers: [""],
    rubric: "",
  };
};