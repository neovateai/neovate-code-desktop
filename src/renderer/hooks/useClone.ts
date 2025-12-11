import { useCallback, useEffect, useRef } from 'react';
import type { ElectronAPI } from '../../shared/types';
import {
  CloneErrorCode,
  detectCloneErrorCode,
  getCloneErrorMessage,
} from '../../shared/cloneErrors';
import { useStore } from '../store';
import { toastManager } from '../components/ui/toast';
import { withTimeout } from '../lib/promiseUtils';

const CLONE_TIMEOUT_MS = 35 * 60 * 1000; // 35 minutes

interface UseCloneOptions {
  onCloneStart?: (progress: number, taskId: string) => void;
  onCloneComplete?: () => void;
}

interface UseCloneReturn {
  isCloning: boolean;
  progress: number;
  cloneUrl: (url: string) => Promise<void>;
  cancelClone: () => Promise<void>;
  resetCloneState: () => void;
}

/**
 * Hook for managing Git clone operations
 * Provides a clean interface for cloning repositories with proper error handling and progress tracking
 */
export function useClone(options: UseCloneOptions = {}): UseCloneReturn {
  const { onCloneStart, onCloneComplete } = options;
  const {
    request,
    addRepo,
    addWorkspace,
    onEvent: subscribeToEvent,
    cloneState,
    updateCloneState,
  } = useStore();

  const currentTaskIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Subscribe to clone progress events
  useEffect(() => {
    const handleProgress = (data: {
      taskId: string;
      percent: number;
      message: string;
    }) => {
      // Only process events for current task
      if (data.taskId === currentTaskIdRef.current) {
        const percent = Math.round(data.percent || 0);
        onCloneStart?.(percent, data.taskId);
      }
    };

    const unsubscribe = subscribeToEvent<{
      taskId: string;
      percent: number;
      message: string;
    }>('git.clone.progress', handleProgress);

    return unsubscribe;
  }, [subscribeToEvent, onCloneStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentTaskIdRef.current && cloneState.status === 'cloning') {
        // Use the cancelClone function directly
        request('git.clone.cancel', { taskId: currentTaskIdRef.current }).catch(
          console.error,
        );
      }
    };
  }, [cloneState.status, request]);

  // Validate Git URL
  const validateGitUrl = (url: string): boolean => {
    const trimmedUrl = url.trim();
    return (
      trimmedUrl.startsWith('http://') ||
      trimmedUrl.startsWith('https://') ||
      trimmedUrl.startsWith('git@') ||
      trimmedUrl.endsWith('.git')
    );
  };

  // Handle clone errors - now toast is managed by the calling code
  const handleCloneError = (error: unknown): void => {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorCode = detectCloneErrorCode(errorMessage);

    // Only show toast for non-cancelled errors (cancelled is handled elsewhere)
    if (errorCode !== CloneErrorCode.CANCELLED) {
      toastManager.add({
        title: 'Clone Failed',
        description: getCloneErrorMessage(errorCode, errorMessage),
        type: 'error',
      });
    }
  };

  // Get clone location from user
  const selectCloneLocation = async (): Promise<string | null> => {
    const electron = window.electron as ElectronAPI | undefined;
    if (!electron?.selectCloneLocation) {
      toastManager.add({
        title: 'Error',
        description: 'Directory selection is not available',
        type: 'error',
      });
      return null;
    }

    return await electron.selectCloneLocation();
  };

  // Add repository and workspaces after successful clone
  const addRepositoryToStore = async (clonePath: string): Promise<void> => {
    try {
      // Get repository info
      const repoInfoResponse = await request('project.getRepoInfo', {
        cwd: clonePath,
      });

      if (!repoInfoResponse.success || !repoInfoResponse.data?.repoData) {
        throw new Error(
          repoInfoResponse.error || 'Could not load repository information',
        );
      }

      const repoData = repoInfoResponse.data.repoData;

      // Add the repository to the store
      addRepo(repoData);

      // Fetch and add workspaces for this repository
      const workspacesResponse = await request('project.workspaces.list', {
        cwd: clonePath,
      });

      if (workspacesResponse.success && workspacesResponse.data?.workspaces) {
        for (const workspace of workspacesResponse.data.workspaces) {
          addWorkspace(workspace);
        }
      }

      // Show success toast
      toastManager.add({
        title: 'Repository cloned',
        description: `Successfully cloned ${repoData.name}`,
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to add repository to store:', error);
      // Don't throw here - the clone was successful, just the store update failed
      toastManager.add({
        title: 'Warning',
        description: 'Repository cloned but failed to load in UI',
        type: 'warning',
      });
    }
  };

  // Clone a repository
  const cloneUrl = useCallback(
    async (url: string): Promise<void> => {
      const trimmedUrl = url.trim();
      if (!trimmedUrl || cloneState.status === 'cloning') {
        return;
      }

      // Validate URL
      if (!validateGitUrl(trimmedUrl)) {
        toastManager.add({
          title: 'Invalid URL',
          description: 'Please enter a valid Git repository URL',
          type: 'error',
        });
        return;
      }

      // Get clone location
      const cloneLocation = await selectCloneLocation();
      if (!cloneLocation) {
        return;
      }

      // Generate unique task ID
      const taskId = `clone-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      currentTaskIdRef.current = taskId;
      abortControllerRef.current = new AbortController();

      // Update clone state in store
      updateCloneState({
        taskId,
        url: trimmedUrl,
        destination: cloneLocation,
        status: 'cloning',
        progress: 0,
        error: null,
        errorCode: null,
        clonePath: null,
        startTime: Date.now(),
      });

      try {
        // Notify start
        onCloneStart?.(0, taskId);

        // Execute clone with timeout
        const clonePromise = request('git.clone', {
          url: trimmedUrl,
          destination: cloneLocation,
          taskId,
        });

        const cloneResponse = await withTimeout(
          clonePromise,
          CLONE_TIMEOUT_MS,
          'Clone operation',
        );

        if (!cloneResponse.success || !cloneResponse.data) {
          const errorCode = (cloneResponse.errorCode ||
            'UNKNOWN') as CloneErrorCode;

          // Update error state
          updateCloneState({
            status:
              errorCode === CloneErrorCode.CANCELLED ? 'cancelled' : 'failed',
            error: cloneResponse.error || 'Clone failed',
            errorCode,
          });

          // Handle cancellation specially
          if (errorCode === CloneErrorCode.CANCELLED) {
            toastManager.add({
              title: 'Clone cancelled',
              description: getCloneErrorMessage(CloneErrorCode.CANCELLED),
              type: 'info',
            });
            return;
          }

          throw new Error(cloneResponse.error || 'Clone failed');
        }

        const clonePath = cloneResponse.data.clonePath;

        // Update success state
        updateCloneState({
          status: 'success',
          progress: 100,
          clonePath,
        });

        // Add repository to store
        await addRepositoryToStore(clonePath);
      } catch (error) {
        // Check if operation was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        console.error('[Clone] Error:', error);

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const errorCode = detectCloneErrorCode(errorMessage);

        // Update error state
        updateCloneState({
          status:
            errorCode === CloneErrorCode.CANCELLED ? 'cancelled' : 'failed',
          error: errorMessage,
          errorCode,
        });

        handleCloneError(error);
      } finally {
        // Cleanup
        currentTaskIdRef.current = null;
        abortControllerRef.current = null;
        onCloneComplete?.();
      }
    },
    [
      cloneState.status,
      onCloneStart,
      onCloneComplete,
      request,
      addRepo,
      addWorkspace,
      updateCloneState,
    ],
  );

  // Cancel current clone operation
  const cancelClone = useCallback(async (): Promise<void> => {
    const taskId = currentTaskIdRef.current;
    if (!taskId || cloneState.status !== 'cloning') {
      return;
    }

    // Abort the operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Update cancelled state
    updateCloneState({
      status: 'cancelled',
      error: 'Clone operation cancelled by user',
      errorCode: 'CANCELLED',
    });

    try {
      await request('git.clone.cancel', { taskId });
    } catch (error) {
      console.error('Failed to cancel clone:', error);
    }
  }, [cloneState.status, request, updateCloneState]);

  // Reset clone state
  const resetLocalCloneState = useCallback(() => {
    currentTaskIdRef.current = null;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    isCloning: cloneState.status === 'cloning',
    progress: cloneState.progress,
    cloneUrl,
    cancelClone,
    resetCloneState: resetLocalCloneState,
  };
}
