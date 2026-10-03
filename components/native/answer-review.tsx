import { correctAnswer } from "@/lib/native/core.mjs";
import type { Answer, Question } from "@/lib/native/schema";

export function AnswerDisplay({ question, answer }: { question: Question; answer: Answer }) {
  if (question.kind === "year" || question.kind === "text-input") return <p lang="en" className="native-original-answer">{(answer as string) || "Not answered"}</p>;
  if (question.kind === "matching") return <ul className="native-answer-list" lang="en">{question.left.map(item =>
    <li key={item.id}><strong>{item.label}:</strong> {question.right.find(r => r.id === (answer as Record<string, string>)[item.id])?.label ?? "Not answered"}</li>)}</ul>;
  if (question.kind === "classification") return <ul className="native-answer-list" lang="en">{question.items.map(item =>
    <li key={item.id}><strong>{item.label}:</strong> {question.categories.find(c => c.id === (answer as Record<string, string>)[item.id])?.label ?? "Not answered"}</li>)}</ul>;
  const ids = answer as string[];
  const items = "options" in question ? question.options : question.items;
  const values = ids.map(id => items.find(i => i.id === id)?.label ?? id);
  if (question.kind === "ordering") return <ol className="native-answer-list" lang="en">{values.map((label, index) => <li key={index}>{label}</li>)}</ol>;
  return <p lang="en">{values.join(" · ") || "Not answered"}</p>;
}

function ItemReview({ question, answer }: { question: Question; answer: Answer }) {
  if (question.kind !== "classification" && question.kind !== "matching") return null;
  const items = question.kind === "matching" ? question.left : question.items;
  const responses = question.kind === "matching" ? question.right : question.categories;
  const solution = question.kind === "matching" ? question.correctMatches : question.correctCategories;
  const chosen = answer as Record<string, string>;
  return <ul className="native-item-review">{items.map(item => <li key={item.id}>
    <strong lang="en">{item.label}</strong><span className="native-item-verdict">{chosen[item.id] === solution[item.id] ? "Correcta" : "Incorrecta"}</span>
    <p>Tu respuesta: <span lang="en">{responses.find(r => r.id === chosen[item.id])?.label ?? "Not answered"}</span></p>
    <p>Respuesta correcta: <span lang="en">{responses.find(r => r.id === solution[item.id])!.label}</span></p>
  </li>)}</ul>;
}

function ChoiceFeedback({ question, answer }: { question: Question; answer: Answer }) {
  if (question.kind !== "multiple-choice") return null;
  const selected = answer as string[];
  const omitted = question.options.filter(o => question.correctIds.includes(o.id) && !selected.includes(o.id));
  const extra = question.options.filter(o => !question.correctIds.includes(o.id) && selected.includes(o.id));
  return <div className="native-choice-feedback">
    {omitted.length > 0 ? <p>Correctas omitidas: <span lang="en">{omitted.map(o => o.label).join(" · ")}</span></p> : null}
    {extra.length > 0 ? <p>Seleccionadas por error: <span lang="en">{extra.map(o => o.label).join(" · ")}</span></p> : null}
  </div>;
}

export function AnswerReview({ question, answer, correct }: { question: Question; answer: Answer; correct: boolean }) {
  return <div className={`native-review ${correct ? "is-correct" : "is-incorrect"}`}>
    <p className="native-verdict"><strong>{correct ? "Correcta" : "Incorrecta"}</strong></p>
    <ChoiceFeedback question={question} answer={answer} />
    {question.kind === "classification" || question.kind === "matching" ? <ItemReview question={question} answer={answer} /> : <div className="native-answer-columns">
      <section><h4>Tu respuesta</h4><AnswerDisplay question={question} answer={answer} /></section>
      <section><h4>Respuesta correcta</h4><AnswerDisplay question={question} answer={correctAnswer(question)} /></section>
    </div>}
    <section className="native-explanation"><h4>Explicación</h4><p lang="en">{question.explanation}</p></section>
  </div>;
}
