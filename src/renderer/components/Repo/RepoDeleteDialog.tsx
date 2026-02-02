import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React from 'react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';

interface RepoDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repo: {
    path: string;
    name: string;
    workspaceCount: number;
  } | null;
  onConfirm: () => void;
}

export const RepoDeleteDialog: React.FC<RepoDeleteDialogProps> = ({
  open,
  onOpenChange,
  repo,
  onConfirm,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Repository?</AlertDialogTitle>
          <AlertDialogDescription>
            {repo &&
              `This will permanently delete '${repo.name}' and its ${repo.workspaceCount} workspace(s). This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose>
            <Button variant="outline">Cancel</Button>
          </AlertDialogClose>
          <Button variant="destructive" onClick={onConfirm} className="gap-2">
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
};
