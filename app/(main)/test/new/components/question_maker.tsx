"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ManualBuilder from "./MnaulBuilder";
import JsonImport from "./JsonImport";
import AiPrompt, { type AiPromptSubmit } from "./Aiprmopt";
import AccessPanel from "./Acesspanel";
import {
  normalizeAccess,
  validateTest,
  type Access,
  type ConsoleType,
  type Mode,
  type TestData,
} from "./Schema";
import { errMsg, sendAiPrompt, sendTest, type ApiResult } from "./Api";
import { s, ThemeStyles, type ThemePref } from "./Ui";

import { SunMoon, Sun, Moon } from "lucide-react"; // or your icon library

const THEME_ICON: Record<ThemePref, React.ReactNode> = {
  system: <SunMoon />,
  light: <Sun />,
  dark: <Moon />,
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
    // If the access panel is set to "specific students", it overrides any `access` inside the test/JSON.
    const merged =
      access.restricted &&
      typeof raw === "object" &&
      raw !== null &&
      !Array.isArray(raw)
        ? { ...raw, access }
        : raw;
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
    if (errors.length) return setStatus({ type: "error", messages: errors });
    return run(() =>
      sendAiPrompt({
        mode,
        console: consoleType,
        source: "ai_prompt",
        ...payload,
        access: cleanAccess,
      }),
    );
  };

  // Keep builder state alive when switching tabs.
  const show = (t: Tab) => ({ display: tab === t ? "block" : "none" });
  useEffect(() => {
    window.history.pushState({}, "", "/test/new");
  },[]);
  return (
    <div
      className="qm-root"
      data-theme={themePref}
      style={{
        background: "var(--qm-bg)",
        color: "var(--qm-text)",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <ThemeStyles />
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 16 }}>
        <div
          style={{
            ...s.row,
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <h1 style={{ margin: 0 }}>{theme.title}</h1>
          <button
            type="button"
            onClick={cycleTheme}
            style={s.btn(theme.accent, "outline")}
            title="Switch theme"
          >
            {THEME_ICON[themePref]}
          </button>
        </div>
        <p style={{ color: "var(--qm-muted)", marginTop: 4 }}>
          {theme.sub}{" "}
          <small>
            (mode: {mode} · console: {consoleType})
          </small>
        </p>

        <label style={{ ...s.row, margin: "8px 0 16px", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={imageEnabled}
            onChange={(e) => setImageEnabled(e.target.checked)}
          />
          Students must submit an image with their answers
        </label>

        <AccessPanel
          accent={theme.accent}
          value={access}
          onChange={setAccess}
        />

        {tabs.length > 1 && (
          <div style={{ ...s.row, marginBottom: 16 }}>
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={s.btn(theme.accent, tab === t ? "solid" : "outline")}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
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
            <JsonImport
              accent={theme.accent}
              busy={busy}
              onSubmit={submitJson}
            />
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

        {status && (
          <div style={status.type === "ok" ? s.ok : s.error}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {status.messages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
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
