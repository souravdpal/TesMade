"use client";
import { Suspense, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import ManualBuilder from "./MnaulBuilder";
import JsonImport from "./JsonImport";
import AiPrompt, { type AiPromptSubmit } from "./Aiprmopt";
import AccessPanel from "./Acesspanel";
import ExpiryPanel from "./Expirypanel";
import {
  normalizeAccess,
  normalizeExpiry,
  validateTest,
  type Access,
  type ConsoleType,
  type Mode,
  type TestData,
} from "@/interface/test_interface";
import { errMsg, sendAiPrompt, sendTest, type ApiResult } from "./Api";
import { s, ThemeStyles, type ThemePref } from "./Ui";

import {
  AlertCircle,
  Braces,
  CheckCircle2,
  ChevronDown,
  Moon,
  PenLine,
  Settings2,
  Sparkles,
  Sun,
  SunMoon,
  X,
} from "lucide-react";

const THEME_ICON: Record<ThemePref, ReactNode> = {
  system: <SunMoon size={18} />,
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
};
const THEME_LABEL: Record<ThemePref, string> = {
  system: "Theme: system",
  light: "Theme: light",
  dark: "Theme: dark",
};

type Tab = "manual" | "json" | "ai";
interface Status {
  type: "ok" | "error";
  messages: string[];
}

// console -> which creation methods exist.
const CONSOLE_TABS: Record<ConsoleType, Tab[]> = {
  hybrid: ["manual", "json", "ai"], // everything
  manual: ["manual"], // manual only, AI just enhances text
  auto: ["json", "ai"], // no manual builder
};
const TAB_LABEL: Record<Tab, string> = {
  manual: "Manual",
  json: "Paste JSON",
  ai: "AI generate",
};
const TAB_ICON: Record<Tab, ReactNode> = {
  manual: <PenLine size={16} />,
  json: <Braces size={16} />,
  ai: <Sparkles size={16} />,
};
const THEME: Record<Mode, { accent: string; title: string; sub: string }> = {
  tutor: {
    accent: "#2563eb",
    title: "Create a test",
    sub: "Build your test for your students.",
  },
  ai: {
    accent: "#7c3aed",
    title: "AI Test Studio",
    sub: "Let AI do the heavy lifting — or fine-tune it yourself.",
  },
};

const chip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  background: "var(--qm-subtle)",
  border: "1px solid var(--qm-border)",
  color: "var(--qm-muted)",
};

function QuestionMaker() {
  const params = useSearchParams();
  const m = params.get("mode");
  const c = params.get("console");
  const mode: Mode = m === "ai" || m === "tutor" ? m : "tutor";
  const consoleType: ConsoleType =
    c === "hybrid" || c === "manual" || c === "auto" ? c : "hybrid";
  const theme = THEME[mode];
  const tabs = CONSOLE_TABS[consoleType];

  // AI-mode opens on the AI tab when available; tutor-mode opens on manual/JSON.
  const [tab, setTab] = useState<Tab>(() =>
    mode === "ai" && tabs.includes("ai") ? "ai" : tabs[0],
  );
  const [imageEnabled, setImageEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [access, setAccess] = useState<Access>({
    restricted: false,
    usernames: [],
  });
  // Local "YYYY-MM-DDTHH:mm" from the datetime-local input. "" = never expires.
  const [expiry, setExpiry] = useState("");
  const [status, setStatus] = useState<Status | null>(null);

  // Starts as "system" so server and client render the same HTML; saved choice is applied after mount.
  const [themePref, setThemePref] = useState<ThemePref>("system");
  useEffect(() => {
    try {
      const v = localStorage.getItem("qm-theme");
      if (v === "light" || v === "dark" || v === "system") setThemePref(v);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const cycleTheme = () => {
    const next: ThemePref =
      themePref === "system"
        ? "light"
        : themePref === "light"
          ? "dark"
          : "system";
    setThemePref(next);
    try {
      localStorage.setItem("qm-theme", next);
    } catch {
      /* ignore */
    }
  };

  // Success messages fade away on their own; errors stay until dismissed.
  useEffect(() => {
    if (status?.type !== "ok") return;
    const t = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(t);
  }, [status]);

  const run = async (fn: () => Promise<ApiResult>) => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fn();
      setStatus({
        type: "ok",
        messages: [res?.message || "Sent successfully."],
      });
    } catch (e) {
      setStatus({ type: "error", messages: [errMsg(e)] });
    } finally {
      setBusy(false);
    }
  };

  // Manual + JSON: validate/sanitize, then send the clean JSON.
  const submitTest = (raw: unknown, source: "manual" | "json") => {
    // Page-level settings override whatever is inside the test/JSON:
    //  - access panel set to "specific students" -> overrides `access`
    //  - expiry panel filled in -> overrides `expiresAt`
    const overrides: Record<string, unknown> = {};
    if (access.restricted) overrides.access = access;
    if (expiry) overrides.expiresAt = expiry;

    let merged: unknown = raw;
    if (Object.keys(overrides).length) {
      if (Array.isArray(raw)) merged = { questions: raw, ...overrides };
      else if (typeof raw === "object" && raw !== null) merged = { ...raw, ...overrides };
    }

    const { ok, errors, data } = validateTest(merged);
    if (!ok || !data) return setStatus({ type: "error", messages: errors });
    return run(() =>
      sendTest({ mode, console: consoleType, source, test: data }),
    );
  };

  const submitJson = (clean: TestData) =>
    submitTest(
      {
        ...clean,
        imageSubmission: {
          enabled: imageEnabled || clean.imageSubmission.enabled,
        },
      },
      "json",
    );

  // AI: just send the prompt; backend handles it.
  const submitPrompt = (payload: AiPromptSubmit) => {
    const { access: cleanAccess, errors } = normalizeAccess(access);
    const exp = normalizeExpiry(expiry);
    if (exp.error) errors.push(exp.error);
    if (errors.length) return setStatus({ type: "error", messages: errors });
    return run(() =>
      sendAiPrompt({
        mode,
        console: consoleType,
        source: "ai_prompt",
        ...payload,
        access: cleanAccess,
        expiresAt: exp.value,
      }),
    );
  };

  // Keep builder state alive when switching tabs.
  const show = (t: Tab) => ({ display: tab === t ? "block" : "none" });
  useEffect(() => {
    window.history.pushState({}, "", "/test/new");
  }, []);

  // Short summary shown on the collapsed settings header.
  const summary = [
    access.restricted ? `${access.usernames.length} student(s)` : "Anyone with link",
    expiry ? "Expires" : "No expiry",
    imageEnabled ? "Image required" : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className="qm-root"
      data-theme={themePref}
      style={
        {
          "--qm-accent": theme.accent,
          background: "var(--qm-bg)",
          color: "var(--qm-text)",
          minHeight: "100vh",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          lineHeight: 1.45,
        } as CSSProperties
      }
    >
      <ThemeStyles />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 96px" }}>
        {/* Header */}
        <div style={{ ...s.row, justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ ...s.row, gap: 14, alignItems: "flex-start" }}>
            <div
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                background: theme.accent,
              }}
            >
              {mode === "ai" ? <Sparkles size={22} /> : <PenLine size={22} />}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26 }}>{theme.title}</h1>
              <p style={{ color: "var(--qm-muted)", margin: "4px 0 8px" }}>{theme.sub}</p>
              <div style={{ ...s.row, gap: 6, flexWrap: "wrap" }}>
                <span style={chip}>mode: {mode}</span>
                <span style={chip}>console: {consoleType}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={cycleTheme}
            style={{ ...s.btn(theme.accent, "outline"), width: 40, height: 40, padding: 0 }}
            title={THEME_LABEL[themePref]}
            aria-label={THEME_LABEL[themePref]}
          >
            {THEME_ICON[themePref]}
          </button>
        </div>

        {/* Test settings (collapsible) */}
        <details open style={{ margin: "24px 0 8px" }}>
          <summary
            style={{
              ...s.row,
              justifyContent: "space-between",
              padding: "4px 2px 12px",
            }}
          >
            <span style={{ ...s.row, gap: 8, fontWeight: 600, fontSize: 15 }}>
              <Settings2 size={18} color={theme.accent} /> Test settings
            </span>
            <span style={{ ...s.row, gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {summary.map((t) => (
                <span key={t} style={chip}>{t}</span>
              ))}
              <ChevronDown size={18} className="qm-chev" color="var(--qm-muted)" />
            </span>
          </summary>

          <label
            style={{
              ...s.card,
              ...s.row,
              gap: 12,
              cursor: "pointer",
              alignItems: "flex-start",
            }}
          >
            <input
              type="checkbox"
              style={{ marginTop: 3 }}
              checked={imageEnabled}
              onChange={(e) => setImageEnabled(e.target.checked)}
            />
            <span>
              <strong style={{ display: "block", fontSize: 14 }}>Require an image submission</strong>
              <span style={{ color: "var(--qm-muted)", fontSize: 13 }}>
                Students must upload an image with their answers.
              </span>
            </span>
          </label>

          <AccessPanel accent={theme.accent} value={access} onChange={setAccess} />
          <ExpiryPanel accent={theme.accent} value={expiry} onChange={setExpiry} />
        </details>

        {/* Creation method: segmented control */}
        {tabs.length > 1 && (
          <div
            role="tablist"
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              margin: "16px 0",
              borderRadius: 12,
              background: "var(--qm-subtle)",
              border: "1px solid var(--qm-border)",
            }}
          >
            {tabs.map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "9px 12px",
                    borderRadius: 9,
                    border: "none",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: active ? theme.accent : "transparent",
                    color: active ? "#fff" : "var(--qm-muted)",
                  }}
                >
                  {TAB_ICON[t]} {TAB_LABEL[t]}
                </button>
              );
            })}
          </div>
        )}

        {tabs.includes("manual") && (
          <div style={show("manual")}>
            <ManualBuilder
              accent={theme.accent}
              aiEnabled
              imageEnabled={imageEnabled}
              busy={busy}
              onSubmit={(raw) => submitTest(raw, "manual")}
            />
          </div>
        )}
        {tabs.includes("json") && (
          <div style={show("json")}>
            <JsonImport accent={theme.accent} busy={busy} onSubmit={submitJson} />
          </div>
        )}
        {tabs.includes("ai") && (
          <div style={show("ai")}>
            <AiPrompt
              accent={theme.accent}
              imageEnabled={imageEnabled}
              busy={busy}
              onSubmit={submitPrompt}
            />
          </div>
        )}
      </div>

      {/* Status toast */}
      {status && (
        <div
          role="status"
          aria-live="polite"
          className="qm-pop"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 16,
            display: "flex",
            justifyContent: "center",
            padding: "0 16px",
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          <div
            style={{
              ...(status.type === "ok" ? s.ok : s.error),
              marginTop: 0,
              maxWidth: 560,
              width: "100%",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              boxShadow: "var(--qm-pop-shadow)",
              pointerEvents: "auto",
            }}
          >
            {status.type === "ok" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", flex: 1 }}>
              {status.messages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setStatus(null)}
              style={{
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// useSearchParams needs a Suspense boundary in the Next.js app router.
const Question = () => (
  <Suspense fallback={null}>
    <QuestionMaker />
  </Suspense>
);

export default Question;