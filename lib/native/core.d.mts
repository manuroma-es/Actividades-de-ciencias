import type { NativeContent, Question, Answer, Attempt, AttemptAction } from "./schema";
export function validateContent(content: unknown): NativeContent;
export function shuffle<T>(values: T[], random?: () => number): T[];
export function createAttempt(content: NativeContent, questionIds?: string[], random?: () => number): Attempt;
export function isComplete(question: Question, answer: Answer): boolean;
export function gradeQuestion(question: Question, answer: Answer): boolean;
export function correctAnswer(question: Question): Answer;
export function getResults(content: NativeContent, attempt: Attempt): {
  results: { question: Question; answer: Answer; correct: boolean }[];
  correct: number; total: number; percent: number; incorrectIds: string[];
};
export function reduceAttempt(content: NativeContent, state: Attempt, action: AttemptAction): Attempt;
