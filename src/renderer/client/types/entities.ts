export interface RepoData {
  path: string;
  name: string;
  workspaceIds: string[];
  metadata: {
    lastAccessed: number;
    settings?: Record<string, any>;
  };
  gitRemote?: {
    originUrl: string | null;
    defaultBranch: string | null;
  };
}

export interface WorkspaceData {
  id: string;
  repoPath: string;
  branch: string;
  worktreePath: string;
  gitState: {
    currentCommit: string;
    isDirty: boolean;
    pendingChanges: string[];
  };
  metadata: {
    createdAt: number;
    description: string;
    status: 'active' | 'archived' | 'stale';
  };
  context: {
    activeFiles: string[];
    settings?: Record<string, any>;
    preferences?: Record<string, any>;
  };
}

export interface SessionData {
  sessionId: string;
  modified: number;
  created: number;
  messageCount: number;
  summary: string;
}
