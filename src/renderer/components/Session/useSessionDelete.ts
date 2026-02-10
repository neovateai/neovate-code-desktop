import { useCallback, useState } from 'react';
import { useStore } from '../../store';

export function useSessionDelete() {
  const workspaces = useStore((state) => state.workspaces);
  const sessions = useStore((state) => state.sessions);
  const removeSession = useStore((state) => state.removeSession);
  const selectSession = useStore((state) => state.selectSession);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const request = useStore((state) => state.request);

  const [confirmingSessionId, setConfirmingSessionId] = useState<string | null>(
    null,
  );

  const deleteSession = useCallback(
    async (workspaceId: string, sessionId: string, onDeleted?: () => void) => {
      const workspace = workspaces[workspaceId];
      const session = sessions[workspaceId]?.find(
        (s) => s.sessionId === sessionId,
      );
      if (!workspace || !session) return;

      const isLocalOnly = session.messageCount === 0;

      try {
        if (!isLocalOnly) {
          const result = await request('sessions.remove', {
            cwd: workspace.worktreePath,
            sessionId,
          });
          if (!result.success) {
            console.error('Failed to delete session:', result.error);
            return;
          }
        }

        removeSession(workspaceId, sessionId);

        if (selectedSessionId === sessionId) {
          const remaining = (sessions[workspaceId] || [])
            .filter((s) => s.sessionId !== sessionId)
            .sort((a, b) => b.modified - a.modified);
          selectSession(remaining.length > 0 ? remaining[0].sessionId : null);
        }

        onDeleted?.();
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    },
    [
      workspaces,
      sessions,
      removeSession,
      selectSession,
      selectedSessionId,
      request,
    ],
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
