import { useCallback, useState, useRef } from 'react';
import { useInputState } from './useInputState';
import { useFileSuggestion } from './useFileSuggestion';
import { useSlashCommands, type SlashCommand } from './useSlashCommands';
import { usePasteManager } from './usePasteManager';
import { useImagePasteManager } from './useImagePasteManager';
import { useDoublePress } from './useDoublePress';
import { toastManager } from '../components/ui/toast';

const LARGE_PASTE_THRESHOLD = 800;

interface UseInputHandlersProps {
  sessionId: string | null;
  workspaceId: string | null;
  onSubmit: (value: string, images?: string[]) => void;
  onCancel: () => void;
  onShowForkModal: () => void;
  fetchPaths: () => Promise<string[]>;
  fetchCommands: () => Promise<SlashCommand[]>;
  isProcessing?: boolean;
}

export function useInputHandlers({
  sessionId,
  workspaceId,
  onSubmit,
  onCancel,
  onShowForkModal,
  fetchPaths,
  fetchCommands,
  isProcessing,
}: UseInputHandlersProps) {
  const inputState = useInputState(sessionId, workspaceId);
  const { value, cursorPosition, mode } = inputState.state;

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
    fetchPaths,
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
      if ((mode === 'bash' || mode === 'memory') && value.length === 1) {
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

    const prefix = fileSuggestion.triggerType === 'at' ? '@' : '';
    const before = value.substring(0, fileSuggestion.startIndex);
    const after = value
      .substring(fileSuggestion.startIndex + fileSuggestion.fullMatch.length)
      .trim();
    const newValue = `${before}${prefix}${selected} ${after}`.trim();

    inputState.setValue(newValue);
    inputState.setCursorPosition(`${before}${prefix}${selected} `.length);
    setForceTabTrigger(false);
  }, [fileSuggestion, inputState, value]);

  const handleSubmit = useCallback(() => {
    // Block submission during processing
    if (isProcessing) {
      toastManager.add({
        type: 'warning',
        title: 'Please wait',
        description: 'Processing previous message...',
      });
      return;
    }

    // When suggestions are visible, Enter only applies the suggestion without submitting
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

    const trimmed = value.trim();
    if (!trimmed) return;

    // In plan mode, show toast instead of submitting
    if (planMode === 'plan') {
      toastManager.add({
        type: 'info',
        title: 'Plan mode',
        description: 'Plan mode is not implemented yet',
      });
      return;
    }

    // In memory mode or bash mode, show toast instead of submitting
    if (mode === 'memory' || mode === 'bash') {
      toastManager.add({
        type: 'info',
        title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} mode`,
        description: `${mode.charAt(0).toUpperCase() + mode.slice(1)} mode is not implemented yet`,
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
    value,
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
    mode,
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

    if (historyIndex === null) {
      setDraftInput(value);
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
    value,
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
    const beforeCursor = value.substring(0, cursorPosition);
    return !beforeCursor.includes('\n');
  }, [value, cursorPosition]);

  const isAtLastLine = useCallback(() => {
    const afterCursor = value.substring(cursorPosition);
    return !afterCursor.includes('\n');
  }, [value, cursorPosition]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;

      // Escape handling
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDoubleEscape();
        return;
      }

      // Enter handling
      if (e.key === 'Enter') {
        if (e.metaKey || e.shiftKey || e.altKey) {
          return; // Allow newline
        }
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Tab handling
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
        } else if (value.trim()) {
          setForceTabTrigger(true);
        }
        return;
      }

      // Arrow up/down
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

      // Ctrl shortcuts
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            textarea.setSelectionRange(0, 0);
            inputState.setCursorPosition(0);
            break;
          case 'e':
            e.preventDefault();
            textarea.setSelectionRange(value.length, value.length);
            inputState.setCursorPosition(value.length);
            break;
          case 'd':
            if (value) {
              e.preventDefault();
              const newValue =
                value.slice(0, cursorPosition) +
                value.slice(cursorPosition + 1);
              inputState.setValue(newValue);
            }
            break;
          case 'f':
            e.preventDefault();
            if (cursorPosition < value.length) {
              inputState.setCursorPosition(cursorPosition + 1);
              textarea.setSelectionRange(
                cursorPosition + 1,
                cursorPosition + 1,
              );
            }
            break;
          case 'b':
            e.preventDefault();
            if (cursorPosition > 0) {
              inputState.setCursorPosition(cursorPosition - 1);
              textarea.setSelectionRange(
                cursorPosition - 1,
                cursorPosition - 1,
              );
            }
            break;
          case 'k':
            e.preventDefault();
            inputState.setValue(value.slice(0, cursorPosition));
            break;
          case 'u':
            e.preventDefault();
            inputState.setValue(value.slice(cursorPosition));
            inputState.setCursorPosition(0);
            textarea.setSelectionRange(0, 0);
            break;
          case 'w': {
            e.preventDefault();
            const beforeCursor = value.slice(0, cursorPosition);
            const wordMatch = beforeCursor.match(/\S+\s*$/);
            if (wordMatch) {
              const newPos = cursorPosition - wordMatch[0].length;
              inputState.setValue(
                value.slice(0, newPos) + value.slice(cursorPosition),
              );
              inputState.setCursorPosition(newPos);
              textarea.setSelectionRange(newPos, newPos);
            }
            break;
          }
          case 'h':
            e.preventDefault();
            if (cursorPosition > 0) {
              inputState.setValue(
                value.slice(0, cursorPosition - 1) +
                  value.slice(cursorPosition),
              );
              inputState.setCursorPosition(cursorPosition - 1);
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

      // Meta shortcuts
      if (e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b': {
            e.preventDefault();
            const beforeCursor = value.slice(0, cursorPosition);
            const match = beforeCursor.match(/\S+\s*$/);
            const newPos = match ? cursorPosition - match[0].length : 0;
            inputState.setCursorPosition(newPos);
            textarea.setSelectionRange(newPos, newPos);
            break;
          }
          case 'f': {
            e.preventDefault();
            const afterCursor = value.slice(cursorPosition);
            const match = afterCursor.match(/^\s*\S+/);
            const newPos = match
              ? cursorPosition + match[0].length
              : value.length;
            inputState.setCursorPosition(newPos);
            textarea.setSelectionRange(newPos, newPos);
            break;
          }
          case 'd': {
            e.preventDefault();
            const afterCursor = value.slice(cursorPosition);
            const match = afterCursor.match(/^\s*\S+/);
            if (match) {
              inputState.setValue(
                value.slice(0, cursorPosition) +
                  afterCursor.slice(match[0].length),
              );
            }
            break;
          }
          case 'backspace': {
            e.preventDefault();
            const beforeCursor = value.slice(0, cursorPosition);
            const match = beforeCursor.match(/\S+\s*$/);
            if (match) {
              const newPos = cursorPosition - match[0].length;
              inputState.setValue(
                value.slice(0, newPos) + value.slice(cursorPosition),
              );
              inputState.setCursorPosition(newPos);
            }
            break;
          }
        }
      }
    },
    [
      value,
      cursorPosition,
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

      // Check for images first
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const result = await imageManager.handleImagePaste(file);
            if (result.success && result.prompt) {
              const before = value.slice(0, cursorPosition);
              const after = value.slice(cursorPosition);
              inputState.setValue(`${before}${result.prompt} ${after}`);
              inputState.setCursorPosition(
                before.length + result.prompt.length + 1,
              );
            }
          }
          return;
        }
      }

      // Handle text paste
      const text = e.clipboardData.getData('text');
      if (text.length > LARGE_PASTE_THRESHOLD || text.includes('\n')) {
        e.preventDefault();
        const result = await pasteManager.handleTextPaste(text);
        if (result.success && result.prompt) {
          const before = value.slice(0, cursorPosition);
          const after = value.slice(cursorPosition);
          inputState.setValue(`${before}${result.prompt} ${after}`);
          inputState.setCursorPosition(
            before.length + result.prompt.length + 1,
          );
        }
      }
      // Small text: let browser handle normally
    },
    [value, cursorPosition, inputState, imageManager, pasteManager],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      inputState.setValue(newValue);
      inputState.setCursorPosition(e.target.selectionStart);
      setHistoryIndex(null);

      // Reset tab trigger if @ appears or value is empty
      if (newValue.includes('@') || newValue.trim() === '') {
        setForceTabTrigger(false);
      }
    },
    [inputState, setHistoryIndex],
  );

  const onSelect = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // @ts-ignore
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
    // Thinking state setters for external updates (e.g., model change)
    thinkingEnabled,
    setThinkingEnabled,
    setThinking,
  };
}
