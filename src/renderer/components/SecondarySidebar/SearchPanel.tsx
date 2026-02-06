import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search,
  FileText,
  Loader2,
  ChevronRight,
  CaseSensitive,
  WholeWord,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';
import { useStore } from '../../store';
import { useAppLayoutPanels } from '../layout/AppLayoutProvider';
import '../../styles/seti.css';

interface SearchResult {
  fullPath: string;
  relPath: string;
  fileName: string;
  extName: string;
  matches?: Array<{ line: number; column: number; text: string }>;
}

/** TODO: 大量结果场景性能优化 */
export function SearchPanel({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(
    new Set(),
  );
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { request } = useStore();
  const setPendingTabRequest = useStore((s) => s.setPendingTabRequest);
  const { getPanel, toggle } = useAppLayoutPanels();
  const contentPanel = getPanel('contentPanel');

  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const workspaces = useStore((state) => state.workspaces);
  const cwd = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]?.worktreePath
    : null;

  useEffect(() => {
    inputRef.current?.focus(); // Auto focus input on mount
  }, []);

  useEffect(() => {
    // 当 cwd 变化时重置状态
    setQuery('');
    setResults([]);
    setLoading(false);
    setSearched(false);
    setExpandedResults(new Set());
    setCaseSensitive(false);
    setExactMatch(false);
  }, [cwd]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      // 清空查询时立即清除结果
      setResults([]);
      setSearched(false);
      setExpandedResults(new Set());
      return;
    }

    // 单字母搜索限制
    if (trimmedQuery.length === 1) {
      setResults([]);
      setSearched(true);
      setLoading(false);
      return;
    }

    // 设置防抖延迟
    debounceRef.current = setTimeout(() => {
      handleSearch();
    }, 300); // 300ms 防抖延迟

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, caseSensitive, exactMatch, cwd]);

  const handleSearch = async () => {
    if (!cwd || !query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await request<any>('keyword.search', {
        cwd,
        query: query.trim(),
        caseSensitive,
        exactMatch,
      });
      const searchResults = res?.data?.results || [];
      setResults(searchResults);

      // 默认展开所有有匹配的结果
      const allPaths = new Set<string>();
      searchResults.forEach((result: SearchResult) => {
        if (result.matches && result.matches.length > 0) {
          allPaths.add(result.fullPath);
        }
      });
      setExpandedResults(allPaths);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setExpandedResults(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleExpanded = (fullPath: string) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fullPath)) {
        newSet.delete(fullPath);
      } else {
        newSet.add(fullPath);
      }
      return newSet;
    });
  };

  const handleMatchClick = (result: SearchResult, line: number) => {
    if (contentPanel.collapsed) {
      toggle('contentPanel');
    }
    setPendingTabRequest({
      uri: result.fullPath + `#L${line}`,
      repoPath: cwd || '',
      type: 'editor',
    });
  };

  const getFileIcon = (extName: string) => {
    const suffix = extName.startsWith('.') ? extName.slice(1) : extName;
    return (
      <div
        className="seti-icon"
        data-lang={suffix.toLowerCase()}
        style={{ fontSize: 14 }}
      ></div>
    );
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    let searchText = text;
    let searchQuery = query;

    if (!caseSensitive) {
      searchText = text.toLowerCase();
      searchQuery = query.toLowerCase();
    }

    const queryIndex = searchText.indexOf(searchQuery);
    if (queryIndex === -1) return text;

    const queryLength = query.length;
    const start = Math.max(0, queryIndex - 20);
    const end = Math.min(text.length, queryIndex + queryLength + 20);

    let displayText = text.slice(start, end);
    if (start > 0) displayText = '...' + displayText;
    if (end < text.length) displayText = displayText + '...';

    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(`(${escapeRegExp(query)})`, flags);
    const parts = displayText.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={`match-${i}-${part}`}
          className="bg-yellow-200 dark:bg-yellow-900 text-foreground"
        >
          {part}
        </span>
      ) : (
        <span key={`text-${i}-${part}`}>{part}</span>
      ),
    );
  };

  if (!active) {
    return null;
  }

  if (!cwd) {
    return (
      <div className="p-4 text-sm text-center text-muted-foreground">
        {t('search.selectWorkspace')}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Input */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className="h-7 pl-6 pr-16 text-sm bg-muted rounded-md flex items-center"
          />
          {/* Search Options inside input */}
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={`flex items-center text-xs px-1 py-0.5 rounded transition-all cursor-pointer hover:scale-105 ${
                caseSensitive
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              title={t('search.caseSensitive')}
            >
              <CaseSensitive className="w-3 h-3" />
            </button>

            <button
              onClick={() => setExactMatch(!exactMatch)}
              className={`flex items-center text-xs px-1 py-0.5 rounded transition-all cursor-pointer hover:scale-105 ${
                exactMatch
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              title={t('search.exactMatch')}
            >
              <WholeWord className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      {/* Results */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : searched && query.trim().length === 1 ? (
          <div className="p-8 text-sm text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{t('search.performanceWarning')}</p>
          </div>
        ) : searched && results.length === 0 ? (
          <div className="p-8 text-sm text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{t('search.noResults')}</p>
          </div>
        ) : (
          <div className="py-1">
            {results.map((result) => (
              <div
                key={result.fullPath}
                className="border-b border-border/50 last:border-b-0"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-pointer"
                  onClick={() => {
                    if (result.matches && result.matches.length > 0) {
                      toggleExpanded(result.fullPath);
                    }
                  }}
                  title={result.relPath}
                >
                  {result.matches && result.matches.length > 0 && (
                    <ChevronRight
                      className={`w-3 h-3 transition-transform ${expandedResults.has(result.fullPath) ? 'rotate-90' : ''}`}
                    />
                  )}
                  <div className="flex-shrink-0">
                    {getFileIcon(result.extName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm truncate text-foreground">
                        {result.fileName}
                      </div>
                      {result.matches && result.matches.length > 0 && (
                        <div className="flex-shrink-0 text-xs text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded">
                          {t('search.matchesCount', {
                            count: result.matches.length,
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.relPath}
                    </div>
                  </div>
                </div>
                {result.matches &&
                  result.matches.length > 0 &&
                  expandedResults.has(result.fullPath) && (
                    <div className="pb-2 pl-10 pr-3 space-y-1">
                      {result.matches.map((match, idx) => (
                        <div
                          key={`${result.fullPath}-${match.line}-${match.column}-${idx}`}
                          className="text-xs font-mono bg-muted/50 px-2 py-1 rounded hover:bg-accent cursor-pointer"
                          onClick={() => handleMatchClick(result, match.line)}
                        >
                          <span className="text-muted-foreground">
                            L{match.line}:{' '}
                          </span>
                          {highlightMatch(match.text, query)}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Footer */}
      {searched && !loading && results.length > 0 && (
        <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground text-center">
          {t('search.resultsFound', { count: results.length })}
        </div>
      )}
    </div>
  );
}
