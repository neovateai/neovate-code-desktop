import { useCallback, useEffect, useRef, useState } from 'react';
import { toastManager } from '../components/ui/toast';
import type {
  HandlerInput,
  HandlerMethod,
  HandlerOutput,
} from '../nodeBridge.types';
import { useDoublePress } from './useDoublePress';
import { useFileSuggestion } from './useFileSuggestion';
import { useImagePasteManager } from './useImagePasteManager';
import { useInputState } from './useInputState';
import { usePasteManager } from './usePasteManager';
import { type SlashCommand, useSlashCommands } from './useSlashCommands';

const LARGE_PASTE_THRESHOLD = 800;

interface UseInputHandlersProps {
  sessionId: string | null;
  workspaceId: string | null;
  onSubmit: (value: string, images?: string[]) => void;
  onCancel: () => void;
  onShowForkModal: () => void;
  fetchCommands: () => Promise<SlashCommand[]>;
  isProcessing?: boolean;
  request: <K extends HandlerMethod>(
    method: K,
    params: HandlerInput<K>,
  ) => Promise<HandlerOutput<K>>;
  cwd: string;
}

export function useInputHandlers({
  sessionId,
  workspaceId,
  onSubmit,
  onCancel,
  onShowForkModal,
  fetchCommands,
  isProcessing,
  request,
  cwd,
}: UseInputHandlersProps) {
  const inputState = useInputState(sessionId, workspaceId);
  const { value, cursorPosition, mode } = inputState.state;

  const valueRef = useRef(value);
  const cursorPositionRef = useRef(cursorPosition);
  const modeRef = useRef(mode);

  useEffect(() => {
    valueRef.current = value;
    cursorPositionRef.current = cursorPosition;
    modeRef.current = mode;
  }, [value, cursorPosition, mode]);

  const {
    historyIndex,
    history,
    draftInput,
    planMode,
    thinkingEnabled,
    setHistoryIndex,
    setDraftInput,
    addToHistory,
    togglePlanMode,
    toggleThinking,
    setThinkingEnabled,
    setThinking,
    pastedTextMap,
    pastedImageMap,
    setPastedTextMap,
    setPastedImageMap,
  } = inputState;

  const [forceTabTrigger, setForceTabTrigger] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fileSuggestion = useFileSuggestion({
    value,
    cursorPosition,
    forceTabTrigger,
    request,
    cwd,
  });

  const slashCommands = useSlashCommands({ value, fetchCommands });
  const pasteManager = usePasteManager(pastedTextMap, setPastedTextMap);
  const imageManager = useImagePasteManager(pastedImageMap, setPastedImageMap);

  const hasSuggestions =
    fileSuggestion.matchedPaths.length > 0 ||
    slashCommands.suggestions.length > 0;

  const handleDoubleEscape = useDoublePress(
    onShowForkModal,
    () => {
      const currentMode = modeRef.current;
      const currentValue = valueRef.current;
      if (
        (currentMode === 'bash' || currentMode === 'memory') &&
        currentValue.length === 1
      ) {
        inputState.setValue('');
      } else {
        onCancel();
      }
    },
    1000,
  );

  const applyFileSuggestion = useCallback(() => {
    const selected = fileSuggestion.getSelected();
    if (!selected) return;

    const currentValue = valueRef.current;
    const prefix = fileSuggestion.triggerType === 'at' ? '@' : '';
    const before = currentValue.substring(0, fileSuggestion.startIndex);
    const after = currentValue
      .substring(fileSuggestion.startIndex + fileSuggestion.fullMatch.length)
      .trim();
    const newValue = `${before}${prefix}${selected} ${after}`.trim();

    inputState.setValue(newValue);
    inputState.setCursorPosition(`${before}${prefix}${selected} `.length);
    setForceTabTrigger(false);
    fileSuggestion.reset();
  }, [fileSuggestion, inputState]);

  const handleSubmit = useCallback(() => {
    if (isProcessing) {
      toastManager.add({
        type: 'warning',
        title: 'Please wait',
        description: 'Processing previous message...',
      });
      return;
    }

    if (slashCommands.suggestions.length > 0) {
      const completed = slashCommands.getCompletedCommand();
      inputState.setValue(completed);
      inputState.setCursorPosition(completed.length);
      return;
    }

    if (fileSuggestion.matchedPaths.length > 0) {
      applyFileSuggestion();
      return;
    }

    const currentValue = valueRef.current;
    const currentPlanMode = planMode;
    const currentMode = modeRef.current;
    const trimmed = currentValue.trim();
    if (!trimmed) return;

    if (currentPlanMode === 'plan') {
      toastManager.add({
        type: 'info',
        title: 'Plan mode',
        description: 'Plan mode is not implemented yet',
      });
      return;
    }

    if (currentMode === 'memory' || currentMode === 'bash') {
      toastManager.add({
        type: 'info',
        title: `${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} mode`,
        description: `${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} mode is not implemented yet`,
      });
      return;
    }

    const { expandedMessage, images } = imageManager.expandImageReferences(
      pasteManager.expandPastedText(trimmed),
    );

    addToHistory(trimmed);
    inputState.reset();
    onSubmit(expandedMessage, images.length > 0 ? images : undefined);
  }, [
    slashCommands,
    fileSuggestion,
    applyFileSuggestion,
    inputState,
    onSubmit,
    addToHistory,
    pasteManager,
    imageManager,
    planMode,
    isProcessing,
  ]);

  const handleHistoryUp = useCallback(() => {
    if (hasSuggestions) {
      if (slashCommands.suggestions.length > 0) {
        slashCommands.navigatePrevious();
      } else {
        fileSuggestion.navigatePrevious();
      }
      return;
    }

    if (history.length === 0) return;

    const currentValue = valueRef.current;
    if (historyIndex === null) {
      setDraftInput(currentValue);
      setHistoryIndex(history.length - 1);
      inputState.setValue(history[history.length - 1]);
    } else if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      inputState.setValue(history[historyIndex - 1]);
    }
    inputState.setCursorPosition(0);
  }, [
    hasSuggestions,
    slashCommands,
    fileSuggestion,
    history,
    historyIndex,
    setDraftInput,
    setHistoryIndex,
    inputState,
  ]);

  const handleHistoryDown = useCallback(() => {
    if (hasSuggestions) {
      if (slashCommands.suggestions.length > 0) {
        slashCommands.navigateNext();
      } else {
        fileSuggestion.navigateNext();
      }
      return;
    }

    if (historyIndex === null) return;

    if (historyIndex === history.length - 1) {
      setHistoryIndex(null);
      inputState.setValue(draftInput);
    } else {
      setHistoryIndex(historyIndex + 1);
      inputState.setValue(history[historyIndex + 1]);
    }
  }, [
    hasSuggestions,
    slashCommands,
    fileSuggestion,
    historyIndex,
    history,
    draftInput,
    setHistoryIndex,
    inputState,
  ]);

  const isAtFirstLine = useCallback(() => {
    const currentValue = valueRef.current;
    const currentCursorPosition = cursorPositionRef.current;
    const beforeCursor = currentValue.substring(0, currentCursorPosition);
    return !beforeCursor.includes('\n');
  }, []);

  const isAtLastLine = useCallback(() => {
    const currentValue = valueRef.current;
    const currentCursorPosition = cursorPositionRef.current;
    const afterCursor = currentValue.substring(currentCursorPosition);
    return !afterCursor.includes('\n');
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      const currentValue = valueRef.current;
      const currentCursorPosition = cursorPositionRef.current;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleDoubleEscape();
        return;
      }

      if (e.key === 'Enter') {
        // Ignore Enter during IME composition (e.g., Chinese input selecting candidates)
        if (e.nativeEvent.isComposing) {
          return;
        }
        if (e.altKey) {
          e.preventDefault();
          const before = currentValue.slice(0, currentCursorPosition);
          const after = currentValue.slice(currentCursorPosition);
          const newPos = currentCursorPosition + 1;
          inputState.setValue(`${before}\n${after}`);
          inputState.setCursorPosition(newPos);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(newPos, newPos);
          });
          return;
        }
        if (e.metaKey || e.shiftKey) {
          return;
        }
        e.preventDefault();
        handleSubmit();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          togglePlanMode();
          return;
        }
        if (hasSuggestions) {
          if (slashCommands.suggestions.length > 0) {
            const completed = slashCommands.getCompletedCommand();
            inputState.setValue(completed);
            inputState.setCursorPosition(completed.length);
          } else {
            applyFileSuggestion();
          }
        } else if (currentValue.trim()) {
          setForceTabTrigger(true);
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        if (e.altKey || e.metaKey) {
          e.preventDefault();
          return;
        }
        if (hasSuggestions || isAtFirstLine()) {
          e.preventDefault();
          handleHistoryUp();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        if (hasSuggestions || isAtLastLine()) {
          e.preventDefault();
          handleHistoryDown();
        }
        return;
      }

      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            textarea.setSelectionRange(0, 0);
            inputState.setCursorPosition(0);
            break;
          case 'e':
            e.preventDefault();
            textarea.setSelectionRange(
              currentValue.length,
              currentValue.length,
            );
            inputState.setCursorPosition(currentValue.length);
            break;
          case 'd':
            if (currentValue) {
              e.preventDefault();
              const newValue =
                currentValue.slice(0, currentCursorPosition) +
                currentValue.slice(currentCursorPosition + 1);
              inputState.setValue(newValue);
            }
            break;
          case 'f':
            e.preventDefault();
            if (currentCursorPosition < currentValue.length) {
              inputState.setCursorPosition(currentCursorPosition + 1);
              textarea.setSelectionRange(
                currentCursorPosition + 1,
                currentCursorPosition + 1,
              );
            }
            break;
          case 'b':
            e.preventDefault();
            if (currentCursorPosition > 0) {
              inputState.setCursorPosition(currentCursorPosition - 1);
              textarea.setSelectionRange(
                currentCursorPosition - 1,
                currentCursorPosition - 1,
              );
            }
            break;
          case 'k':
            e.preventDefault();
            inputState.setValue(currentValue.slice(0, currentCursorPosition));
            break;
          case 'u':
            e.preventDefault();
            inputState.setValue(currentValue.slice(currentCursorPosition));
            inputState.setCursorPosition(0);
            textarea.setSelectionRange(0, 0);
            break;
          case 'w': {
            e.preventDefault();
            const beforeCursor = currentValue.slice(0, currentCursorPosition);
            const wordMatch = beforeCursor.match(/\S+\s*$/);
            if (wordMatch) {
              const newPos = currentCursorPosition - wordMatch[0].length;
              inputState.setValue(
                currentValue.slice(0, newPos) +
                  currentValue.slice(currentCursorPosition),
              );
              inputState.setCursorPosition(newPos);
              textarea.setSelectionRange(newPos, newPos);
            }
            break;
          }
          case 'h':
            e.preventDefault();
            if (currentCursorPosition > 0) {
              inputState.setValue(
                currentValue.slice(0, currentCursorPosition - 1) +
                  currentValue.slice(currentCursorPosition),
              );
              inputState.setCursorPosition(currentCursorPosition - 1);
            }
            break;
          case 't':
            e.preventDefault();
            toggleThinking();
            break;
          case 'n':
            e.preventDefault();
            handleHistoryDown();
            break;
          case 'p':
            e.preventDefault();
            handleHistoryUp();
            break;
        }
        return;
      }

      if (e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b': {
            e.preventDefault();
            const beforeCursor = currentValue.slice(0, currentCursorPosition);
            const match = beforeCursor.match(/\S+\s*$/);
            const newPos = match ? currentCursorPosition - match[0].length : 0;
            inputState.setCursorPosition(newPos);
            textarea.setSelectionRange(newPos, newPos);
            break;
          }
          case 'f': {
            e.preventDefault();
            const afterCursor = currentValue.slice(currentCursorPosition);
            const match = afterCursor.match(/^\s*\S+/);
            const newPos = match
              ? currentCursorPosition + match[0].length
              : currentValue.length;
            inputState.setCursorPosition(newPos);
            textarea.setSelectionRange(newPos, newPos);
            break;
          }
          case 'd': {
            e.preventDefault();
            const afterCursor = currentValue.slice(currentCursorPosition);
            const match = afterCursor.match(/^\s*\S+/);
            if (match) {
              inputState.setValue(
                currentValue.slice(0, currentCursorPosition) +
                  afterCursor.slice(match[0].length),
              );
            }
            break;
          }
          case 'backspace': {
            e.preventDefault();
            const beforeCursor = currentValue.slice(0, currentCursorPosition);
            const match = beforeCursor.match(/\S+\s*$/);
            if (match) {
              const newPos = currentCursorPosition - match[0].length;
              inputState.setValue(
                currentValue.slice(0, newPos) +
                  currentValue.slice(currentCursorPosition),
              );
              inputState.setCursorPosition(newPos);
            }
            break;
          }
        }
      }
    },
    [
      hasSuggestions,
      slashCommands,
      inputState,
      handleSubmit,
      handleHistoryUp,
      handleHistoryDown,
      handleDoubleEscape,
      applyFileSuggestion,
      togglePlanMode,
      toggleThinking,
      isAtFirstLine,
      isAtLastLine,
    ],
  );

  const onPaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const currentValue = valueRef.current;
      const currentCursorPosition = cursorPositionRef.current;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const result = await imageManager.handleImagePaste(file);
            if (result.success && result.prompt) {
              const before = currentValue.slice(0, currentCursorPosition);
              const after = currentValue.slice(currentCursorPosition);
              inputState.setValue(`${before}${result.prompt} ${after}`);
              inputState.setCursorPosition(
                before.length + result.prompt.length + 1,
              );
            }
          }
          return;
        }
      }

      const text = e.clipboardData.getData('text');
      if (text.length > LARGE_PASTE_THRESHOLD || text.includes('\n')) {
        e.preventDefault();
        const result = await pasteManager.handleTextPaste(text);
        if (result.success && result.prompt) {
          const before = currentValue.slice(0, currentCursorPosition);
          const after = currentValue.slice(currentCursorPosition);
          inputState.setValue(`${before}${result.prompt} ${after}`);
          inputState.setCursorPosition(
            before.length + result.prompt.length + 1,
          );
        }
      }
    },
    [inputState, imageManager, pasteManager],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      inputState.setValue(newValue);
      inputState.setCursorPosition(e.target.selectionStart);
      if (historyIndex !== null) {
        setHistoryIndex(null);
      }

      if (newValue.includes('@') || newValue.trim() === '') {
        setForceTabTrigger(false);
      }
    },
    [inputState, historyIndex, setHistoryIndex],
  );

  const onSelect = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // @ts-expect-error
      inputState.setCursorPosition(e.target.selectionStart);
    },
    [inputState],
  );

  return {
    inputState,
    mode,
    textareaRef,
    handlers: {
      onKeyDown,
      onPaste,
      onChange,
      onSelect,
    },
    suggestions: {
      type:
        slashCommands.suggestions.length > 0
          ? ('slash' as const)
          : fileSuggestion.matchedPaths.length > 0
            ? ('file' as const)
            : null,
      items:
        slashCommands.suggestions.length > 0
          ? slashCommands.suggestions
          : fileSuggestion.matchedPaths,
      selectedIndex:
        slashCommands.suggestions.length > 0
          ? slashCommands.selectedIndex
          : fileSuggestion.selectedIndex,
    },
    imageManager,
    thinkingEnabled,
    setThinkingEnabled,
    setThinking,
    isSearching: fileSuggestion.isLoading,
  };
}
