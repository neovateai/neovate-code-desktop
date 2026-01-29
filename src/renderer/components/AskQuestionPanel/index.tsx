import { useCallback, useEffect, useMemo } from 'react';
import { useQuestionState } from '../../hooks/useQuestionState';
import { QuestionNav } from './QuestionNav';
import { SelectInput } from './SelectInput';
import type { Answer, Question, SelectOption } from './types';

interface AskQuestionPanelProps {
  sessionId: string;
  questions: Question[];
  onResolve: (result: 'approve_once' | 'deny', answers?: Answer[]) => void;
}

export function AskQuestionPanel({
  questions,
  onResolve,
}: AskQuestionPanelProps) {
  const {
    currentIndex,
    answers,
    questionStates,
    isInTextInput,
    next,
    prev,
    updateSelection,
    updateOtherInput,
    setAnswer,
    setTextInputMode,
  } = useQuestionState();

  // Current question (with boundary check)
  const currentQuestion =
    questions[Math.min(currentIndex, questions.length - 1)];
  const isSubmitPage = currentIndex >= questions.length;
  const allAnswered = questions.every((q) => !!answers[q.question]);
  const isSingleQuestionSingleSelect =
    questions.length === 1 && !questions[0].multiSelect;

  // Cancel handler
  const handleCancel = useCallback(() => {
    onResolve('deny');
  }, [onResolve]);

  // Submit handler
  const handleSubmit = useCallback(() => {
    const answersArray: Answer[] = Object.entries(answers).map(
      ([question, answer]) => ({ question, answer }),
    );
    onResolve('approve_once', answersArray);
  }, [answers, onResolve]);

  // Handle answer from selection
  const handleAnswer = useCallback(
    (
      questionText: string,
      value: string | string[],
      otherText?: string,
      shouldAdvance = true,
    ) => {
      let answerText: string;

      if (Array.isArray(value)) {
        // Multi-select: join with commas, replace __other__ with actual text
        const finalValues = value
          .map((v) => (v === '__other__' ? otherText || '' : v))
          .filter(Boolean);
        answerText = finalValues.join(', ');
      } else {
        // Single-select
        answerText = value === '__other__' ? otherText || '' : value;
      }

      // Single question single-select: submit directly
      if (isSingleQuestionSingleSelect && shouldAdvance && answerText) {
        const answersArray: Answer[] = [
          { question: questionText, answer: answerText },
        ];
        onResolve('approve_once', answersArray);
        return;
      }

      setAnswer(questionText, answerText, shouldAdvance);
    },
    [isSingleQuestionSingleSelect, onResolve, setAnswer],
  );

  // Global keyboard navigation (Tab/Arrow for question switching)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in text input mode and not navigating
      if (
        isInTextInput &&
        !['Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        return;
      }

      // Skip if on submit page (handled by SubmitView)
      if (isSubmitPage) return;

      if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
        if (currentIndex > 0) {
          e.preventDefault();
          prev();
        }
      } else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
        const maxIndex = isSingleQuestionSingleSelect
          ? questions.length - 1
          : questions.length;
        if (currentIndex < maxIndex) {
          e.preventDefault();
          next();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    currentIndex,
    isInTextInput,
    isSubmitPage,
    isSingleQuestionSingleSelect,
    questions.length,
    next,
    prev,
    handleCancel,
  ]);

  // Render question view
  if (!isSubmitPage && currentQuestion) {
    return (
      <QuestionView
        question={currentQuestion}
        questions={questions}
        currentIndex={currentIndex}
        answers={answers}
        questionStates={questionStates}
        hideSubmitTab={isSingleQuestionSingleSelect}
        onUpdateSelection={updateSelection}
        onUpdateOtherInput={updateOtherInput}
        onAnswer={handleAnswer}
        onTextInputFocus={setTextInputMode}
        onCancel={handleCancel}
        onNext={next}
        isLastQuestion={currentIndex === questions.length - 1}
      />
    );
  }

  // Render submit view
  if (isSubmitPage) {
    return (
      <SubmitView
        questions={questions}
        currentIndex={currentIndex}
        answers={answers}
        allAnswered={allAnswered}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onPrev={prev}
      />
    );
  }

  return null;
}

// ==================== QuestionView Component ====================

interface QuestionViewProps {
  question: Question;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  questionStates: Record<
    string,
    { selectedValue?: string | string[]; otherInputValue: string }
  >;
  hideSubmitTab: boolean;
  onUpdateSelection: (
    question: string,
    value: string | string[],
    isMultiSelect: boolean,
  ) => void;
  onUpdateOtherInput: (
    question: string,
    value: string,
    isMultiSelect: boolean,
  ) => void;
  onAnswer: (
    question: string,
    value: string | string[],
    otherText?: string,
    advance?: boolean,
  ) => void;
  onTextInputFocus: (active: boolean) => void;
  onCancel: () => void;
  onNext: () => void;
  isLastQuestion: boolean;
}

function QuestionView({
  question,
  questions,
  currentIndex,
  answers,
  questionStates,
  hideSubmitTab,
  onUpdateSelection,
  onUpdateOtherInput,
  onAnswer,
  onTextInputFocus,
  onCancel,
  onNext,
  isLastQuestion,
}: QuestionViewProps) {
  const questionText = question.question;
  const state = questionStates[questionText];

  // Build options for SelectInput
  const options: SelectOption[] = useMemo(() => {
    return question.options.map((opt) => ({
      value: opt.label,
      label: opt.label,
      description: opt.description,
    }));
  }, [question.options]);

  // Handle selection change
  const handleChange = useCallback(
    (value: string | string[]) => {
      onUpdateSelection(questionText, value, question.multiSelect);

      if (question.multiSelect) {
        // Multi-select: don't auto-advance, update answer without advancing
        const values = Array.isArray(value) ? value : [value];
        const hasOther = values.includes('__other__');
        const otherText = hasOther ? state?.otherInputValue : undefined;
        onAnswer(questionText, values, otherText, false);
      } else {
        // Single-select: answer and advance (unless it's "Other")
        const isOther = value === '__other__';
        if (!isOther) {
          onAnswer(questionText, value as string, undefined, true);
        } else {
          onUpdateSelection(questionText, value, false);
          onTextInputFocus(true);
        }
      }
    },
    [
      questionText,
      question.multiSelect,
      state?.otherInputValue,
      onUpdateSelection,
      onAnswer,
      onTextInputFocus,
    ],
  );

  // Handle other input change
  const handleOtherChange = useCallback(
    (text: string) => {
      onUpdateOtherInput(questionText, text, question.multiSelect);
      onTextInputFocus(true);

      // Update answer if other is selected
      const isOtherSelected = question.multiSelect
        ? Array.isArray(state?.selectedValue) &&
          state?.selectedValue.includes('__other__')
        : state?.selectedValue === '__other__';

      if (isOtherSelected) {
        if (question.multiSelect) {
          const values = Array.isArray(state?.selectedValue)
            ? state.selectedValue
            : [];
          onAnswer(questionText, values, text, false);
        }
      }
    },
    [
      questionText,
      question.multiSelect,
      state?.selectedValue,
      onUpdateOtherInput,
      onTextInputFocus,
      onAnswer,
    ],
  );

  // Handle submit (for multi-select or other input)
  const handleSubmit = useCallback(() => {
    if (question.multiSelect) {
      const values = Array.isArray(state?.selectedValue)
        ? state.selectedValue
        : [];
      const hasOther = values.includes('__other__');
      const otherText = hasOther ? state?.otherInputValue : undefined;
      onAnswer(questionText, values, otherText, true);
    } else if (state?.selectedValue === '__other__') {
      onAnswer(questionText, '__other__', state?.otherInputValue, true);
    } else {
      onNext();
    }
  }, [questionText, question.multiSelect, state, onAnswer, onNext]);

  return (
    <div className="border-t border-border bg-sidebar p-4">
      {/* Navigation bar */}
      <QuestionNav
        questions={questions}
        currentIndex={currentIndex}
        answers={answers}
        hideSubmitTab={hideSubmitTab}
      />

      {/* Question title */}
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {question.question}
      </h3>

      {/* Options */}
      <SelectInput
        options={options}
        mode={question.multiSelect ? 'multi' : 'single'}
        value={state?.selectedValue}
        otherValue={state?.otherInputValue}
        onChange={handleChange}
        onOtherChange={handleOtherChange}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        submitLabel={isLastQuestion ? 'Submit' : 'Next'}
      />

      {/* Hints */}
      <p className="mt-3 text-xs text-muted-foreground">
        {question.multiSelect ? 'Space' : 'Enter'} to select · Tab/Arrow keys to
        navigate · Esc to cancel
      </p>
    </div>
  );
}

// ==================== SubmitView Component ====================

interface SubmitViewProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  allAnswered: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onPrev: () => void;
}

function SubmitView({
  questions,
  currentIndex,
  answers,
  allAnswered,
  onSubmit,
  onCancel,
  onPrev,
}: SubmitViewProps) {
  // Keyboard handler for submit page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        onPrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSubmit, onCancel, onPrev]);

  return (
    <div className="border-t border-border bg-sidebar p-4">
      {/* Navigation bar */}
      <QuestionNav
        questions={questions}
        currentIndex={currentIndex}
        answers={answers}
      />

      {/* Title */}
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Review your answers
      </h3>

      {/* Warning if not all answered */}
      {!allAnswered && (
        <p className="mb-3 text-sm text-amber-500">
          ⚠ You have not answered all questions
        </p>
      )}

      {/* Answer summary */}
      <div className="mb-4 space-y-2">
        {questions
          .filter((q) => answers[q.question])
          .map((q) => (
            <div key={q.question} className="text-sm">
              <p className="text-muted-foreground">● {q.question}</p>
              <p className="ml-4 text-foreground">→ {answers[q.question]}</p>
            </div>
          ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={onSubmit}
        >
          Submit answers
        </button>
        <button
          type="button"
          className="rounded border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-secondary focus:outline-none"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {/* Hints */}
      <p className="mt-3 text-xs text-muted-foreground">
        Enter to submit · Esc to cancel · ← to go back
      </p>
    </div>
  );
}
