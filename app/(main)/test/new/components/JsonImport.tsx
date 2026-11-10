"use client";
import { useState, type ChangeEvent } from "react";
import { safeParse, validateTest, type TestData } from "./Schema";
import { errMsg } from "./Api";
import { s } from "./Ui";
import JsonDocs from "./Jsondocs";

const PLACEHOLDER = `{
  "title": "Biology Quiz",
  "questions": [
    { "type": "true_false", "text": "DNA is double stranded.", "correctAnswer": true }
  ]
}

Not sure of the format? Use the guide below — you can copy an example or fill this box with a template.`;

interface JsonImportProps {
  accent: string;
  busy: boolean;
  onSubmit: (clean: TestData) => void;
}

export default function JsonImport({ accent, onSubmit, busy }: JsonImportProps) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<TestData | null>(null);

  const reset = () => {
    setPreview(null);
    setErrors([]);
  };

  const check = () => {
    try {
      const res = validateTest(safeParse(text));
      setErrors(res.errors);
      setPreview(res.ok ? res.data : null);
    } catch (e) {
      setErrors([errMsg(e)]);
      setPreview(null);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1_000_000) return setErrors(["File too large (max ~1 MB)"]);
    setText(await f.text());
    setPreview(null);
    setErrors([]);
  };

  return (
    <div>
      <div style={s.card}>
        <label style={s.label}>Paste your test JSON (or upload a .json file)</label>
        <textarea style={{ ...s.input, minHeight: 240, fontFamily: "monospace" }} value={text} placeholder={PLACEHOLDER}
          onChange={(e) => { setText(e.target.value); setPreview(null); }} />
        <div style={{ ...s.row, marginTop: 10, flexWrap: "wrap" }}>
          <input type="file" accept="application/json,.json" onChange={onFile} />
          <button type="button" style={s.btn(accent, "outline")} onClick={check}>Validate</button>
          <button type="button" style={s.btn(accent)} disabled={!preview || busy} onClick={() => preview && onSubmit(preview)}>
            {busy ? "Sending…" : "Send to backend"}
          </button>
        </div>
        {errors.length > 0 && (
          <div style={s.error}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        {preview && (
          <div style={s.ok}>
            Valid — “{preview.title}” with {preview.questions.length} question(s)
            {preview.access.restricted ? `, restricted to ${preview.access.usernames.length} student(s)` : ""}. Cleaned JSON will be sent.
          </div>
        )}
      </div>

      <JsonDocs accent={accent} onInsert={(json) => { setText(json); reset(); }} />
    </div>
  );
}