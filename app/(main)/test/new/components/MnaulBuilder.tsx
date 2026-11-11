"use client";
import { useState } from "react";
import { QUESTION_TYPES, TYPE_LABELS, emptyQuestion, uid, type DraftQuestion, type Option, type QuestionType } from "@/interface/test_interface";
import { AiField, s } from "./Ui";

interface ManualBuilderProps {
  accent: string;
  aiEnabled: boolean;
  imageEnabled: boolean;
  busy: boolean;
  onSubmit: (raw: unknown) => void;
}

export default function ManualBuilder({ accent, aiEnabled, imageEnabled, onSubmit, busy }: ManualBuilderProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [emptyQuestion("mcq_single", "init")]);

  const patch = (id: string, p: Partial<DraftQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const remove = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id));

  const setOption = (qid: string, oid: string, p: Partial<Option>, single = false) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id !== qid
          ? q
          : {
              ...q,
              options: q.options.map((o) =>
                o.id === oid ? { ...o, ...p } : single && p.isCorrect ? { ...o, isCorrect: false } : o
              ),
            }
      )
    );

  const submit = () =>
    onSubmit({
      title,
      description,
      durationMinutes: duration ? Number(duration) : null,
      imageSubmission: { enabled: imageEnabled },
      questions,
    });

  return (
    <div>
      <div style={s.card}>
        <AiField label="Test title" value={title} onChange={setTitle} aiEnabled={aiEnabled} field="title" accent={accent} />
        <AiField label="Description" multiline value={description} onChange={setDescription} aiEnabled={aiEnabled}
          field="description" context={{ title }} accent={accent} />
        <label style={s.label}>Duration (minutes, optional)</label>
        <input style={{ ...s.input, width: 160 }} type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
      </div>

      {questions.map((q, i) => (
        <div key={q.id} style={s.card}>
          <div style={{ ...s.row, justifyContent: "space-between" }}>
            <strong>Question {i + 1}</strong>
            {questions.length > 1 && (
              <button type="button" style={s.btn("#dc2626", "outline")} onClick={() => remove(q.id)}>Remove</button>
            )}
          </div>

          <div style={{ ...s.row, marginTop: 8 }}>
            <select style={s.input} value={q.type} onChange={(e) => patch(q.id, { type: e.target.value as QuestionType })}>
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            <input style={{ ...s.input, width: 90 }} type="number" min={1} title="Points" value={q.points}
              onChange={(e) => patch(q.id, { points: e.target.value })} />
          </div>

          <AiField label="Question" multiline value={q.text} onChange={(v) => patch(q.id, { text: v })} aiEnabled={aiEnabled}
            field="question" context={{ type: q.type, testTitle: title }} accent={accent} />

          {(q.type === "mcq_single" || q.type === "mcq_multiple") && (
            <div>
              <label style={s.label}>Options (tick the correct {q.type === "mcq_single" ? "one" : "ones"})</label>
              {q.options.map((o) => (
                <div key={o.id} style={{ ...s.row, marginBottom: 6 }}>
                  <input type={q.type === "mcq_single" ? "radio" : "checkbox"} name={`c-${q.id}`} checked={o.isCorrect}
                    onChange={(e) => setOption(q.id, o.id, { isCorrect: e.target.checked }, q.type === "mcq_single")} />
                  <div style={{ flex: 1 }}>
                    <AiField value={o.text} onChange={(v) => setOption(q.id, o.id, { text: v })} aiEnabled={aiEnabled}
                      field="option" context={{ question: q.text }} accent={accent} placeholder="Option text" />
                  </div>
                  {q.options.length > 2 && (
                    <button type="button" style={s.btn("#dc2626", "outline")}
                      onClick={() => patch(q.id, { options: q.options.filter((x) => x.id !== o.id) })}>✕</button>
                  )}
                </div>
              ))}
              {q.options.length < 10 && (
                <button type="button" style={s.btn(accent, "outline")}
                  onClick={() => patch(q.id, { options: [...q.options, { id: uid(), text: "", isCorrect: false }] })}>
                  + Add option
                </button>
              )}
            </div>
          )}

          {q.type === "true_false" && (
            <div style={{ marginTop: 8 }}>
              <label style={s.label}>Correct answer</label>
              <select style={{ ...s.input, width: 140 }} value={String(q.correctAnswer)}
                onChange={(e) => patch(q.id, { correctAnswer: e.target.value === "true" })}>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          )}

          {q.type === "short_answer" && (
            <div>
              <label style={s.label}>Accepted answers</label>
              {q.acceptedAnswers.map((a, ai) => (
                <input key={ai} style={{ ...s.input, marginBottom: 6 }} value={a}
                  onChange={(e) => patch(q.id, { acceptedAnswers: q.acceptedAnswers.map((x, k) => (k === ai ? e.target.value : x)) })} />
              ))}
              <button type="button" style={s.btn(accent, "outline")}
                onClick={() => patch(q.id, { acceptedAnswers: [...q.acceptedAnswers, ""] })}>
                + Add accepted answer
              </button>
            </div>
          )}

          {q.type === "long_answer" && (
            <AiField label="Grading rubric (optional)" multiline value={q.rubric} onChange={(v) => patch(q.id, { rubric: v })}
              aiEnabled={aiEnabled} field="rubric" context={{ question: q.text }} accent={accent} />
          )}

          <AiField label="Explanation (optional)" multiline value={q.explanation} onChange={(v) => patch(q.id, { explanation: v })}
            aiEnabled={aiEnabled} field="explanation" context={{ question: q.text }} accent={accent} />

          {imageEnabled && (
            <label style={{ ...s.row, marginTop: 10, fontSize: 14 }}>
              <input type="checkbox" checked={q.requiresImage} onChange={(e) => patch(q.id, { requiresImage: e.target.checked })} />
              Student must upload an image for this question
            </label>
          )}
        </div>
      ))}

      <div style={s.row}>
        <button type="button" style={s.btn(accent, "outline")} onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
          + Add another question
        </button>
        <button type="button" style={s.btn(accent)} disabled={busy} onClick={submit}>
          {busy ? "Sending…" : "Done — create test"}
        </button>
      </div>
    </div>
  );
}