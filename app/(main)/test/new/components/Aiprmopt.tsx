"use client";
import { useState } from "react";
import { AiField, s } from "./Ui";
import { cleanText } from "./Schema";

export interface AiPromptSubmit {
  prompt: string;
  imageSubmission: { enabled: boolean };
}

interface AiPromptProps {
  accent: string;
  imageEnabled: boolean;
  busy: boolean;
  onSubmit: (payload: AiPromptSubmit) => void;
}

export default function AiPrompt({ accent, imageEnabled, onSubmit, busy }: AiPromptProps) {
  const [prompt, setPrompt] = useState("");
  const [err, setErr] = useState("");

  const send = () => {
    const p = cleanText(prompt, 4000);
    if (p.length < 10) return setErr("Please describe the test in a bit more detail (at least 10 characters).");
    setErr("");
    onSubmit({ prompt: p, imageSubmission: { enabled: imageEnabled } });
  };

  return (
    <div style={s.card}>
      <AiField label="Describe the test you want AI to create" multiline value={prompt} onChange={setPrompt}
        aiEnabled field="ai_prompt" accent={accent}
        placeholder="e.g. 15 questions on photosynthesis for grade 9, mix of MCQ and short answer, 30 minutes" />
      {err && <div style={s.error}>{err}</div>}
      <div style={{ marginTop: 12 }}>
        <button type="button" style={s.btn(accent)} disabled={busy} onClick={send}>
          {busy ? "Sending…" : "Generate with AI"}
        </button>
      </div>
    </div>
  );
}