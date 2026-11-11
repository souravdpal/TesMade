"use client";
import { s } from "./Ui";

interface ExpiryPanelProps {
  accent: string;
  /** Local "YYYY-MM-DDTHH:mm" (datetime-local format). Empty string = never expires. */
  value: string;
  onChange: (next: string) => void;
}

/** datetime-local needs local time, not UTC. */
const toLocalInput = (d: Date): string =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** Choose when the test stops accepting students. Applies to manual, JSON and AI-generated tests. */
export default function ExpiryPanel({ accent, value, onChange }: ExpiryPanelProps) {
  const addDays = (n: number) => onChange(toLocalInput(new Date(Date.now() + n * 86_400_000)));

  return (
    <div style={s.card}>
      <strong>Test expiry</strong>
      <label style={s.label}>Students can take this test until (optional)</label>
      <div style={{ ...s.row, flexWrap: "wrap" }}>
        <input
          style={{ ...s.input, width: 240 }}
          type="datetime-local"
          min={toLocalInput(new Date())}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" style={s.btn(accent, "outline")} onClick={() => addDays(1)}>+1 day</button>
        <button type="button" style={s.btn(accent, "outline")} onClick={() => addDays(7)}>+1 week</button>
        {value && (
          <button type="button" style={s.btn("#64748b", "outline")} onClick={() => onChange("")}>
            No expiry
          </button>
        )}
      </div>
      <small style={{ color: "var(--qm-muted)" }}>
        Leave empty for a test that never expires. Uses your local time; it is sent to the server as UTC.
        If you also set <code>expiresAt</code> in pasted JSON, this value wins.
      </small>
    </div>
  );
}