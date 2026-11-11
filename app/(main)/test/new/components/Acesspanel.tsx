"use client";
import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { MAX_USERNAMES, parseUsernames, type Access } from "@/interface/test_interface";
import { s } from "./Ui";

interface AccessPanelProps {
  accent: string;
  value: Access;
  onChange: (next: Access) => void;
}

/** Choose who can take the test. Applies to manual, JSON and AI-generated tests. */
export default function AccessPanel({ accent, value, onChange }: AccessPanelProps) {
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);

  const commit = (text: string) => {
    if (!text.trim()) return;
    const { valid, invalid: bad } = parseUsernames(text);
    setInvalid(bad);
    setDraft("");
    if (valid.length) {
      const merged = Array.from(new Set([...value.usernames, ...valid])).slice(0, MAX_USERNAMES);
      onChange({ ...value, usernames: merged });
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.usernames.length) {
      onChange({ ...value, usernames: value.usernames.slice(0, -1) });
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    commit(e.clipboardData.getData("text"));
  };

  const remove = (u: string) => onChange({ ...value, usernames: value.usernames.filter((x) => x !== u) });

  return (
    <div style={s.card}>
      <strong>Who can take this test?</strong>
      <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 14 }}>
        <label style={s.row}>
          <input type="radio" name="qm-access" checked={!value.restricted} onChange={() => onChange({ ...value, restricted: false })} />
          Anyone with the link
        </label>
        <label style={s.row}>
          <input type="radio" name="qm-access" checked={value.restricted} onChange={() => onChange({ ...value, restricted: true })} />
          Only specific students (by username)
        </label>
      </div>

      {value.restricted && (
        <div style={{ marginTop: 10 }}>
          <label style={s.label}>Student usernames</label>
          <div style={{ ...s.input, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {value.usernames.map((u) => (
              <span key={u} style={{ background: "var(--qm-subtle)", border: "1px solid var(--qm-input-border)", borderRadius: 999, padding: "2px 8px", fontSize: 13 }}>
                {u}{" "}
                <button type="button" aria-label={`Remove ${u}`} onClick={() => remove(u)}
                  style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0 }}>
                  ✕
                </button>
              </span>
            ))}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onBlur={() => commit(draft)}
              placeholder={value.usernames.length ? "Add more…" : "Type a username, press Enter (or paste a list)"}
              style={{ flex: 1, minWidth: 180, border: "none", outline: "none", background: "transparent", color: "var(--qm-text)", fontSize: 14 }}
            />
          </div>
          <small style={{ color: "var(--qm-muted)" }}>
            {value.usernames.length} student(s). Separate with Enter, comma, space or new line. Usernames are lowercased; a leading @ is removed.
          </small>
          {invalid.length > 0 && (
            <div style={s.error}>
              Not added (3–32 letters, numbers, . _ - only): {invalid.join(", ")}
            </div>
          )}
          {value.usernames.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button type="button" style={s.btn(accent, "outline")} onClick={() => onChange({ ...value, usernames: [] })}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}