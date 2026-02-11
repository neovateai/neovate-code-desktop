import {
  ChevronRight,
  FolderIcon,
  Plus,
  Trash,
  Copy,
  Edit,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';

import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
  ContextMenuItem,
} from '../ui/context-menu';

import '../../styles/seti.css';

interface IFileTreeItemBase {
  fullPath: string;
  relPath: string;
  isFolder: boolean;
  children: IFileTreeItem[];
}

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
  onDelete: (item: IFileTreeItem) => void;
  onRename: (oldPath: string, newPath: string) => void;
}

export function TreeNode({
  item,
  level,
  expandedKeys,
  onToggleExpand,
  selectedKey,
  onSelect,
  onDelete,
  onRename,
}: TreeNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const isExpanded = expandedKeys.has(item.fullPath);
  const isSelected = selectedKey === item.fullPath;
  const hasChildren = item.children && item.children.length > 0;
  const filename = item.relPath.split('/').pop() || item.relPath;

  const { t } = useTranslation();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.isFolder) {
      onToggleExpand(item.fullPath);
    }
  };

  const handleClick = () => {
    if (isRenaming) return;
    onSelect(item);
    if (item.isFolder) {
      onToggleExpand(item.fullPath);
    }
  };

  const insertTextToChatInput = useStore(
    (state) => state.insertTextToChatInput,
  );

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    insertTextToChatInput(`@${item.relPath} `);
  };

  const handleStartRename = () => {
    setRenameValue(filename);
    setIsRenaming(true);
  };

  const handleSaveRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== filename) {
      const parentPath = item.fullPath.substring(
        0,
        item.fullPath.lastIndexOf('/'),
      );
      const newFullPath = `${parentPath}/${trimmed}`;

      onRename(item.fullPath, newFullPath);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  const handleContextMenuAction = (action: string) => {
    if (action === 'rename') {
      handleStartRename();
    } else if (action === 'delete') {
      onDelete(item);
    } else if (action === 'copyPath') {
      navigator.clipboard.writeText(item.fullPath);
    }
  };

  const renderContextMenu = () => {
    return (
      <>
        <ContextMenuItem onClick={() => handleContextMenuAction('copyPath')}>
          <HugeiconsIcon icon={Copy} size={14} strokeWidth={1.5} />
          {t('fileTree.copyPath')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction('rename')}>
          <HugeiconsIcon icon={Edit} size={14} strokeWidth={1.5} />
          {t('fileTree.rename')}
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={() => handleContextMenuAction('delete')}
        >
          <HugeiconsIcon icon={Trash} size={14} strokeWidth={1.5} />
          {t('fileTree.delete')}
        </ContextMenuItem>
      </>
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
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

            {isRenaming ? (
              <input
                className="bg-transparent border border-primary rounded px-1 py-0.5 text-sm outline-none flex-1 ml-0.5"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={handleKeyDown}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <span
                className="truncate text-foreground ml-0.5 flex-1"
                title={item.fullPath}
              >
                {filename}
              </span>
            )}

            {!isRenaming && isHovered && (
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
        </div>
      </ContextMenuTrigger>
      <ContextMenuPopup>{renderContextMenu()}</ContextMenuPopup>

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
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </ContextMenu>
  );
}
