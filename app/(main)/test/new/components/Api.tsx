import type { Access, ConsoleType, Mode, TestData } from "@/interface/test_interface";

// Adjust these URLs to match your backend.
const ENDPOINTS = {
  createTest: "/api/tests",
  aiGenerate: "/api/tests?isAi=true", // receives AiPayload — you handle it
  aiEnhance: "/api/ai/enhance", // receives EnhancePayload -> { text }
} as const;

/** POST /api/tests — `test` is already validated + sanitized (includes expiresAt). */
export interface TestPayload {
  mode: Mode;
  console: ConsoleType;
  source: "manual" | "json";
  test: TestData;
}

/** POST /api/tests?isAi=true */
export interface AiPayload {
  mode: Mode;
  console: ConsoleType;
  source: "ai_prompt";
  prompt: string;
  imageSubmission: { enabled: boolean };
  access: Access;
  /** ISO 8601 UTC string, or null = never expires. */
  expiresAt: string | null;
}

/** POST /api/ai/enhance -> { text } */
export interface EnhancePayload {
  text: string;
  field: string;
  context?: Record<string, unknown>;
}

export interface ApiResult {
  message?: string;
  [key: string]: unknown;
}

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : "Something went wrong");

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    const m = (data as ApiResult | null)?.message;
    throw new Error(typeof m === "string" ? m : `Request failed (${res.status})`);
  }
  return data as T;
}

export const sendTest = (payload: TestPayload) => postJson<ApiResult>(ENDPOINTS.createTest, payload);
export const sendAiPrompt = (payload: AiPayload) => postJson<ApiResult>(ENDPOINTS.aiGenerate, payload);
export const enhanceText = (payload: EnhancePayload) => postJson<{ text?: string }>(ENDPOINTS.aiEnhance, payload);






