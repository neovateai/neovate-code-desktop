import { useStore } from '../store';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function RepoSelector() {
  const workspaces = useStore((state) => state.workspaces);
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const selectWorkspace = useStore((state) => state.selectWorkspace);
  const selectRepo = useStore((state) => state.selectRepo);

  const workspaceList = Object.values(workspaces);
  const selectedWorkspace = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]
    : null;

  const handleChange = (value: string | null) => {
    if (!value) return;
    const workspace = workspaces[value];
    if (workspace) {
      selectRepo(workspace.repoPath);
      selectWorkspace(value);
    }
  };

  return (
    <Select value={selectedWorkspace?.id ?? ''} onValueChange={handleChange}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a project...">
          {selectedWorkspace?.worktreePath.split('/').pop()}
        </SelectValue>
      </SelectTrigger>
      <SelectPopup>
        {workspaceList.map((ws) => (
          <SelectItem key={ws.id} value={ws.id}>
            {ws.worktreePath.split('/').pop()}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
