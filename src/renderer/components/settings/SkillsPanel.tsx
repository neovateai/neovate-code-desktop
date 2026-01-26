import React, { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MagicWandIcon,
  PlusSignIcon,
  Delete02Icon,
  Cancel01Icon,
  Loading02Icon,
} from '@hugeicons/core-free-icons';
import { useStore } from '../../store';
import { getSelectedRepo } from '../../store/selectors';
import type { HandlerOutput } from '../../nodeBridge.types';

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
    }
  | { phase: 'installing' }
  | { phase: 'error'; message: string };

export const SkillsPanel = () => {
  const messageBus = useStore((state) => state.messageBus);
  const selectedRepo = useStore(getSelectedRepo);
  const cwd = selectedRepo?.path || '.';

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addFlow, setAddFlow] = useState<AddFlowState>({ phase: 'idle' });
  const [sourceInput, setSourceInput] = useState('');
  const [removingSkill, setRemovingSkill] = useState<string | null>(null);

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
        // Filter to global skills only
        const globalSkills = result.data.skills.filter(
          (s) => s.source === 'global',
        );
        setSkills(globalSkills);
      } else {
        setError('Failed to load skills');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load skills');
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
            message: 'No skills found in this repository',
          });
          return;
        }
        // Pre-select all skills
        const selected = new Set(previewSkills.map((s) => s.name));
        setAddFlow({
          phase: 'selecting',
          previewId,
          source,
          skills: previewSkills,
          selected,
        });
      } else {
        setAddFlow({
          phase: 'error',
          message: result.error || 'Failed to fetch skills',
        });
      }
    } catch (e: any) {
      setAddFlow({
        phase: 'error',
        message: e.message || 'Failed to fetch skills',
      });
    }
  };

  // Handle install
  const handleInstall = async () => {
    if (addFlow.phase !== 'selecting' || !messageBus) return;
    const { previewId, source, selected } = addFlow;
    if (selected.size === 0) return;

    setAddFlow({ phase: 'installing' });

    try {
      const result = (await messageBus.request('skills.install', {
        cwd,
        previewId,
        selectedSkills: Array.from(selected),
        source,
        global: true,
      })) as HandlerOutput<'skills.install'>;
      if (result.success) {
        setAddFlow({ phase: 'idle' });
        setSourceInput('');
        await fetchSkills();
      } else {
        setAddFlow({
          phase: 'error',
          message: result.error || 'Failed to install skills',
        });
      }
    } catch (e: any) {
      setAddFlow({
        phase: 'error',
        message: e.message || 'Failed to install skills',
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

  // Cancel add flow
  const handleCancel = () => {
    setAddFlow({ phase: 'idle' });
    setSourceInput('');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-xl font-semibold flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <HugeiconsIcon icon={MagicWandIcon} size={22} strokeWidth={1.5} />
          Skills
        </h1>
        {addFlow.phase === 'idle' && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--text-primary)',
            }}
            onClick={() => setAddFlow({ phase: 'input' })}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
            Add Skill
          </button>
        )}
      </div>

      {/* Add Section */}
      {addFlow.phase !== 'idle' && (
        <div
          className="mb-6 p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Input phase */}
          {(addFlow.phase === 'input' || addFlow.phase === 'error') && (
            <div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder="user/repo or GitHub URL"
                  className="flex-1 px-3 py-2 text-sm rounded-md"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sourceInput.trim()) {
                      handlePreview();
                    }
                  }}
                />
                <button
                  className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--text-primary)',
                  }}
                  onClick={handlePreview}
                  disabled={!sourceInput.trim()}
                >
                  Preview
                </button>
                <button
                  className="px-3 py-2 text-sm rounded-md transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-base-hover)',
                    color: 'var(--text-secondary)',
                  }}
                  onClick={handleCancel}
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={16}
                    strokeWidth={1.5}
                  />
                </button>
              </div>
              {addFlow.phase === 'error' && (
                <p className="text-sm" style={{ color: 'var(--text-error)' }}>
                  {addFlow.message}
                </p>
              )}
            </div>
          )}

          {/* Cloning phase */}
          {addFlow.phase === 'cloning' && (
            <div
              className="flex items-center gap-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <HugeiconsIcon
                icon={Loading02Icon}
                size={16}
                strokeWidth={1.5}
                className="animate-spin"
              />
              <span className="text-sm">
                Fetching skills from {addFlow.source}...
              </span>
            </div>
          )}

          {/* Selecting phase */}
          {addFlow.phase === 'selecting' && (
            <div>
              <p
                className="text-sm mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Select skills to install:
              </p>
              <div className="space-y-2 mb-4">
                {addFlow.skills.map((skill) => {
                  const isSelected = addFlow.selected.has(skill.name);
                  return (
                    <label
                      key={skill.skillPath}
                      className="flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--bg-base-hover)'
                          : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSkillSelection(skill.name)}
                        className="mt-0.5"
                      />
                      <div>
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {skill.name}
                        </span>
                        {skill.description && (
                          <p
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {skill.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {addFlow.selected.size} of {addFlow.skills.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 text-sm rounded-md transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-base-hover)',
                      color: 'var(--text-secondary)',
                    }}
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--text-primary)',
                    }}
                    onClick={handleInstall}
                    disabled={addFlow.selected.size === 0}
                  >
                    Install ({addFlow.selected.size})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Installing phase */}
          {addFlow.phase === 'installing' && (
            <div
              className="flex items-center gap-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <HugeiconsIcon
                icon={Loading02Icon}
                size={16}
                strokeWidth={1.5}
                className="animate-spin"
              />
              <span className="text-sm">Installing skills...</span>
            </div>
          )}
        </div>
      )}

      {/* Skills List */}
      <div>
        <h2
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          Installed Skills
        </h2>

        {loading ? (
          <div
            className="flex items-center gap-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <HugeiconsIcon
              icon={Loading02Icon}
              size={16}
              strokeWidth={1.5}
              className="animate-spin"
            />
            <span className="text-sm">Loading skills...</span>
          </div>
        ) : error ? (
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--text-error)' }}>
              {error}
            </p>
            <button
              className="text-sm underline"
              style={{ color: 'var(--text-secondary)' }}
              onClick={fetchSkills}
            >
              Retry
            </button>
          </div>
        ) : skills.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No global skills installed yet.
          </p>
        ) : (
          <div className="space-y-1">
            {skills.map((skill) => (
              <div
                key={`${skill.source}-${skill.name}`}
                className="flex items-center justify-between p-3 rounded-md"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {skill.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--bg-base-hover)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {skill.source}
                  </span>
                </div>
                <button
                  className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => handleRemove(skill)}
                  disabled={removingSkill === skill.name}
                  title="Remove skill"
                >
                  {removingSkill === skill.name ? (
                    <HugeiconsIcon
                      icon={Loading02Icon}
                      size={16}
                      strokeWidth={1.5}
                      className="animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={Delete02Icon}
                      size={16}
                      strokeWidth={1.5}
                    />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
