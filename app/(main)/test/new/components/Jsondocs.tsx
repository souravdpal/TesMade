"use client";
import { useState, type CSSProperties } from "react";
import { QUESTION_TYPES, TYPE_LABELS, type QuestionType } from "./Schema";
import { s } from "./Ui";

type DocTab = "quick" | "types" | "fields" | "extras";
const DOC_TABS: { id: DocTab; label: string }[] = [
  { id: "quick", label: "Quick start" },
  { id: "types", label: "Question types" },
  { id: "fields", label: "Field reference" },
  { id: "extras", label: "Students & images" },
];

// ---------- Examples ----------
const TYPE_EXAMPLES: Record<QuestionType, string> = {
  mcq_single: `{
  "type": "mcq_single",
  "text": "Which organelle produces most of the cell's ATP?",
  "points": 2,
  "options": [
    { "text": "Nucleus" },
    { "text": "Mitochondria", "isCorrect": true },
    { "text": "Ribosome" },
    { "text": "Golgi body" }
  ],
  "explanation": "Mitochondria carry out cellular respiration."
}`,
  mcq_multiple: `{
  "type": "mcq_multiple",
  "text": "Select all prime numbers.",
  "points": 3,
  "options": [
    { "text": "2", "isCorrect": true },
    { "text": "4" },
    { "text": "5", "isCorrect": true },
    { "text": "9" }
  ]
}`,
  true_false: `{
  "type": "true_false",
  "text": "DNA is double stranded.",
  "correctAnswer": true
}`,
  short_answer: `{
  "type": "short_answer",
  "text": "What process do plants use to make food from sunlight?",
  "acceptedAnswers": ["photosynthesis", "Photosynthesis"]
}`,
  long_answer: `{
  "type": "long_answer",
  "text": "Explain how vaccines train the immune system.",
  "points": 10,
  "rubric": "Mentions antigens, memory cells and faster secondary response."
}`,
};

const FULL_EXAMPLE = `{
  "title": "Biology Quiz – Chapter 3",
  "description": "Cells and organelles",
  "durationMinutes": 30,
  "imageSubmission": { "enabled": false },
  "access": { "restricted": false, "usernames": [] },
  "questions": [
${[TYPE_EXAMPLES.mcq_single, TYPE_EXAMPLES.mcq_multiple, TYPE_EXAMPLES.true_false, TYPE_EXAMPLES.short_answer, TYPE_EXAMPLES.long_answer]
  .map((q) => q.split("\n").map((l) => "    " + l).join("\n"))
  .join(",\n")}
  ]
}`;

const ACCESS_EXAMPLE = `"access": {
  "restricted": true,
  "usernames": ["aisha_k", "ravi.s", "tom-w"]
}`;

const IMAGE_EXAMPLE = `{
  "title": "Art Class Test",
  "imageSubmission": { "enabled": true },
  "questions": [
    {
      "type": "long_answer",
      "text": "Sketch a still life and upload a photo of it.",
      "requiresImage": true
    }
  ]
}`;

const AI_PROMPT_HELP = `Convert my questions into JSON that follows this exact format. Reply with JSON only.
Allowed "type" values: ${QUESTION_TYPES.join(", ")}.
- mcq_single: options[{text,isCorrect}], exactly ONE isCorrect:true
- mcq_multiple: options[{text,isCorrect}], at least one isCorrect:true
- true_false: correctAnswer true/false
- short_answer: acceptedAnswers ["..."]
- long_answer: optional rubric
Every question also has: text, optional points, optional explanation.

Example:
${FULL_EXAMPLE}

My questions:
`;

/** Builds N blank-but-valid questions of one type to fill in. */
export function buildTemplate(n: number, type: QuestionType): string {
  const count = Math.max(1, Math.min(50, Math.floor(n) || 1));
  const questions = Array.from({ length: count }, (_, i) => {
    const base = { type, text: `Question ${i + 1} text`, points: 1 };
    switch (type) {
      case "mcq_single":
      case "mcq_multiple":
        return { ...base, options: [{ text: "Option A", isCorrect: true }, { text: "Option B" }, { text: "Option C" }, { text: "Option D" }] };
      case "true_false":
        return { ...base, correctAnswer: true };
      case "short_answer":
        return { ...base, acceptedAnswers: ["answer"] };
      default:
        return { ...base, rubric: "" };
    }
  });
  return JSON.stringify(
    { title: "My test", description: "", durationMinutes: 30, imageSubmission: { enabled: false }, access: { restricted: false, usernames: [] }, questions },
    null,
    2
  );
}

// ---------- Small UI helpers ----------
const preStyle: CSSProperties = {
  margin: 0, padding: 12, background: "var(--qm-subtle)", border: "1px solid var(--qm-border)", borderRadius: 8,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5, overflow: "auto", maxHeight: 340, color: "var(--qm-text)",
};
const cell: CSSProperties = { padding: "6px 8px", borderBottom: "1px solid var(--qm-border)", verticalAlign: "top", textAlign: "left" };

function CopyButton({ text, accent, label = "Copy" }: { text: string; accent: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button type="button" style={s.btn(accent, "outline")} onClick={copy}>
      {done ? "Copied ✓" : label}
    </button>
  );
}

function CodeBlock({ code, accent, onUse, useLabel = "Use as my JSON" }: { code: string; accent: string; onUse?: (code: string) => void; useLabel?: string }) {
  return (
    <div style={{ margin: "8px 0 14px" }}>
      <div style={{ ...s.row, justifyContent: "flex-end", marginBottom: 6 }}>
        <CopyButton text={code} accent={accent} />
        {onUse && (
          <button type="button" style={s.btn(accent)} onClick={() => onUse(code)}>
            {useLabel}
          </button>
        )}
      </div>
      <pre style={preStyle}>{code}</pre>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
        <thead>
          <tr>{head.map((h) => <th key={h} style={{ ...cell, color: "var(--qm-muted)" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={{ ...cell, fontFamily: j === 0 ? "ui-monospace, Menlo, monospace" : undefined }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface JsonDocsProps {
  accent: string;
  onInsert: (json: string) => void;
}

/** "Little docs" for the JSON format, shown under the paste box. */
export default function JsonDocs({ accent, onInsert }: JsonDocsProps) {
  const [tab, setTab] = useState<DocTab>("quick");
  const [typeTab, setTypeTab] = useState<QuestionType>("mcq_single");
  const [count, setCount] = useState("10");
  const [tplType, setTplType] = useState<QuestionType>("mcq_single");

  return (
    <div style={s.card}>
      <strong>📘 JSON format guide</strong>
      <div style={{ ...s.row, flexWrap: "wrap", margin: "10px 0" }}>
        {DOC_TABS.map((t) => (
          <button key={t.id} type="button" style={s.btn(accent, tab === t.id ? "solid" : "outline")} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "quick" && (
        <div style={{ fontSize: 14 }}>
          <p style={{ marginTop: 0 }}>
            A test is one JSON object. All questions live in the <code>questions</code> array. To add more questions, add more
            objects to that array, separated by commas.
          </p>
          <CodeBlock code={FULL_EXAMPLE} accent={accent} onUse={onInsert} />

          <strong>Need many questions? Generate a blank template</strong>
          <div style={{ ...s.row, flexWrap: "wrap", margin: "8px 0" }}>
            <input style={{ ...s.input, width: 80 }} type="number" min={1} max={50} value={count} onChange={(e) => setCount(e.target.value)} />
            <select style={{ ...s.input, width: "auto" }} value={tplType} onChange={(e) => setTplType(e.target.value as QuestionType)}>
              {QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <button type="button" style={s.btn(accent)} onClick={() => onInsert(buildTemplate(Number(count), tplType))}>
              Fill box with {Math.max(1, Math.min(50, Number(count) || 1))} blank question(s)
            </button>
          </div>
          <small style={{ color: "var(--qm-muted)" }}>Then edit the text and answers. Max 50 per template, 200 per test.</small>

          <div style={{ marginTop: 14 }}>
            <strong>Have your questions in a doc already?</strong>
            <p style={{ margin: "6px 0" }}>Copy this instruction, paste it into any AI chatbot followed by your questions, then paste its reply above.</p>
            <CopyButton text={AI_PROMPT_HELP} accent={accent} label="Copy chatbot instruction" />
          </div>
        </div>
      )}

      {tab === "types" && (
        <div style={{ fontSize: 14 }}>
          <div style={{ ...s.row, flexWrap: "wrap", marginBottom: 6 }}>
            {QUESTION_TYPES.map((t) => (
              <button key={t} type="button" style={s.btn(accent, typeTab === t ? "solid" : "outline")} onClick={() => setTypeTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <p style={{ margin: "6px 0" }}>
            <strong>{TYPE_LABELS[typeTab]}</strong>
            {typeTab === "mcq_single" && " — 2 to 10 options, exactly one with isCorrect: true."}
            {typeTab === "mcq_multiple" && " — 2 to 10 options, at least one with isCorrect: true."}
            {typeTab === "true_false" && " — correctAnswer must be true or false."}
            {typeTab === "short_answer" && " — list every accepted spelling in acceptedAnswers (1 to 10)."}
            {typeTab === "long_answer" && " — graded by the teacher; rubric is optional."}
          </p>
          <CodeBlock code={TYPE_EXAMPLES[typeTab]} accent={accent} />
          <small style={{ color: "var(--qm-muted)" }}>Paste this object inside the questions array.</small>
        </div>
      )}

      {tab === "fields" && (
        <div style={{ fontSize: 14 }}>
          <strong>Test fields</strong>
          <Table
            head={["Field", "Type", "Required", "Notes"]}
            rows={[
              ["title", "string", "yes", "Up to 200 characters."],
              ["description", "string", "no", "Up to 2000 characters."],
              ["durationMinutes", "number", "no", "1 to 1440. Leave out for no time limit."],
              ["imageSubmission", "{ enabled: boolean }", "no", "Default off. See Students & images."],
              ["access", "{ restricted, usernames }", "no", "Default: anyone with the link."],
              ["questions", "array", "yes", "1 to 200 questions."],
            ]}
          />
          <strong>Question fields (all types)</strong>
          <Table
            head={["Field", "Type", "Required", "Notes"]}
            rows={[
              ["type", "string", "yes", QUESTION_TYPES.join(" | ")],
              ["text", "string", "yes", "Up to 2000 characters. “question” also works."],
              ["points", "number", "no", "1 to 100. Default 1."],
              ["explanation", "string", "no", "Shown after answering. Up to 2000 characters."],
              ["requiresImage", "boolean", "no", "Only counts when imageSubmission.enabled is true."],
              ["id", "string", "no", "Created automatically if missing."],
            ]}
          />
          <strong>Type-specific fields</strong>
          <Table
            head={["Field", "Used by", "Required", "Notes"]}
            rows={[
              ["options", "mcq_single, mcq_multiple", "yes", "2 to 10 items: { text, isCorrect }. Text up to 500 chars."],
              ["correctAnswer", "true_false", "yes", "true or false."],
              ["acceptedAnswers", "short_answer", "yes", "1 to 10 strings, up to 500 chars each."],
              ["rubric", "long_answer", "no", "Grading notes."],
            ]}
          />
          <strong>Good to know</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
            <li>You can also paste just an array of questions, but then there is no title, so add one in the test fields.</li>
            <li>Unknown fields are ignored, and HTML tags are removed from all text.</li>
            <li>Maximum size is about 1 MB. Click Validate to see every problem at once, with the question number.</li>
          </ul>
        </div>
      )}

      {tab === "extras" && (
        <div style={{ fontSize: 14 }}>
          <strong>Restrict the test to certain students</strong>
          <p style={{ margin: "6px 0" }}>
            Usernames are 3–32 characters: letters, numbers, dot, underscore or dash. They are lowercased automatically, and a leading @ is removed.
          </p>
          <CodeBlock code={ACCESS_EXAMPLE} accent={accent} />
          <p style={{ margin: "6px 0" }}>
            If you also choose “Only specific students” in the access panel above the tabs, that list is used and the <code>access</code> in your
            JSON is ignored. If the panel is on “Anyone with the link”, the JSON’s <code>access</code> applies.
          </p>

          <strong>Make students upload an image</strong>
          <CodeBlock code={IMAGE_EXAMPLE} accent={accent} />
          <p style={{ margin: "6px 0" }}>
            Turn on <code>imageSubmission.enabled</code> for the test, then set <code>requiresImage: true</code> on each question that needs a photo.
            The checkbox at the top of the page also switches image submission on.
          </p>
        </div>
      )}
    </div>
  );
}