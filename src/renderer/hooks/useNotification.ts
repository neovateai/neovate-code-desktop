import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export function useNotification(sessionId: string | null, cwd: string) {
  const request = useStore((state) => state.request);
  const selectedSessionId = useStore((state) => state.selectedSessionId);
  const sessionProcessing = useStore((state) =>
    sessionId ? state.sessionProcessing[sessionId] : null,
  );
  const approvalBySession = useStore((state) => state.approvalBySession);

  const prevStatusRef = useRef(sessionProcessing?.status);
  const prevApprovalRef = useRef(
    sessionId ? approvalBySession[sessionId] : null,
  );

  useEffect(() => {
    if (!sessionId || !cwd) return;

    const prevStatus = prevStatusRef.current;
    const prevApproval = prevApprovalRef.current;
    const currentStatus = sessionProcessing?.status;
    const currentApproval = approvalBySession[sessionId];

    prevStatusRef.current = currentStatus;
    prevApprovalRef.current = currentApproval;

    const isFocused = document.hasFocus() && selectedSessionId === sessionId;
    if (isFocused) return;

    const wasProcessing =
      prevStatus === 'processing' || prevStatus === 'awaiting_approval';
    const isEnteringApproval = !prevApproval && !!currentApproval;
    const shouldNotify =
      (wasProcessing && currentStatus === 'idle') || isEnteringApproval;

    if (shouldNotify) {
      request('config.get', { cwd, isGlobal: false, key: 'notification' }).then(
        (res) => {
          const notificationConfig = res.data?.value;
          if (notificationConfig !== false) {
            request('utils.notify', { cwd, config: notificationConfig });
          }
        },
      );
    }
  }, [
    sessionProcessing?.status,
    approvalBySession,
    sessionId,
    selectedSessionId,
    cwd,
    request,
  ]);
}
