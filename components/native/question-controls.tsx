import { ArrowDown, ArrowUp } from "lucide-react";
import type { Answer, Question } from "@/lib/native/schema";

export function QuestionControls({ question, answer, order, locked, onAnswer }: {
  question: Question; answer: Answer; order: string[]; locked: boolean; onAnswer: (answer: Answer) => void;
}) {
  if (question.kind === "single-choice" || question.kind === "multiple-choice") {
    const selected = answer as string[];
    return <fieldset className="native-choices" disabled={locked} aria-describedby="question-instruction">
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
          onChange={e => onAnswer({ ...answer, [id]: e.target.value })}>
          <option value="">Select a category</option>
          {question.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>;
    })}
  </div>;
  return null;
}
