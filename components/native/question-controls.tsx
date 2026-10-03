import { ArrowDown, ArrowUp } from "lucide-react";
import { useRef, useState } from "react";
import { assignMatch } from "@/lib/native/core.mjs";
import type { Answer, Question } from "@/lib/native/schema";
import type { MatchingQuestion } from "@/lib/native/schema";

function MatchingControls({ question, answer, order, locked, onAnswer }: {
  question: MatchingQuestion; answer: Record<string, string>; order: string[]; locked: boolean; onAnswer: (answer: Answer) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const conceptButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  function pair(rightId: string) {
    if (!selected) return;
    const next = assignMatch(question, answer, selected, rightId);
    onAnswer(next);
    setMessage(`${question.left.find(i => i.id === selected)!.label} paired with ${question.right.find(i => i.id === rightId)!.label}.`);
    setSelected(null);
    const nextId = question.left.find(i => !next[i.id])?.id ?? selected;
    conceptButtons.current[nextId]?.focus();
  }
  return <div className="native-matching" lang="en">
    <div className="native-matching-columns">
      <section aria-label="Concepts"><h3>Concepts</h3><div className="native-match-items">
        {question.left.map(item => <button type="button" key={item.id} className={`native-match-item${selected === item.id ? " selected" : ""}`}
          ref={node => { conceptButtons.current[item.id] = node; }} disabled={locked} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setMessage(`Selected ${item.label}. Choose its match.`); }}>
          <strong>{item.label}</strong><span>{answer[item.id] ? `Paired: ${question.right.find(i => i.id === answer[item.id])!.label}. Select to change.` : "Not paired"}</span>
        </button>)}
      </div></section>
      <section aria-label="Responses"><h3>Responses</h3><div className="native-match-items">
        {order.map(id => {
          const item = question.right.find(i => i.id === id)!;
          const partner = question.left.find(i => answer[i.id] === id);
          return <button type="button" key={id} className="native-match-item" disabled={locked || !selected} onClick={() => pair(id)}>
            <span>{item.label}</span><small>{partner ? `Paired with ${partner.label}` : "Not paired"}</small>
          </button>;
        })}
      </div></section>
    </div>
    <p className="native-match-status" role="status">{message || "Select a concept, then its response. Select a paired concept to change its match. Reusing a response clears its previous pair."}</p>
    <p className="native-assigned">{Object.keys(answer).length} / {question.left.length} paired</p>
  </div>;
}

export function QuestionControls({ question, answer, order, locked, onAnswer }: {
  question: Question; answer: Answer; order: string[]; locked: boolean; onAnswer: (answer: Answer) => void;
}) {
  if (question.kind === "matching") return <MatchingControls key={question.id} question={question} answer={answer as Record<string, string>} order={order} locked={locked} onAnswer={onAnswer} />;
  if (question.kind === "year") return <div className="native-written">
    <label htmlFor={`answer-${question.id}`}>Year</label>
    <input id={`answer-${question.id}`} lang="en" type="number" inputMode="numeric" min={question.minYear} max={question.maxYear} step={1}
      disabled={locked} value={answer as string} aria-describedby="question-instruction" onChange={e => onAnswer(e.target.value)} />
    <p lang="en">Enter a whole year between {question.minYear} and {question.maxYear}.</p>
  </div>;
  if (question.kind === "text-input") return <div className="native-written">
    <label htmlFor={`answer-${question.id}`}>{question.inputLabel ?? "Answer"}</label>
    <input id={`answer-${question.id}`} lang="en" type="text" autoComplete="off" spellCheck={false} maxLength={200}
      disabled={locked} value={answer as string} aria-describedby="question-instruction" onChange={e => onAnswer(e.target.value)} />
  </div>;
  if (question.kind === "single-choice" || question.kind === "multiple-choice") {
    const selected = answer as string[];
    return <fieldset className={`native-choices${question.presentation === "true-false" ? " native-true-false" : ""}`} disabled={locked} aria-describedby="question-instruction">
      <legend className="sr-only">{question.kind === "single-choice" ? "Select one answer" : "Select all correct answers"}</legend>
      {order.map(id => {
        const option = question.options.find(o => o.id === id)!;
        return <label key={id} className={`native-choice${selected.includes(id) ? " selected" : ""}`}>
          <input type={question.kind === "single-choice" ? "radio" : "checkbox"} name={question.id}
            value={id} checked={selected.includes(id)} onChange={() => onAnswer(question.kind === "single-choice" ? [id]
              : selected.includes(id) ? selected.filter(v => v !== id) : [...selected, id])} />
          <span lang="en">{option.label}</span>
        </label>;
      })}
    </fieldset>;
  }
  if (question.kind === "ordering") {
    const ids = answer as string[];
    const move = (index: number, delta: number) => {
      const next = [...ids];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      onAnswer(next);
    };
    return <ol className="native-order" aria-label="Orden actual, de mayor a menor">
      {ids.map((id, index) => {
        const item = question.items.find(i => i.id === id)!;
        return <li key={id}><span className="native-position" aria-hidden="true">{index + 1}</span><span lang="en">{item.label}</span>
          <div className="native-move-buttons">
            <button type="button" aria-label={`Subir ${item.label}`} disabled={locked || index === 0} onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" /></button>
            <button type="button" aria-label={`Bajar ${item.label}`} disabled={locked || index === ids.length - 1} onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" /></button>
          </div>
        </li>;
      })}
    </ol>;
  }
  // Native selects work with mouse, iPad touch, keyboard and assistive technology.
  if (question.kind === "classification") return <div className="native-classify">
    {order.map(id => {
      const item = question.items.find(i => i.id === id)!;
      return <label className="native-classify-row" key={id}><span lang="en">{item.label}</span>
        <select lang="en" aria-label={`Category for ${item.label}`} disabled={locked} value={(answer as Record<string, string>)[id] ?? ""}
          onChange={e => onAnswer({ ...(answer as Record<string, string>), [id]: e.target.value })}>
          <option value="">Select a category</option>
          {question.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>;
    })}
  </div>;
  return null;
}
