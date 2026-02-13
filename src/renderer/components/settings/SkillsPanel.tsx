import {
  Cancel01Icon,
  Delete02Icon,
  Loading02Icon,
  MagicWandIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import type { HandlerOutput } from '../../nodeBridge.types';
import { useStore } from '../../store';
import { getSelectedRepo } from '../../store/selectors';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';

// Types from nodeBridge.types.ts
interface Skill {
  name: string;
  description: string;
  path: string;
  source: string;
}

interface PreviewSkill {
  name: string;
  description: string;
  skillPath: string;
}

type AddFlowState =
  | { phase: 'idle' }
  | { phase: 'input' }
  | { phase: 'cloning'; source: string }
  | {
      phase: 'selecting';
      previewId: string;
      source: string;
      skills: PreviewSkill[];
      selected: Set<string>;
      installGlobally: boolean;
      useClaude: boolean;
    }
  | { phase: 'installing' }
  | { phase: 'error'; message: string };

export const SkillsPanel = () => {
  const { t } = useTranslation();
  const messageBus = useStore((state) => state.messageBus);
  const selectedRepo = useStore(getSelectedRepo);
  const cwd = selectedRepo?.path || '.';

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addFlow, setAddFlow] = useState<AddFlowState>({ phase: 'idle' });
  const [sourceInput, setSourceInput] = useState('');
  const [removingSkill, setRemovingSkill] = useState<string | null>(null);

  // Derived state for skills grouping
  const hasProject = !!selectedRepo?.path;
  const folderName = hasProject ? selectedRepo.path.split('/').pop() || '' : '';
  const globalSkills = skills.filter(
    (s) => s.source === 'global' || s.source === 'global-claude',
  );
  const projectSkills = skills.filter(
    (s) => s.source === 'project' || s.source === 'project-claude',
  );

  // Fetch skills on mount
  const fetchSkills = async () => {
    if (!messageBus) return;
    setLoading(true);
    setError(null);
    try {
      const result = (await messageBus.request('skills.list', {
        cwd,
      })) as HandlerOutput<'skills.list'>;
      if (result.success) {
        setSkills(result.data.skills);
      } else {
        setError(t('settings.skills.loadFailed'));
      }
    } catch (e: any) {
      setError(e.message || t('settings.skills.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [messageBus, cwd]);

  // Handle preview (clone + scan)
  const handlePreview = async () => {
    if (!messageBus || !sourceInput.trim()) return;
    const source = sourceInput.trim();
    setAddFlow({ phase: 'cloning', source });

    try {
      const result = (await messageBus.request('skills.preview', {
        cwd,
        source,
      })) as HandlerOutput<'skills.preview'>;
      if (result.success) {
        const { previewId, skills: previewSkills } = result.data;
        if (previewSkills.length === 0) {
          setAddFlow({
            phase: 'error',
            message: t('settings.skills.noSkillsFound'),
          });
          return;
        }
        // Pre-select all skills, set smart defaults for install options
        const selected = new Set(previewSkills.map((s) => s.name));
        const hasProject = !!selectedRepo?.path;
        setAddFlow({
          phase: 'selecting',
          previewId,
          source,
          skills: previewSkills,
          selected,
          installGlobally: !hasProject,
          useClaude: false,
        });
      } else {
        setAddFlow({
          phase: 'error',
          message: result.error || t('settings.skills.fetchFailed'),
        });
      }
    } catch (e: any) {
      setAddFlow({
        phase: 'error',
        message: e.message || t('settings.skills.fetchFailed'),
      });
    }
  };

  // Handle install
  const handleInstall = async () => {
    if (addFlow.phase !== 'selecting' || !messageBus) return;
    const { previewId, source, selected, installGlobally, useClaude } = addFlow;
    if (selected.size === 0) return;

    setAddFlow({ phase: 'installing' });

    try {
      const result = (await messageBus.request('skills.install', {
        cwd,
        previewId,
        selectedSkills: Array.from(selected),
        source,
        global: installGlobally,
        claude: useClaude,
      })) as HandlerOutput<'skills.install'>;
      if (result.success) {
        setAddFlow({ phase: 'idle' });
        setSourceInput('');
        await fetchSkills();
      } else {
        setAddFlow({
          phase: 'error',
          message: result.error || t('settings.skills.installFailed'),
        });
      }
    } catch (e: any) {
      setAddFlow({
        phase: 'error',
        message: e.message || t('settings.skills.installFailed'),
      });
    }
  };

  // Handle remove - pass the skill's path to derive targetDir
  const handleRemove = async (skill: Skill) => {
    if (!messageBus) return;
    setRemovingSkill(skill.name);

    // Extract targetDir and skill folder name from skill path
    // e.g., /a/b/c/SKILL.md -> targetDir: /a/b, name: c
    const pathParts = skill.path.split('/');
    pathParts.pop(); // remove filename (SKILL.md)
    const skillFolderName = pathParts.pop(); // get skill folder name
    const targetDir = pathParts.join('/');

    try {
      const result = (await messageBus.request('skills.remove', {
        cwd,
        name: skillFolderName!,
        targetDir,
      })) as HandlerOutput<'skills.remove'>;

      if (result.success) {
        await fetchSkills();
      }
    } finally {
      setRemovingSkill(null);
    }
  };

  // Toggle skill selection
  const toggleSkillSelection = (name: string) => {
    if (addFlow.phase !== 'selecting') return;
    const newSelected = new Set(addFlow.selected);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setAddFlow({ ...addFlow, selected: newSelected });
  };

  // Toggle install globally option
  const toggleInstallGlobally = () => {
    if (addFlow.phase !== 'selecting') return;
    setAddFlow({ ...addFlow, installGlobally: !addFlow.installGlobally });
  };

  // Toggle use claude directory option
  const toggleUseClaude = () => {
    if (addFlow.phase !== 'selecting') return;
    setAddFlow({ ...addFlow, useClaude: !addFlow.useClaude });
  };

  // Cancel add flow
  const handleCancel = () => {
    setAddFlow({ phase: 'idle' });
    setSourceInput('');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2 text-foreground">
          <HugeiconsIcon icon={MagicWandIcon} size={22} strokeWidth={1.5} />
          {t('settings.skills')}
        </h1>
        {addFlow.phase === 'idle' && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setAddFlow({ phase: 'input' })}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
            {t('settings.skills.addSkill')}
          </Button>
        )}
      </div>

      {/* Add Section */}
      {addFlow.phase !== 'idle' && (
        <div className="mb-6 p-4 rounded-lg bg-muted border border-border">
          {/* Input phase */}
          {(addFlow.phase === 'input' || addFlow.phase === 'error') && (
            <div>
              <div className="flex gap-2 mb-2">
                <Input
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder={t('settings.skills.sourcePlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sourceInput.trim()) {
                      handlePreview();
                    }
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePreview}
                  disabled={!sourceInput.trim()}
                >
                  {t('settings.skills.preview')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={16}
                    strokeWidth={1.5}
                  />
                </Button>
              </div>
              {addFlow.phase === 'error' && (
                <p className="text-sm text-destructive">{addFlow.message}</p>
              )}
            </div>
          )}

          {/* Cloning phase */}
          {addFlow.phase === 'cloning' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon
                icon={Loading02Icon}
                size={16}
                strokeWidth={1.5}
                className="animate-spin"
              />
              <span className="text-sm">
                {t('settings.skills.fetching', { source: addFlow.source })}
              </span>
            </div>
          )}

          {/* Selecting phase */}
          {addFlow.phase === 'selecting' && (
            <div>
              <p className="text-sm mb-3 text-muted-foreground">
                {t('settings.skills.selectToInstall')}
              </p>
              <div className="space-y-2 mb-4">
                {addFlow.skills.map((skill) => {
                  const isSelected = addFlow.selected.has(skill.name);
                  return (
                    <label
                      key={skill.skillPath}
                      className={cn(
                        'flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors',
                        isSelected ? 'bg-accent' : 'bg-transparent',
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSkillSelection(skill.name)}
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {skill.name}
                        </span>
                        {skill.description && (
                          <p className="text-xs text-muted-foreground">
                            {skill.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {/* Install options */}
              <div className="space-y-2 mb-4 pt-3 border-t border-border">
                <label
                  className={cn(
                    'flex items-center gap-2 text-sm cursor-pointer text-muted-foreground',
                    !hasProject && 'opacity-50',
                  )}
                >
                  <Checkbox
                    checked={addFlow.installGlobally}
                    onCheckedChange={toggleInstallGlobally}
                    disabled={!hasProject}
                  />
                  {t('settings.skills.installGlobally')}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground">
                  <Checkbox
                    checked={addFlow.useClaude}
                    onCheckedChange={toggleUseClaude}
                  />
                  {t('settings.skills.useClaudeDir')}
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t('settings.skills.selectedCount', {
                    selected: addFlow.selected.size,
                    total: addFlow.skills.length,
                  })}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleInstall}
                    disabled={addFlow.selected.size === 0}
                  >
                    {t('settings.skills.installCount', {
                      count: addFlow.selected.size,
                    })}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Installing phase */}
          {addFlow.phase === 'installing' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon
                icon={Loading02Icon}
                size={16}
                strokeWidth={1.5}
                className="animate-spin"
              />
              <span className="text-sm">{t('settings.skills.installing')}</span>
            </div>
          )}
        </div>
      )}

      {/* Skills List */}
      <div>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <HugeiconsIcon
              icon={Loading02Icon}
              size={16}
              strokeWidth={1.5}
              className="animate-spin"
            />
            <span className="text-sm">{t('settings.skills.loading')}</span>
          </div>
        ) : error ? (
          <div>
            <p className="text-sm mb-2 text-destructive">{error}</p>
            <button
              className="text-sm underline text-muted-foreground"
              onClick={fetchSkills}
            >
              {t('settings.skills.retry')}
            </button>
          </div>
        ) : (
          <>
            {/* Global Skills Section */}
            <div className="mb-6">
              <h2 className="text-sm font-medium mb-3 text-muted-foreground">
                {t('settings.skills.globalSkills')}
              </h2>
              {globalSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('settings.skills.noGlobalSkills')}
                </p>
              ) : (
                <div className="space-y-1">
                  {globalSkills.map((skill) => (
                    <div
                      key={`${skill.source}-${skill.name}`}
                      className="flex items-center justify-between p-3 rounded-md bg-muted border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {skill.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-accent text-muted-foreground">
                          {skill.source}
                        </span>
                      </div>
                      <button
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity disabled:opacity-50"
                        onClick={() => handleRemove(skill)}
                        disabled={removingSkill === skill.name}
                        title="Remove skill"
                      >
                        {removingSkill === skill.name ? (
                          <HugeiconsIcon
                            icon={Loading02Icon}
                            size={14}
                            strokeWidth={1.5}
                            className="animate-spin"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            size={14}
                            strokeWidth={1.5}
                            className="text-red-500"
                          />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Skills Section */}
            {hasProject ? (
              <div>
                <h2 className="text-sm font-medium mb-3 text-muted-foreground">
                  {t('settings.skills.projectSkills', { folder: folderName })}
                </h2>
                {projectSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('settings.skills.noProjectSkills')}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {projectSkills.map((skill) => (
                      <div
                        key={`${skill.source}-${skill.name}`}
                        className="flex items-center justify-between p-3 rounded-md bg-muted border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {skill.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-accent text-muted-foreground">
                            {skill.source}
                          </span>
                        </div>
                        <button
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity disabled:opacity-50"
                          onClick={() => handleRemove(skill)}
                          disabled={removingSkill === skill.name}
                          title="Remove skill"
                        >
                          {removingSkill === skill.name ? (
                            <HugeiconsIcon
                              icon={Loading02Icon}
                              size={14}
                              strokeWidth={1.5}
                              className="animate-spin"
                            />
                          ) : (
                            <HugeiconsIcon
                              icon={Delete02Icon}
                              size={14}
                              strokeWidth={1.5}
                              className="text-red-500"
                            />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('settings.skills.selectProject')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
