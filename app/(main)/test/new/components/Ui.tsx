"use client";
import { useState, type CSSProperties } from "react";
import { enhanceText, errMsg } from "./Api";
import { Sun, Moon ,SunMoon , PencilSparklesIcon } from "lucide-react";

export type ThemePref = "system" | "light" | "dark";

const LIGHT_VARS = `
  color-scheme: light;
  --qm-bg:#f8fafc; --qm-card:#ffffff; --qm-subtle:#f1f5f9;
  --qm-text:#0f172a; --qm-muted:#64748b; --qm-label:#334155;
  --qm-border:#e2e8f0; --qm-input-bg:#ffffff; --qm-input-border:#cbd5e1;
  --qm-err-bg:#fef2f2; --qm-err-border:#fecaca; --qm-err-text:#991b1b;
  --qm-ok-bg:#f0fdf4; --qm-ok-border:#bbf7d0; --qm-ok-text:#166534;`;

const DARK_VARS = `
  color-scheme: dark;
  --qm-bg:#0b1120; --qm-card:#111827; --qm-subtle:#1e293b;
  --qm-text:#e5e7eb; --qm-muted:#94a3b8; --qm-label:#cbd5e1;
  --qm-border:#1f2937; --qm-input-bg:#0f172a; --qm-input-border:#334155;
  --qm-err-bg:#3b1219; --qm-err-border:#7f1d1d; --qm-err-text:#fecaca;
  --qm-ok-bg:#052e16; --qm-ok-border:#14532d; --qm-ok-text:#bbf7d0;`;

// "system" follows the OS setting, or an `html.dark` class if your site uses one.
export const THEME_CSS = `
.qm-root{${LIGHT_VARS}}
.qm-root[data-theme="dark"]{${DARK_VARS}}
@media (prefers-color-scheme: dark){.qm-root[data-theme="system"]{${DARK_VARS}}}
html.dark .qm-root[data-theme="system"]{${DARK_VARS}}
.qm-root button:disabled{opacity:.5;cursor:not-allowed}
.qm-root ::placeholder{color:var(--qm-muted);opacity:.8}
`;

export function ThemeStyles() {
  return <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />;
}

type BtnKind = "solid" | "outline";

interface Styles {
  card: CSSProperties;
  input: CSSProperties;
  label: CSSProperties;
  row: CSSProperties;
  error: CSSProperties;
  ok: CSSProperties;
  btn: (accent: string, kind?: BtnKind) => CSSProperties;
}

export const s: Styles = {
  card: { border: "1px solid var(--qm-border)", borderRadius: 12, padding: 16, marginBottom: 16, background: "var(--qm-card)", color: "var(--qm-text)" },
  input: { width: "100%", padding: "8px 10px", border: "1px solid var(--qm-input-border)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", background: "var(--qm-input-bg)", color: "var(--qm-text)" },
  label: { display: "block", fontSize: 13, fontWeight: 600, margin: "10px 0 4px", color: "var(--qm-label)" },
  row: { display: "flex", gap: 8, alignItems: "center" },
  error: { background: "var(--qm-err-bg)", border: "1px solid var(--qm-err-border)", color: "var(--qm-err-text)", borderRadius: 8, padding: 10, fontSize: 13, marginTop: 10 },
  ok: { background: "var(--qm-ok-bg)", border: "1px solid var(--qm-ok-border)", color: "var(--qm-ok-text)", borderRadius: 8, padding: 10, fontSize: 13, marginTop: 10 },
  btn: (accent, kind = "solid") => ({
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    border: `1px solid ${accent}`,
    background: kind === "solid" ? accent : "transparent",
    color: kind === "solid" ? "#fff" : accent,
  }),
};

interface AiFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  aiEnabled?: boolean;
  field?: string;
  context?: Record<string, unknown>;
  accent: string;
  placeholder?: string;
}

/** Input / textarea with optional "AI enhance" button. Suggestion is shown first; user accepts or dismisses. */
export function AiField({ label, value, onChange, multiline, aiEnabled, field = "text", context, accent, placeholder }: AiFieldProps) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const run = async () => {
    if (!value.trim()) return setErr("Type something first, then enhance it.");
    setBusy(true);
    setErr("");
    try {
      const r = await enhanceText({ text: value, field, context });
      if (r?.text) setSuggestion(String(r.text));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {label && <label style={s.label}>{label}</label>}
      <div style={s.row}>
        {multiline ? (
          <textarea style={{ ...s.input, minHeight: 70 }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input style={s.input} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        )}
        {aiEnabled && (
          <button type="button" onClick={run} disabled={busy} title="Enhance with AI" style={s.btn(accent, "outline")}>
            {busy ? "…" : <PencilSparklesIcon/>}
          </button>
        )}
      </div>
      {err && <div style={{ ...s.error, marginTop: 4 }}>{err}</div>}
      {suggestion && (
        <div style={{ ...s.ok, background: "var(--qm-subtle)", border: "1px dashed var(--qm-input-border)", color: "var(--qm-text)" }}>
          <div style={{ marginBottom: 6 }}>{suggestion}</div>
          <button type="button" style={s.btn(accent)} onClick={() => { onChange(suggestion); setSuggestion(null); }}>
            Use this
          </button>{" "}
          <button type="button" style={s.btn(accent, "outline")} onClick={() => setSuggestion(null)}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}