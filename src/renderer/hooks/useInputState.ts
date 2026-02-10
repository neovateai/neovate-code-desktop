import { useCallback, useEffect, useRef, useState } from 'react';
import { INPUT_DEBOUNCE_MS } from '../constants';
import { logger } from '../lib/logger';
import {
  defaultSessionInputState,
  getInputMode,
  type InputMode,
  type PlanMode,
  type ThinkingLevel,
  useStore,
} from '../store';

export interface InputState {
  value: string;
  cursorPosition: number;
  mode: InputMode;
}

export function useInputState(
  sessionId: string | null,
  workspaceId: string | null,
) {
  const {
    getSessionInput,
    setSessionInput,
    resetSessionInput,
    addToWorkspaceHistory,
    getWorkspaceHistory,
  } = useStore();

  const sessionInput = sessionId
    ? getSessionInput(sessionId)
    : getSessionInput('__draft__');
  const inputSessionId = sessionId ?? '__draft__';
  const history = workspaceId ? getWorkspaceHistory(workspaceId) : [];

  const [localValue, setLocalValue] = useState(sessionInput.value);
  const [localCursorPosition, setLocalCursorPosition] = useState(
    sessionInput.cursorPosition,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSessionIdRef = useRef<string | null>(sessionId);
  const prevForceUpdateKeyRef = useRef<number>(sessionInput.forceUpdateKey);

  // Sync from store when sessionId changes
  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId) {
      setLocalValue(sessionInput.value);
      setLocalCursorPosition(sessionInput.cursorPosition);
      prevSessionIdRef.current = sessionId;
      prevForceUpdateKeyRef.current = sessionInput.forceUpdateKey;
    }
  }, [
    sessionId,
    sessionInput.value,
    sessionInput.cursorPosition,
    sessionInput.forceUpdateKey,
  ]);

  // Sync from store when forceUpdateKey changes (external update like fork)
  useEffect(() => {
    if (prevForceUpdateKeyRef.current !== sessionInput.forceUpdateKey) {
      logger.debug(
        '[HOOK]',
        'forceUpdateKey changed, syncing input value from store',
      );
      setLocalValue(sessionInput.value);
      setLocalCursorPosition(sessionInput.cursorPosition);
      prevForceUpdateKeyRef.current = sessionInput.forceUpdateKey;
    }
  }, [
    sessionInput.forceUpdateKey,
    sessionInput.value,
    sessionInput.cursorPosition,
  ]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const state: InputState = {
    value: localValue,
    cursorPosition: localCursorPosition,
    mode: getInputMode(localValue),
  };

  const setValue = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);
      if (sessionId) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          setSessionInput(sessionId, { value: newValue });
        }, INPUT_DEBOUNCE_MS);
      }
    },
    [sessionId, setSessionInput],
  );

  const setCursorPosition = useCallback(
    (pos: number) => {
      setLocalCursorPosition(pos);
      if (sessionId) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          setSessionInput(sessionId, { cursorPosition: pos });
        }, INPUT_DEBOUNCE_MS);
      }
    },
    [sessionId, setSessionInput],
  );

  const reset = useCallback(() => {
    if (sessionId) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setLocalValue('');
      setLocalCursorPosition(0);
      resetSessionInput(sessionId);
    }
  }, [sessionId, resetSessionInput]);

  // History helpers
  const historyIndex = sessionInput.historyIndex;
  const draftInput = sessionInput.draftInput;

  const setHistoryIndex = useCallback(
    (index: number | null) => {
      if (sessionId) {
        setSessionInput(sessionId, { historyIndex: index });
      }
    },
    [sessionId, setSessionInput],
  );

  const setDraftInput = useCallback(
    (input: string) => {
      if (sessionId) {
        setSessionInput(sessionId, { draftInput: input });
      }
    },
    [sessionId, setSessionInput],
  );

  const addToHistory = useCallback(
    (input: string) => {
      if (workspaceId) {
        addToWorkspaceHistory(workspaceId, input);
      }
    },
    [workspaceId, addToWorkspaceHistory],
  );

  // Plan mode and thinking
  const planMode = sessionInput.planMode;
  const thinking = sessionInput.thinking;
  const thinkingEnabled = sessionInput.thinkingEnabled;
  const thinkingVariants = sessionInput.thinkingVariants;

  const togglePlanMode = useCallback(() => {
    const newMode: PlanMode =
      planMode === 'normal'
        ? 'plan'
        : planMode === 'plan'
          ? 'brainstorm'
          : 'normal';
    setSessionInput(inputSessionId, { planMode: newMode });
  }, [inputSessionId, planMode, setSessionInput]);

  const toggleThinking = useCallback(() => {
    if (thinkingEnabled && thinkingVariants.length > 0) {
      const currentIndex =
        thinking === null ? -1 : thinkingVariants.indexOf(thinking);
      const nextIndex = currentIndex + 1;
      const newThinking: ThinkingLevel =
        nextIndex >= thinkingVariants.length
          ? null
          : thinkingVariants[nextIndex];
      setSessionInput(inputSessionId, { thinking: newThinking });
    }
  }, [
    inputSessionId,
    thinking,
    thinkingEnabled,
    thinkingVariants,
    setSessionInput,
  ]);

  const setThinkingEnabled = useCallback(
    (enabled: boolean) => {
      setSessionInput(inputSessionId, { thinkingEnabled: enabled });
    },
    [inputSessionId, setSessionInput],
  );

  const setThinking = useCallback(
    (level: ThinkingLevel) => {
      setSessionInput(inputSessionId, { thinking: level });
    },
    [inputSessionId, setSessionInput],
  );

  const setThinkingVariants = useCallback(
    (variants: string[]) => {
      setSessionInput(inputSessionId, { thinkingVariants: variants });
    },
    [inputSessionId, setSessionInput],
  );

  // Pasted text and image maps
  const pastedTextMap = sessionInput.pastedTextMap;
  const pastedImageMap = sessionInput.pastedImageMap;

  const setPastedTextMap = useCallback(
    (map: Record<string, string>) => {
      if (sessionId) {
        setSessionInput(sessionId, { pastedTextMap: map });
      }
    },
    [sessionId, setSessionInput],
  );

  const setPastedImageMap = useCallback(
    (map: Record<string, string>) => {
      if (sessionId) {
        setSessionInput(sessionId, { pastedImageMap: map });
      }
    },
    [sessionId, setSessionInput],
  );

  return {
    state,
    setValue,
    setCursorPosition,
    reset,
    // History
    history,
    historyIndex,
    draftInput,
    setHistoryIndex,
    setDraftInput,
    addToHistory,
    // Plan mode and thinking
    planMode,
    thinking,
    thinkingEnabled,
    thinkingVariants,
    togglePlanMode,
    toggleThinking,
    setThinkingEnabled,
    setThinking,
    setThinkingVariants,
    // Pasted maps
    pastedTextMap,
    pastedImageMap,
    setPastedTextMap,
    setPastedImageMap,
  };
}
