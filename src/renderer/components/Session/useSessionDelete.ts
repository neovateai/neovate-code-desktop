import { useCallback, useState } from 'react';
import { useStore } from '../../store';

export function useSessionDelete() {
  const [confirmingSessionId, setConfirmingSessionId] = useState<string | null>(
    null,
  );

  const deleteSession = useCallback(
    async (workspaceId: string, sessionId: string, onDeleted?: () => void) => {
      // Read from getState() at call time — no subscriptions needed
      const state = useStore.getState();
      const workspace = state.workspaces[workspaceId];
      const session = state.sessions[workspaceId]?.find(
        (s) => s.sessionId === sessionId,
      );
      if (!workspace || !session) return;

      const isLocalOnly = session.messageCount === 0;

      try {
        if (!isLocalOnly) {
          const result = await state.request('sessions.remove', {
            cwd: workspace.worktreePath,
            sessionId,
          });
          if (!result.success) {
            console.error('Failed to delete session:', result.error);
            return;
          }
        }

        state.removeSession(workspaceId, sessionId);

        if (state.selectedSessionId === sessionId) {
          const remaining = (state.sessions[workspaceId] || [])
            .filter((s) => s.sessionId !== sessionId)
            .sort((a, b) => b.modified - a.modified);
          state.selectSession(
            remaining.length > 0 ? remaining[0].sessionId : null,
          );
        }

        onDeleted?.();
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    },
    [],
  );

  const startDelete = useCallback((sessionId: string) => {
    setConfirmingSessionId(sessionId);
  }, []);

  const cancelDelete = useCallback(() => {
    setConfirmingSessionId(null);
  }, []);

  const confirmDelete = useCallback(
    async (workspaceId: string, sessionId: string) => {
      await deleteSession(workspaceId, sessionId);
      setConfirmingSessionId(null);
    },
    [deleteSession],
  );

  return {
    /** Direct delete without confirmation (for context menus) */
    deleteSession,
    /** Session ID currently awaiting inline confirmation */
    confirmingSessionId,
    /** First click: show inline confirm button */
    startDelete,
    /** Cancel inline confirmation (e.g. on mouse leave) */
    cancelDelete,
    /** Second click: perform the delete */
    confirmDelete,
  };
}
