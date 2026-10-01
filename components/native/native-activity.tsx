"use client";

import { useEffect, useReducer, useRef } from "react";
import { createAttempt, getResults, gradeQuestion, isComplete, reduceAttempt } from "@/lib/native/core.mjs";
import type { Attempt, NativeContent, Question } from "@/lib/native/schema";
import { QuestionControls } from "./question-controls";
import { AnswerReview } from "./answer-review";
import "./native-activity.css";

function instruction(question: Question) {
  return {
    "single-choice": "Select one answer.",
    "multiple-choice": "Select all correct answers. More than one answer is correct.",
    ordering: "Use the up and down buttons to sort from largest to smallest.",
    classification: "Choose a category for every item.",
  }[question.kind];
}

export function NativeActivity({ content, initialAttempt }: { content: NativeContent; initialAttempt: Attempt }) {
  const [attempt, dispatch] = useReducer((state: Attempt, action: Parameters<typeof reduceAttempt>[2]) => reduceAttempt(content, state, action), initialAttempt);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const lastCheck = useRef(0);
  const initialFocus = useRef(true);
  const question = content.questions.find(q => q.id === attempt.questionIds[attempt.index])!;
  const answer = attempt.answers[question.id];
  const checked = attempt.checked.includes(question.id);
  const results = getResults(content, attempt);
  const retryOnly = attempt.mode === "errors";

  useEffect(() => {
    // Move focus after navigation/repetition, keeping keyboard and reader context.
    heading.current?.focus({ preventScroll: initialFocus.current });
    initialFocus.current = false;
  }, [attempt.index, attempt.completed, attempt.questionIds]);
  useEffect(() => {
    if (attempt.checked.length > lastCheck.current) feedback.current?.focus();
    lastCheck.current = attempt.checked.length;
  }, [attempt.checked.length]);
  function restart(ids?: string[]) { dispatch({ type: "reset", attempt: createAttempt(content, ids) }); }

  return <section className="native-activity" aria-label="Actividad interactiva">
    {attempt.completed ? <>
      <div className="native-result-heading"><p className="eyebrow">{retryOnly ? "Repaso de errores completado" : "Actividad completada"}</p>
        <h2 tabIndex={-1} ref={heading}>Resultados y revisión</h2><p className="native-score"><strong>{results.correct} / {results.total}</strong> respuestas correctas · {results.percent}%</p>
        <p>Revisa tus respuestas y las explicaciones de cada pregunta.</p>
        <div className="native-actions"><button className="native-primary" onClick={() => restart()}>Repetir actividad</button>
          {results.incorrectIds.length > 0 ? <button className="native-secondary" onClick={() => restart(results.incorrectIds)}>Repetir solo las incorrectas ({results.incorrectIds.length})</button> : null}</div>
      </div>
      <div className="native-results">{results.results.map(({ question: q, answer: a, correct }) => <article className="native-result" key={q.id}>
        <p className="native-question-number">Pregunta {content.questions.findIndex(v => v.id === q.id) + 1}</p>
        <h3 lang="en">{q.prompt}</h3><AnswerReview question={q} answer={a} correct={correct} />
      </article>)}</div>
    </> : <>
      <div className="native-progress-heading"><span>Pregunta {attempt.index + 1} de {attempt.questionIds.length}{retryOnly ? " · Repaso de errores" : ""}</span>
        <span>{attempt.checked.length} comprobadas</span></div>
      <progress aria-label="Preguntas comprobadas" max={attempt.questionIds.length} value={attempt.checked.length} />
      <div className="native-question">
        <h2 lang="en" tabIndex={-1} ref={heading}>{question.prompt}</h2>
        <p id="question-instruction" className="native-instruction" lang="en">{instruction(question)}</p>
        {question.note ? <p className="native-content-note" lang="en">{question.note}</p> : null}
        <QuestionControls question={question} answer={answer} order={attempt.itemOrders[question.id]} locked={checked} onAnswer={value => dispatch({ type: "answer", answer: value })} />
        {question.kind === "classification" && !checked ? <p className="native-assigned" aria-live="polite">{Object.values(answer).filter(Boolean).length} / {question.items.length} elementos clasificados</p> : null}
        {checked ? <div ref={feedback} tabIndex={-1} role="region" aria-label="Corrección de la pregunta"><AnswerReview question={question} answer={answer} correct={gradeQuestion(question, answer)} /></div> : null}
        <div className="native-actions">
          {checked ? <button className="native-primary" onClick={() => dispatch({ type: "next" })}>{attempt.index === attempt.questionIds.length - 1 ? "Ver resultados" : "Continuar"}</button>
            : <button className="native-primary" disabled={!isComplete(question, answer)} onClick={() => dispatch({ type: "check" })}>Comprobar</button>}
        </div>
      </div>
    </>}
    <p className="native-session-note">Las respuestas se corrigen en este navegador. Si recargas o sales de la actividad, empezarás un intento nuevo.</p>
  </section>;
}
