"use client";
import { useRef, useState, type CSSProperties } from "react";
import { Check, Loader2, RefreshCw, Sparkles, WandSparkles, X } from "lucide-react";
import { enhanceText, errMsg } from "./Api";

export type ThemePref = "system" | "light" | "dark";

const LIGHT_VARS = `
  color-scheme: light;
  --qm-bg:#f6f7fb; --qm-card:#ffffff; --qm-subtle:#f1f5f9;
  --qm-text:#0f172a; --qm-muted:#64748b; --qm-label:#334155;
  --qm-border:#e2e8f0; --qm-input-bg:#ffffff; --qm-input-border:#cbd5e1;
  --qm-err-bg:#fef2f2; --qm-err-border:#fecaca; --qm-err-text:#991b1b;
  --qm-ok-bg:#f0fdf4; --qm-ok-border:#bbf7d0; --qm-ok-text:#166534;
  --qm-shadow:0 1px 2px rgba(15,23,42,.05),0 4px 12px rgba(15,23,42,.04);
  --qm-pop-shadow:0 8px 30px rgba(15,23,42,.14);`;

const DARK_VARS = `
  color-scheme: dark;
  --qm-bg:#0b1120; --qm-card:#111827; --qm-subtle:#1e293b;
  --qm-text:#e5e7eb; --qm-muted:#94a3b8; --qm-label:#cbd5e1;
  --qm-border:#1f2937; --qm-input-bg:#0f172a; --qm-input-border:#334155;
  --qm-err-bg:#3b1219; --qm-err-border:#7f1d1d; --qm-err-text:#fecaca;
  --qm-ok-bg:#052e16; --qm-ok-border:#14532d; --qm-ok-text:#bbf7d0;
  --qm-shadow:0 1px 2px rgba(0,0,0,.4);
  --qm-pop-shadow:0 8px 30px rgba(0,0,0,.55);`;

// "system" follows the OS setting, or an `html.dark` class if your site uses one.
export const THEME_CSS = `
.qm-root{${LIGHT_VARS}}
.qm-root[data-theme="dark"]{${DARK_VARS}}
@media (prefers-color-scheme: dark){.qm-root[data-theme="system"]{${DARK_VARS}}}
html.dark .qm-root[data-theme="system"]{${DARK_VARS}}

.qm-root *{box-sizing:border-box}
.qm-root h1{letter-spacing:-.02em}
.qm-root button{font-family:inherit;transition:filter .15s,transform .05s,background .15s,border-color .15s}
.qm-root button:not(:disabled):hover{filter:brightness(1.08)}
.qm-root button:not(:disabled):active{transform:translateY(1px)}
.qm-root button:disabled{opacity:.5;cursor:not-allowed}
.qm-root ::placeholder{color:var(--qm-muted);opacity:.8}

/* visible focus */
.qm-root input:focus,.qm-root textarea:focus,.qm-root select:focus{
  outline:none;border-color:var(--qm-accent,#2563eb)!important;
  box-shadow:0 0 0 3px color-mix(in srgb,var(--qm-accent,#2563eb) 22%,transparent)}
.qm-root input[style*="border: none"]:focus{box-shadow:none!important}
.qm-root button:focus-visible,.qm-root summary:focus-visible{
  outline:2px solid var(--qm-accent,#2563eb);outline-offset:2px}
.qm-root input[type="checkbox"],.qm-root input[type="radio"]{accent-color:var(--qm-accent,#2563eb);width:16px;height:16px}

/* collapsible settings */
.qm-root summary{cursor:pointer;list-style:none}
.qm-root summary::-webkit-details-marker{display:none}
.qm-root details[open] .qm-chev{transform:rotate(180deg)}
.qm-chev{transition:transform .2s}

/* AI suggestions */
@keyframes qm-spin{to{transform:rotate(360deg)}}
@keyframes qm-pop{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@keyframes qm-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.qm-spin{animation:qm-spin .8s linear infinite}
.qm-pop{animation:qm-pop .18s ease-out}
.qm-skel{height:12px;border-radius:6px;
  background:linear-gradient(90deg,var(--qm-subtle) 25%,var(--qm-border) 50%,var(--qm-subtle) 75%);
  background-size:200% 100%;animation:qm-shimmer 1.4s linear infinite}
.qm-sugg-row{transition:border-color .15s,background .15s}
.qm-sugg-row:hover{border-color:var(--qm-accent,#2563eb)!important}
@media (prefers-reduced-motion:reduce){.qm-spin,.qm-pop,.qm-skel{animation:none}}
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
  card: {
    border: "1px solid var(--qm-border)", borderRadius: 14, padding: 18, marginBottom: 16,
    background: "var(--qm-card)", color: "var(--qm-text)", boxShadow: "var(--qm-shadow)",
  },
  input: {
    width: "100%", padding: "9px 12px", border: "1px solid var(--qm-input-border)", borderRadius: 10,
    fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", background: "var(--qm-input-bg)", color: "var(--qm-text)",
  },
  label: { display: "block", fontSize: 13, fontWeight: 600, margin: "12px 0 6px", color: "var(--qm-label)" },
  row: { display: "flex", gap: 8, alignItems: "center" },
  error: {
    background: "var(--qm-err-bg)", border: "1px solid var(--qm-err-border)", color: "var(--qm-err-text)",
    borderRadius: 10, padding: "10px 12px", fontSize: 13, marginTop: 10,
  },
  ok: {
    background: "var(--qm-ok-bg)", border: "1px solid var(--qm-ok-border)", color: "var(--qm-ok-text)",
    borderRadius: 10, padding: "10px 12px", fontSize: 13, marginTop: 10,
  },
  btn: (accent, kind = "solid") => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "8px 14px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer",
    border: `1px solid ${accent}`,
    background: kind === "solid" ? accent : "transparent",
    color: kind === "solid" ? "#fff" : accent,
  }),
};

/* ------------------------------------------------------------------ */
/* Cleaning the AI reply                                               */
/* ------------------------------------------------------------------ */

/** Phrases chatbots add at the end ("Feel free to…", "Let me know…"). Everything after is dropped. */
const CHATTER =
  /\s*(?:Feel free|Let me know|Hope (?:this|these)|I hope|Would you like|If you(?:'d| would) like|Just let me know|Do you want|Choose the one)\b[\s\S]*$/i;

/** Remove markdown noise: **bold**, *italic*, `code`, # headings, fences. */
const stripMd = (t: string): string =>
  t
    .replace(/```\w*\n?/g, "")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/__([\s\S]+?)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*+/g, "")
    .trim();

const unquote = (t: string): string => t.replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim();

/** Clean one list item. If the model wrapped the real text in *…* or **…**, take just that part. */
function cleanItem(raw: string): string {
  const emphasised = raw.trim().match(/^[*_]{1,2}([^*_]+?)[*_]{1,2}/);
  const base = emphasised ? emphasised[1] : raw;
  return unquote(stripMd(base).replace(CHATTER, "").replace(/\s+/g, " "));
}

export interface ParsedSuggestions {
  items: string[];
  /** true when the model returned several alternatives instead of one rewrite */
  isList: boolean;
}

/**
 * Turn the model's reply into 1..6 clean suggestions.
 * Handles "1. … 2. …" (even when everything is on one line), "- …" bullets, and plain text.
 */
export function parseSuggestions(reply: string, multiline: boolean): ParsedSuggestions {
  const text = reply.replace(/\r/g, "").trim();
  const intro = /suggest|option|alternativ|version|variation|refined|here are|choices/i;

  // 1) numbered list, e.g. "Title ideas: 1. A 2. B 3. C"
  if (/(?:^|\s)1[.)]\s+/.test(text)) {
    const parts = text.split(/(?:^|\s)\d{1,2}[.)]\s+/);
    const preamble = parts[0];
    const rest = parts.slice(1);
    if (rest.length >= 2 && (!multiline || intro.test(preamble))) {
      const items = Array.from(new Set(rest.map(cleanItem).filter(Boolean))).slice(0, 6);
      if (items.length >= 2) return { items, isList: true };
    }
  }

  // 2) bullet list
  const lines = text.split("\n");
  const bullets = lines.filter((l) => /^\s*[-•*–]\s+/.test(l));
  if (bullets.length >= 2) {
    const first = lines.findIndex((l) => /^\s*[-•*–]\s+/.test(l));
    if (!multiline || intro.test(lines.slice(0, first).join(" "))) {
      const items = Array.from(
        new Set(bullets.map((l) => cleanItem(l.replace(/^\s*[-•*–]\s+/, ""))).filter(Boolean)),
      ).slice(0, 6);
      if (items.length >= 2) return { items, isList: true };
    }
  }

  // 3) a single rewrite: drop "Here's a refined version:" style first line and trailing chatter
  let body = text;
  const ls = body.split("\n");
  if (ls.length > 1 && /:\s*$/.test(ls[0]) && ls[0].length < 120) body = ls.slice(1).join("\n");
  body = stripMd(body).replace(CHATTER, "").trim();
  if (!multiline) body = unquote(body.replace(/\s+/g, " "));
  return { items: body ? [body] : [], isList: false };
}

/* ------------------------------------------------------------------ */
/* AiField                                                             */
/* ------------------------------------------------------------------ */

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

const smallBtn = (accent: string, kind: BtnKind = "solid"): CSSProperties => ({
  ...s.btn(accent, kind),
  padding: "5px 10px",
  fontSize: 13,
});

const iconBtn: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28,
  border: "none", borderRadius: 8, background: "transparent", color: "var(--qm-muted)", cursor: "pointer", padding: 0,
};

/** Input / textarea with an "AI enhance" button. Suggestions open in a clean panel; you pick one or dismiss. */
export function AiField({ label, value, onChange, multiline, aiEnabled, field = "text", context, accent, placeholder }: AiFieldProps) {
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedSuggestions | null>(null);
  const [err, setErr] = useState("");
  const original = useRef("");

  const run = async () => {
    if (!value.trim()) return setErr("Type something first, then enhance it.");
    original.current = value;
    setBusy(true);
    setErr("");
    try {
      const r = await enhanceText({ text: value, field, context });
      const p = parseSuggestions(String(r?.text ?? ""), !!multiline);
      if (p.items.length) setParsed(p);
      else setErr("AI returned an empty reply. Try again.");
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const use = (text: string) => {
    onChange(text);
    setParsed(null);
  };

  const panelStyle: CSSProperties = {
    marginTop: 8, padding: 12, borderRadius: 12,
    border: `1px solid color-mix(in srgb, ${accent} 35%, var(--qm-border))`,
    background: `color-mix(in srgb, ${accent} 6%, var(--qm-card))`,
    boxShadow: "var(--qm-pop-shadow)",
  };

  return (
    <div>
      {label && <label style={s.label}>{label}</label>}
      <div style={{ ...s.row, alignItems: multiline ? "flex-start" : "center" }}>
        {multiline ? (
          <textarea style={{ ...s.input, minHeight: 76, resize: "vertical" }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input style={s.input} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        )}
        {aiEnabled && (
          <button type="button" onClick={run} disabled={busy} title="Enhance with AI" aria-label="Enhance with AI"
            style={{ ...s.btn(accent, "outline"), width: 40, height: 40, padding: 0, flexShrink: 0 }}>
            {busy ? <Loader2 size={18} className="qm-spin" /> : <WandSparkles size={18} />}
          </button>
        )}
      </div>

      {err && <div style={{ ...s.error, marginTop: 6 }}>{err}</div>}

      {busy && (
        <div className="qm-pop" style={panelStyle} aria-live="polite">
          <div style={{ ...s.row, fontSize: 13, color: "var(--qm-muted)", marginBottom: 10 }}>
            <Sparkles size={14} color={accent} /> Writing suggestions…
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div className="qm-skel" style={{ width: "92%" }} />
            <div className="qm-skel" style={{ width: "70%" }} />
          </div>
        </div>
      )}

      {!busy && parsed && (
        <div className="qm-pop" style={panelStyle}>
          <div style={{ ...s.row, justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ ...s.row, gap: 6, fontSize: 13, fontWeight: 600 }}>
              <Sparkles size={14} color={accent} />
              {parsed.isList ? `${parsed.items.length} suggestions — pick one` : "AI suggestion"}
            </div>
            <div style={{ ...s.row, gap: 2 }}>
              <button type="button" style={iconBtn} title="Try again" aria-label="Try again" onClick={run}>
                <RefreshCw size={15} />
              </button>
              <button type="button" style={iconBtn} title="Dismiss" aria-label="Dismiss" onClick={() => setParsed(null)}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {parsed.items.map((text, i) => (
              <div
                key={i}
                className="qm-sugg-row"
                style={{
                  display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 10, border: "1px solid var(--qm-border)",
                  background: "var(--qm-card)",
                }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                  {text}
                </div>
                <button type="button" style={{ ...smallBtn(accent), flexShrink: 0 }} onClick={() => use(text)}>
                  <Check size={14} /> Use
                </button>
              </div>
            ))}
          </div>

          {!parsed.isList && original.current && original.current.trim() !== parsed.items[0] && (
            <details style={{ marginTop: 8, fontSize: 12.5, color: "var(--qm-muted)" }}>
              <summary>Show your original</summary>
              <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{original.current}</div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}