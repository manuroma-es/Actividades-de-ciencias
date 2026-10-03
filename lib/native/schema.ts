export interface Item { id: string; label: string }
interface QuestionBase { id: string; prompt: string; explanation: string; note?: string }
export interface ChoiceQuestion extends QuestionBase {
  kind: "single-choice" | "multiple-choice";
  options: Item[];
  correctIds: string[];
  presentation?: "true-false";
}
export interface OrderingQuestion extends QuestionBase {
  kind: "ordering";
  items: Item[];
  correctOrder: string[];
}
export interface ClassificationQuestion extends QuestionBase {
  kind: "classification";
  items: Item[];
  categories: Item[];
  correctCategories: Record<string, string>;
}
export interface YearQuestion extends QuestionBase {
  kind: "year"; correctYear: number; minYear: number; maxYear: number;
}
export interface TextQuestion extends QuestionBase {
  kind: "text-input"; expectedText: string; instruction: string; inputLabel?: string;
}
export interface MatchingQuestion extends QuestionBase {
  kind: "matching"; left: Item[]; right: Item[];
  correctMatches: Record<string, string>;
}
export type Question = ChoiceQuestion | OrderingQuestion | ClassificationQuestion | YearQuestion | TextQuestion | MatchingQuestion;
export interface NativeContent {
  engineVersion: 1;
  activityType: "mixed-practice";
  id: string;
  language: string;
  questions: Question[];
}
export type Answer = string[] | Record<string, string> | string;
export interface Attempt {
  mode: "all" | "errors";
  questionIds: string[];
  index: number;
  answers: Record<string, Answer>;
  itemOrders: Record<string, string[]>;
  checked: string[];
  completed: boolean;
}
export type AttemptAction =
  | { type: "answer"; answer: Answer }
  | { type: "check" }
  | { type: "next" }
  | { type: "reset"; attempt: Attempt };
