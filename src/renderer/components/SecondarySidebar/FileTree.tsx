import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '../../store';
import { useAppLayoutPanels } from '../layout/AppLayoutProvider';
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
import { TreeNode } from '../TreeNode';

interface IFileTreeItemBase {
  fullPath: string;
  relPath: string;
  isFolder: boolean;
  children: IFileTreeItem[];
}

interface IFileTreeItem extends IFileTreeItemBase {
  editStatus?: 'rename' | '';
}

export function FileTree() {
  const { t } = useTranslation();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<IFileTreeItem[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<IFileTreeItem | null>(null);

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
    setSelectedKey(item.fullPath);
    if (!item.isFolder) {
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

  const handleDelete = (item: IFileTreeItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleRename = async (oldPath: string, newPath: string) => {
    try {
      const result = await request<any>('fs.rename', { oldPath, newPath });

      if (result.success) {
        init();

        // 如果当前选中的文件就是被重命名的文件
        if (selectedKey === oldPath) {
          setSelectedKey(newPath);
        }
      } else {
        console.error('重命名失败:', result.error);
      }
    } catch (error) {
      console.error('重命名文件时出错:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!cwd || !itemToDelete) return;

    try {
      const result = await request<any>('fs.delete', {
        path: itemToDelete.fullPath,
      });

      if (result.success) {
        init();
        if (selectedKey === itemToDelete.fullPath) {
          setSelectedKey(null);
        }
        setExpandedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemToDelete.fullPath);
          return newSet;
        });
      } else {
        console.error(`删除失败: ${result.error}`);
      }
    } catch (error) {
      console.error('删除文件时出错:', error);
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <>
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
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                itemToDelete?.isFolder
                  ? 'fileTree.deleteFolder'
                  : 'fileTree.deleteFile',
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete &&
                t('fileTree.deleteConfirmation', {
                  type: t(
                    itemToDelete.isFolder ? 'fileTree.folder' : 'fileTree.file',
                  ),
                  name:
                    itemToDelete.relPath.split('/').pop() ||
                    itemToDelete.relPath,
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              render={<Button variant="outline">{t('common.cancel')}</Button>}
            />
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="gap-2"
            >
              {t('common.delete')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
