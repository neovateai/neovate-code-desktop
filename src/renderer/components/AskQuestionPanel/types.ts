/**
 * Types for AskUserQuestion tool UI
 * Matches backend tool schema from takumi
 */

// Question option definition
export interface QuestionOption {
  label: string; // Display text (1-5 words)
  description: string; // Explanation of the option
}

// Single question definition
export interface Question {
  question: string; // Full question text ending with "?"
  header: string; // Short label (max 12 chars) for nav chip
  options: QuestionOption[]; // 2-4 options (no "Other", added by UI)
  multiSelect: boolean; // Allow multiple selections
}

// Answer format for backend
export interface Answer {
  question: string;
  answer: string;
}

// Per-question UI state
export interface QuestionUIState {
  selectedValue: string | string[] | undefined;
  otherInputValue: string;
}

// SelectInput option type
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  isOther?: boolean;
}
