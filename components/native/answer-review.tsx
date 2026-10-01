import { correctAnswer } from "@/lib/native/core.mjs";
import type { Answer, Question } from "@/lib/native/schema";

export function AnswerDisplay({ question, answer }: { question: Question; answer: Answer }) {
  if (question.kind === "classification") return <ul className="native-answer-list" lang="en">{question.items.map(item =>
    <li key={item.id}><strong>{item.label}:</strong> {question.categories.find(c => c.id === (answer as Record<string, string>)[item.id])?.label ?? "Not answered"}</li>)}</ul>;
  const ids = answer as string[];
  const items = "options" in question ? question.options : question.items;
  const values = ids.map(id => items.find(i => i.id === id)?.label ?? id);
  if (question.kind === "ordering") return <ol className="native-answer-list" lang="en">{values.map((label, index) => <li key={index}>{label}</li>)}</ol>;
  return <p lang="en">{values.join(" · ") || "Not answered"}</p>;
}

export function AnswerReview({ question, answer, correct }: { question: Question; answer: Answer; correct: boolean }) {
  return <div className={`native-review ${correct ? "is-correct" : "is-incorrect"}`}>
    <p className="native-verdict"><strong>{correct ? "Correcta" : "Incorrecta"}</strong></p>
    <div className="native-answer-columns">
      <section><h4>Tu respuesta</h4><AnswerDisplay question={question} answer={answer} /></section>
      <section><h4>Respuesta correcta</h4><AnswerDisplay question={question} answer={correctAnswer(question)} /></section>
    </div>
    <section className="native-explanation"><h4>Explicación</h4><p lang="en">{question.explanation}</p></section>
  </div>;
}
