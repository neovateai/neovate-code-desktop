# Desktop ripglob File Search Integration

**Date:** 2026-01-12
**Related PR:** neovateai/neovate-code#662

## Context

PR #662 在后端实现了 `utils.searchPaths` API，使用 ripgrep `--iglob` 模式支持超大项目（80000+ 文件）的实时文件搜索。

桌面端当前使用 `utils.getPaths` 一次性获取所有文件（限制 6000 个），然后在前端过滤。对于超大项目，超出部分的文件完全无法被搜索到。

## Goal

- 将 @ 文件提及和 Tab 补全改为使用后端 `utils.searchPaths` 实时搜索
- 支持 80000+ 文件的项目完整搜索
- 添加 "Searching..." 加载指示器
- 使用 debounce (150ms) 减少请求频率

## Approach

采用 **方案 A: Hook 内部集成**：
- 直接修改 `useFileSuggestion` hook
- 移除 `fetchPaths` prop，改用 `request` + `cwd`
- 新增 debounce 逻辑
- 复用现有的 suggestion dropdown 和 navigation

## Architecture

```
用户输入 "@src"
    ↓
useFileSuggestion 检测到 @ 模式
    ↓
debounce 150ms
    ↓
调用 bridge.request('utils.searchPaths', { cwd, query: 'src' })
    ↓
后端 ripgrep --iglob 流式搜索
    ↓
返回排序后的结果，前端直接渲染
```

## Type Definitions

在 `nodeBridge.types.ts` 中添加：

```typescript
type UtilsSearchPathsInput = {
  cwd: string;
  query: string;
  maxResults?: number;  // 默认 100
};

type UtilsSearchPathsOutput = {
  success: boolean;
  data: {
    paths: string[];
    truncated: boolean;
  };
};

// HandlerMap 中添加
'utils.searchPaths': {
  input: UtilsSearchPathsInput;
  output: UtilsSearchPathsOutput;
};
```

## Hook Implementation

### useDebounce (新增)

```typescript
// hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### useFileSuggestion (重构)

```typescript
// hooks/useFileSuggestion.ts

interface UseFileSuggestionProps {
  value: string;
  cursorPosition: number;
  forceTabTrigger: boolean;
  request: <K extends HandlerMethod>(method: K, params: HandlerInput<K>) => Promise<HandlerOutput<K>>;
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

  // atMatch 和 tabMatch 逻辑保持不变
  const atMatch = useMemo((): MatchResult => {
    // ... 现有逻辑 ...
  }, [value, cursorPosition]);

  const tabMatch = useMemo((): MatchResult => {
    // ... 现有逻辑 ...
  }, [value, cursorPosition, forceTabTrigger]);

  const activeMatch = atMatch.hasQuery ? atMatch : tabMatch;
  
  // debounce query
  const debouncedQuery = useDebounce(activeMatch.query, 150);

  // 清空路径当 query 变化时
  useEffect(() => {
    if (activeMatch.query !== lastQueryRef.current) {
      lastQueryRef.current = activeMatch.query;
      setPaths([]);
    }
  }, [activeMatch.query]);

  // 搜索逻辑
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

  // matchedPaths 直接使用后端返回结果（已排序）
  const matchedPaths = useMemo(() => {
    if (!activeMatch.hasQuery) return [];
    return paths;
  }, [paths, activeMatch.hasQuery]);

  const navigation = useListNavigation(matchedPaths);

  // ... 其余逻辑保持不变 ...

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
```

## UI Changes

在 `SuggestionDropdown.tsx` 或 `ChatInput.tsx` 中添加 Loading 指示器：

```tsx
{isLoading && matchedPaths.length === 0 && (
  <div className="px-3 py-2 text-sm text-muted-foreground">
    Searching...
  </div>
)}
```

## File Changes Summary

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/renderer/nodeBridge.types.ts` | 修改 | 添加 `utils.searchPaths` 类型定义 |
| `src/renderer/hooks/useDebounce.ts` | 新增 | debounce hook |
| `src/renderer/hooks/useFileSuggestion.ts` | 重构 | 使用后端搜索替代前端过滤 |
| `src/renderer/hooks/useInputHandlers.ts` | 修改 | 传递 request/cwd 给 useFileSuggestion |
| `src/renderer/components/ChatInput/ChatInput.tsx` | 修改 | 移除 fetchPaths prop，添加 Loading 指示器 |
| `src/renderer/components/WorkspacePanel.tsx` | 修改 | 移除 fetchPaths 定义 |

## Compatibility

| 场景 | 当前行为 | 新行为 |
|------|----------|--------|
| `@` 不带 query | 显示根目录结构 | 后端返回根目录（保持一致） |
| `@src` 搜索 | 前端 filter 6000 文件 | 后端 ripgrep 全量搜索 ✓ |
| Tab 补全 | 前端 filter | 后端搜索 ✓ |
| 超过 6000 文件项目 | 部分文件丢失 | 全量搜索 ✓ |

## Trade-offs

- **每次搜索有 ripgrep 进程开销**: 但 ripgrep 极快，用户无感知
- **debounce 延迟**: 150ms 延迟换取减少请求频率
- **后端依赖**: 需要 neovate-code 升级到包含 PR #662 的版本

## Testing

1. 在小项目（<1000 文件）中验证基本功能
2. 在大项目（>10000 文件）中验证搜索速度
3. 验证 @ 和 Tab 两种触发方式
4. 验证 Loading 指示器显示
5. 验证快速输入时的 debounce 效果
