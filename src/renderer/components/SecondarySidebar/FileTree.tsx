import { ChevronRight, FolderIcon, Plus } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';

import { useStore } from '../../store';
import { useAppLayoutPanels } from '../layout/AppLayoutProvider';

import './index.css';

interface IFileTreeItemBase {
  fullPath: string;
  relPath: string;
  isFolder: boolean;
  children: IFileTreeItem[];
}

// TODO: More status and ext about file node
interface IFileTreeItem extends IFileTreeItemBase {
  editStatus?: 'rename' | '';
}

function FileLangIcon(props: { path: string; size?: number }) {
  const { path, size = 14 } = props;
  const filename = path.split('/').pop() || path;
  const suffix = filename.split('.').pop();

  return (
    <div
      className="seti-icon"
      data-lang={suffix}
      style={{ fontSize: size }}
    ></div>
  );
}

interface TreeNodeProps {
  item: IFileTreeItem;
  level: number;
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
  selectedKey: string | null;
  onSelect: (item: IFileTreeItem) => void;
}

function TreeNode({
  item,
  level,
  expandedKeys,
  onToggleExpand,
  selectedKey,
  onSelect,
}: TreeNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = expandedKeys.has(item.relPath);
  const isSelected = selectedKey === item.relPath;
  const hasChildren = item.children && item.children.length > 0;
  const filename = item.relPath.split('/').pop() || item.relPath;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.isFolder) {
      onToggleExpand(item.relPath);
    }
  };

  const handleClick = () => {
    onSelect(item);
    if (item.isFolder) {
      onToggleExpand(item.relPath);
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Add action for:', item.fullPath);
    // TODO: Add to Chat
  };

  return (
    <div className="select-none relative group">
      <div
        className={`flex items-center py-0.5 px-2 rounded cursor-pointer text-sm transition-colors relative z-0 group ${isSelected ? 'bg-accent ring-1 ring-gray-200 dark:ring-gray-600' : 'hover:bg-accent/80'}`}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {item.isFolder && (
          <div
            className="flex items-center justify-center w-4 h-4 mr-1"
            onClick={handleToggle}
          >
            {hasChildren && (
              <HugeiconsIcon
                icon={ChevronRight}
                size={12}
                strokeWidth={1.5}
                className={`transition-transform text-muted-foreground ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </div>
        )}

        {!item.isFolder && <div className="w-4 mr-1" />}

        {item.isFolder ? (
          <HugeiconsIcon
            icon={FolderIcon}
            size={12}
            strokeWidth={1.5}
            className="text-muted-foreground flex-shrink-0 mr-1"
          />
        ) : (
          <FileLangIcon path={item.fullPath} />
        )}

        <span
          className="truncate text-foreground ml-0.5 flex-1"
          title={item.fullPath}
        >
          {filename}
          {item.editStatus === 'rename' && (
            <span className="ml-1 text-xs text-muted-foreground">
              (重命名中)
            </span>
          )}
        </span>

        {isHovered && (
          <div
            className="flex items-center justify-center w-4 h-4 ml-1"
            onClick={handlePlusClick}
            title="Add to chat"
          >
            <HugeiconsIcon
              icon={Plus}
              size={12}
              strokeWidth={1.5}
              className="text-muted-foreground hover:text-foreground transition-colors"
            />
          </div>
        )}
      </div>

      {item.isFolder && hasChildren && isExpanded && (
        <div className="mt-0.5">
          {item.children.map((child) => (
            <TreeNode
              key={child.relPath}
              item={child}
              level={level + 1}
              expandedKeys={expandedKeys}
              onToggleExpand={onToggleExpand}
              selectedKey={selectedKey}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<IFileTreeItem[]>([]);

  const { getPanel, toggle } = useAppLayoutPanels();
  const { request } = useStore();
  const setPendingTabRequest = useStore((s) => s.setPendingTabRequest);

  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const workspaces = useStore((state) => state.workspaces);
  const cwd = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]?.worktreePath
    : null;

  useEffect(() => {
    init();
  }, [cwd]);

  const init = async () => {
    if (!cwd) {
      return;
    }
    request<any>('fs.tree', { cwd }).then((res) => {
      if (res?.data?.tree) {
        setTreeData(res.data.tree);
      }
    });
  };

  const handleToggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSelect = (item: IFileTreeItem) => {
    setSelectedKey(item.relPath);
    if (!item.isFolder) {
      console.log('OPEN FILE', item);
      if (!getPanel('contentPanel').visible) {
        toggle('contentPanel');
      }
      setPendingTabRequest({
        uri: item.fullPath,
        repoPath: cwd || '',
        type: 'editor',
      });
    }
  };

  return (
    <div className="p-2">
      <div className="text-sm">
        {treeData.map((item) => (
          <TreeNode
            key={item.relPath}
            item={item}
            level={0}
            expandedKeys={expandedKeys}
            onToggleExpand={handleToggleExpand}
            selectedKey={selectedKey}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
