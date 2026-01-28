import { useEffect } from 'react';
import { useStore } from '../store';
import { matchesBinding, DEFAULT_KEYBINDINGS } from '../lib/keybindings';

/**
 * Global keybinding handler for app-wide shortcuts.
 * Handles: New Chat, Prev/Next Session, Copy Path
 */
export function useGlobalKeybindings(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        keybindings,
        selectedWorkspaceId,
        showSettings,
        onboardingVisible,
        createOrSelectEmptySession,
        selectPrevSession,
        selectNextSession,
        workspaces,
        copyPathToClipboard,
      } = useStore.getState();

      // Don't handle shortcuts when in settings or onboarding
      if (showSettings || onboardingVisible) return;

      // New Chat
      if (matchesBinding(e, keybindings.newChat)) {
        e.preventDefault();

        if (selectedWorkspaceId) {
          createOrSelectEmptySession();

          // Dispatch focus event for ChatInput to pick up
          window.dispatchEvent(new CustomEvent('chat-input:focus'));
        }
        return;
      }

      // Previous Session
      if (matchesBinding(e, keybindings.prevSession)) {
        e.preventDefault();
        selectPrevSession();
        return;
      }

      // Next Session
      if (matchesBinding(e, keybindings.nextSession)) {
        e.preventDefault();
        selectNextSession();
        return;
      }

      // Copy Path
      if (
        matchesBinding(e, keybindings.copyPath ?? DEFAULT_KEYBINDINGS.copyPath)
      ) {
        e.preventDefault();
        const workspace = selectedWorkspaceId
          ? workspaces[selectedWorkspaceId]
          : null;
        if (workspace) {
          copyPathToClipboard(workspace.worktreePath);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
