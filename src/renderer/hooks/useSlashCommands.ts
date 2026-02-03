import { useCallback, useEffect, useMemo, useState } from 'react';
import { useListNavigation } from './useListNavigation';

export interface SlashCommand {
  name: string;
  description: string;
}

interface UseSlashCommandsProps {
  value: string;
  sessionId: string | null;
  fetchCommands: () => Promise<SlashCommand[]>;
}

export function useSlashCommands({
  value,
  sessionId,
  fetchCommands,
}: UseSlashCommandsProps) {
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset commands when session changes
  useEffect(() => {
    setCommands([]);
  }, [sessionId]);

  const suggestions = useMemo(() => {
    if (!value.startsWith('/')) return [];
    // If there's a space, the command is already selected - hide suggestions
    if (value.includes(' ')) return [];
    const prefix = value.slice(1).toLowerCase().trim();
    if (prefix === '') return commands;

    return commands
      .filter(
        (cmd) =>
          cmd.name.toLowerCase().startsWith(prefix) ||
          cmd.description.toLowerCase().includes(prefix),
      )
      .sort((a, b) => {
        const aMatch = a.name.toLowerCase().startsWith(prefix);
        const bMatch = b.name.toLowerCase().startsWith(prefix);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
  }, [value, commands]);

  const navigation = useListNavigation(suggestions);

  useEffect(() => {
    if (value === '/' && commands.length === 0) {
      setIsLoading(true);
      fetchCommands()
        .then(setCommands)
        .finally(() => setIsLoading(false));
    }
  }, [value, commands.length, fetchCommands]);

  const getCompletedCommand = useCallback(() => {
    const selected = navigation.getSelected();
    if (!selected) return value;
    const args = value.includes(' ') ? value.split(' ').slice(1).join(' ') : '';
    return `/${selected.name} ${args}`.trim() + ' ';
  }, [value, navigation]);

  return {
    suggestions,
    selectedIndex: navigation.selectedIndex,
    setSelectedIndex: navigation.setSelectedIndex,
    isLoading,
    navigateNext: navigation.navigateNext,
    navigatePrevious: navigation.navigatePrevious,
    reset: navigation.reset,
    getSelected: navigation.getSelected,
    getCompletedCommand,
  };
}
