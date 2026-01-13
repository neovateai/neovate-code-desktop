import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useListNavigation } from './useListNavigation';
import { useDebounce } from './useDebounce';
import { findAtTokenAtCursor } from '../lib/tokenUtils';
import type {
  HandlerInput,
  HandlerMethod,
  HandlerOutput,
} from '../nodeBridge.types';

type TriggerType = 'at' | 'tab' | null;

interface MatchResult {
  hasQuery: boolean;
  fullMatch: string;
  query: string;
  startIndex: number;
  triggerType: TriggerType;
}

interface UseFileSuggestionProps {
  value: string;
  cursorPosition: number;
  forceTabTrigger: boolean;
  request: <K extends HandlerMethod>(
    method: K,
    params: HandlerInput<K>,
  ) => Promise<HandlerOutput<K>>;
  cwd: string;
}

export function useFileSuggestion({
  value,
  cursorPosition,
  forceTabTrigger,
  request,
  cwd,
}: UseFileSuggestionProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const lastQueryRef = useRef('');

  const atMatch = useMemo((): MatchResult => {
    const tokenRange = findAtTokenAtCursor(value, cursorPosition);

    if (!tokenRange) {
      return {
        hasQuery: false,
        fullMatch: '',
        query: '',
        startIndex: -1,
        triggerType: null,
      };
    }

    const { startIndex, fullMatch } = tokenRange;
    let query = value.substring(startIndex + 1, cursorPosition);
    if (query.startsWith('"')) {
      query = query.slice(1).replace(/"$/, '');
    }

    return {
      hasQuery: true,
      fullMatch,
      query,
      startIndex,
      triggerType: 'at',
    };
  }, [value, cursorPosition]);

  const tabMatch = useMemo((): MatchResult => {
    if (!forceTabTrigger) {
      return {
        hasQuery: false,
        fullMatch: '',
        query: '',
        startIndex: -1,
        triggerType: null,
      };
    }

    const beforeCursor = value.substring(0, cursorPosition);
    const wordMatch = beforeCursor.match(/([^\s]*)$/);

    if (!wordMatch || !wordMatch[1] || beforeCursor.match(/@[^\s]*$/)) {
      return {
        hasQuery: false,
        fullMatch: '',
        query: '',
        startIndex: -1,
        triggerType: null,
      };
    }

    const currentWord = wordMatch[1];
    return {
      hasQuery: true,
      fullMatch: currentWord,
      query: currentWord,
      startIndex: beforeCursor.length - currentWord.length,
      triggerType: 'tab',
    };
  }, [value, cursorPosition, forceTabTrigger]);

  const activeMatch = atMatch.hasQuery ? atMatch : tabMatch;

  const debouncedQuery = useDebounce(activeMatch.query, 150);

  useEffect(() => {
    if (activeMatch.query !== lastQueryRef.current) {
      lastQueryRef.current = activeMatch.query;
      setPaths([]);
    }
  }, [activeMatch.query]);

  useEffect(() => {
    if (!activeMatch.hasQuery) {
      setPaths([]);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    request('utils.searchPaths', {
      cwd,
      query: debouncedQuery,
      maxResults: 100,
    })
      .then((res) => {
        if (currentRequestId !== requestIdRef.current) return;
        setPaths(res.data.paths);
        setIsLoading(false);
      })
      .catch((error) => {
        if (currentRequestId !== requestIdRef.current) return;
        console.error('Failed to search paths:', error);
        setIsLoading(false);
      });
  }, [request, cwd, debouncedQuery, activeMatch.hasQuery]);

  const matchedPaths = useMemo(() => {
    if (!activeMatch.hasQuery) return [];
    if (paths.length === 1 && paths[0] === activeMatch.query) return [];
    return paths;
  }, [paths, activeMatch.hasQuery, activeMatch.query]);

  const navigation = useListNavigation(matchedPaths);

  const getSelected = useCallback(() => {
    const selected = navigation.getSelected();
    if (!selected) return '';
    return selected.includes(' ') ? `"${selected}"` : selected;
  }, [navigation]);

  return {
    matchedPaths,
    isLoading,
    selectedIndex: navigation.selectedIndex,
    startIndex: activeMatch.startIndex,
    fullMatch: activeMatch.fullMatch,
    triggerType: activeMatch.triggerType,
    navigateNext: navigation.navigateNext,
    navigatePrevious: navigation.navigatePrevious,
    reset: navigation.reset,
    getSelected,
  };
}
