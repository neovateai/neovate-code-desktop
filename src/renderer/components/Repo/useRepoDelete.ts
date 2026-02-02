import { useState } from 'react';
import { useStore } from '../../store';

interface RepoDeleteInfo {
  path: string;
  name: string;
  workspaceCount: number;
}

export const useRepoDelete = () => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<RepoDeleteInfo | null>(null);
  const { deleteRepo, workspaces } = useStore();

  const handleDeleteRepoClick = (
    e: React.MouseEvent,
    repoPath: string,
    repoName: string,
  ) => {
    e.stopPropagation();
    const workspaceCount = Object.values(workspaces).filter(
      (w) => w.repoPath === repoPath,
    ).length;

    setRepoToDelete({
      path: repoPath,
      name: repoName,
      workspaceCount,
    });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = (onSuccess?: () => void) => {
    if (repoToDelete) {
      deleteRepo(repoToDelete.path);
      setDeleteDialogOpen(false);
      setRepoToDelete(null);
      onSuccess?.();
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setRepoToDelete(null);
  };

  return {
    deleteDialogOpen,
    repoToDelete,
    handleDeleteRepoClick,
    handleConfirmDelete,
    handleCancelDelete,
    setDeleteDialogOpen,
  };
};
