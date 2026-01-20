import { useCallback, useReducer } from 'react';

type QuestionStateItem = {
  selectedValue?: string | string[];
  otherInputValue: string;
};

type QuestionState = {
  currentIndex: number;
  answers: Record<string, string>;
  questionStates: Record<string, QuestionStateItem>;
  isInTextInput: boolean;
};

type QuestionAction =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | {
      type: 'UPDATE_SELECTION';
      question: string;
      value: string | string[];
      isMultiSelect: boolean;
    }
  | {
      type: 'UPDATE_OTHER_INPUT';
      question: string;
      value: string;
      isMultiSelect: boolean;
    }
  | {
      type: 'SET_ANSWER';
      question: string;
      answer: string;
      advance?: boolean;
    }
  | { type: 'SET_TEXT_INPUT_MODE'; active: boolean };

const initialState: QuestionState = {
  currentIndex: 0,
  answers: {},
  questionStates: {},
  isInTextInput: false,
};

function questionReducer(
  state: QuestionState,
  action: QuestionAction,
): QuestionState {
  switch (action.type) {
    case 'NEXT':
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        isInTextInput: false,
      };

    case 'PREV':
      return {
        ...state,
        currentIndex: Math.max(0, state.currentIndex - 1),
        isInTextInput: false,
      };

    case 'UPDATE_SELECTION': {
      const current = state.questionStates[action.question];
      return {
        ...state,
        questionStates: {
          ...state.questionStates,
          [action.question]: {
            selectedValue: action.value,
            otherInputValue: current?.otherInputValue ?? '',
          },
        },
      };
    }

    case 'UPDATE_OTHER_INPUT': {
      const current = state.questionStates[action.question];
      return {
        ...state,
        questionStates: {
          ...state.questionStates,
          [action.question]: {
            selectedValue:
              current?.selectedValue ?? (action.isMultiSelect ? [] : undefined),
            otherInputValue: action.value,
          },
        },
      };
    }

    case 'SET_ANSWER': {
      const newState = {
        ...state,
        answers: { ...state.answers, [action.question]: action.answer },
      };
      if (action.advance) {
        return {
          ...newState,
          currentIndex: newState.currentIndex + 1,
          isInTextInput: false,
        };
      }
      return newState;
    }

    case 'SET_TEXT_INPUT_MODE':
      return { ...state, isInTextInput: action.active };

    default:
      return state;
  }
}

export function useQuestionState() {
  const [state, dispatch] = useReducer(questionReducer, initialState);

  const next = useCallback(() => {
    dispatch({ type: 'NEXT' });
  }, []);

  const prev = useCallback(() => {
    dispatch({ type: 'PREV' });
  }, []);

  const updateSelection = useCallback(
    (question: string, value: string | string[], isMultiSelect: boolean) => {
      dispatch({ type: 'UPDATE_SELECTION', question, value, isMultiSelect });
    },
    [],
  );

  const updateOtherInput = useCallback(
    (question: string, value: string, isMultiSelect = false) => {
      dispatch({
        type: 'UPDATE_OTHER_INPUT',
        question,
        value,
        isMultiSelect,
      } as QuestionAction);
    },
    [],
  );

  const setAnswer = useCallback(
    (question: string, answer: string, advance = true) => {
      dispatch({ type: 'SET_ANSWER', question, answer, advance });
    },
    [],
  );

  const setTextInputMode = useCallback((active: boolean) => {
    dispatch({ type: 'SET_TEXT_INPUT_MODE', active });
  }, []);

  return {
    currentIndex: state.currentIndex,
    answers: state.answers,
    questionStates: state.questionStates,
    isInTextInput: state.isInTextInput,
    next,
    prev,
    updateSelection,
    updateOtherInput,
    setAnswer,
    setTextInputMode,
  };
}
