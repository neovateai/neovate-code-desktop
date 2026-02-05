# Resizable Layout with Motion

**Date:** 2026-02-04

## Context

当前项目的 panel 布局混合使用了 `react-resizable-panels` 和自定义的 motion 实现。Primary sidebar 使用自定义的 `motion.div` 实现了平滑的 spring 动画，而 Content Panel 和 Secondary Sidebar 使用 `react-resizable-panels` 但缺乏动画效果。

目标是统一所有 panel 的实现方式，参考 `react-resizable-panels` 的数据结构和 localStorage 持久化模式，结合 framer-motion 实现一致的动画体验。

## Discussion

### 现有库调研

经过深入研究发现：
- **没有现成库**支持 motion/spring 动画的 resizable panel
- `react-resizable-panels` 的 maintainer 明确表示动画不在库的范围内
- Craft (Claude Desktop) 完全手动实现，用 `motion.div` 控制宽度，不依赖 panel 库

### 方案对比

**Motion 集成方式**：
1. Hook 返回 motion props - 最简洁但灵活性低
2. Hook 管理状态，组件用 motion - 灵活，和 Craft 一致 ✅
3. 提供 MotionPanel 组件 - 易用但定制难

**状态组织方式**：
1. 每个 panel 独立 hook - 简单但 storage 分散
2. 统一 hook + panelId - storage 统一但需顶层使用
3. Context + 独立 hook - 最灵活 ✅

**最终决定**：采用 Context 方式但先不抽象成独立 hook，逻辑放在 `AppLayoutProvider` 里，用通用写法便于后续抽取。这符合 YAGNI 原则。

### 尺寸单位

选择**像素 (px)** 而非百分比：
- 拖拽事件返回像素 (`e.clientX`)
- min/max 约束计算简单
- 和 Craft 的做法一致

## Approach

### 数据结构

```typescript
type PanelState = { width: number; visible: boolean };
type Layout = Record<string, PanelState>;

// 只需持久化可调整的 panel
// Chat Panel (flex 撑满) 和 Activity Bar (固定) 不需要存储
```

### 配置

```typescript
const PANEL_CONFIG = {
  primarySidebar: { defaultWidth: 300, minWidth: 200, maxWidth: 480, defaultVisible: true },
  contentPanel: { defaultWidth: 400, minWidth: 300, maxWidth: 600, defaultVisible: false },
  secondarySidebar: { defaultWidth: 280, minWidth: 240, maxWidth: 400, defaultVisible: false },
};
```

### API

```typescript
// Context value
{
  layout: Layout;
  resizing: string | null;
  getPanel: (id: string) => PanelState;
  setWidth: (id: string, width: number) => void;
  toggle: (id: string) => void;
  startResize: (id: string) => void;
}
```

### 持久化策略

- 拖拽中：只更新状态，不持久化（避免频繁写入）
- 拖拽结束 (mouseup)：持久化到 localStorage
- toggle 展开/收起：立即持久化

### Storage 结构

```json
{
  "app-layout": {
    "primarySidebar": { "width": 300, "visible": true },
    "contentPanel": { "width": 400, "visible": false },
    "secondarySidebar": { "width": 280, "visible": false }
  }
}
```

## Architecture

### 组件层面的 Motion 使用

```tsx
const panel = getPanel('primarySidebar');

<motion.div
  animate={{ width: panel.visible ? panel.width : 0 }}
  transition={resizing === 'primarySidebar' ? { duration: 0 } : springTransition}
>
  <div style={{ width: panel.width }}>{children}</div>
</motion.div>
```

关键点：
- 拖拽时禁用动画 (`{ duration: 0 }`)
- 非拖拽时使用 spring 动画
- 内部 div 固定宽度防止内容 reflow

### 拖拽处理

统一在 Provider 的 `useEffect` 里处理：

```typescript
useEffect(() => {
  if (!resizing) return;

  const onMove = (e: MouseEvent) => {
    // 根据 resizing 的 panel 计算新宽度
    // primarySidebar: e.clientX
    // secondarySidebar: window.innerWidth - e.clientX - activityBarWidth
  };

  const onUp = () => {
    setResizing(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  return () => { /* cleanup */ };
}, [resizing, layout]);
```

### Panel 布局

```
┌──────────────────────────────────────────────────────────────────┐
│  Traffic Lights  │              Title Bar                        │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│    Primary       │  ┌──────────┬─────────────┬──────────┐  Act  │
│    Sidebar       │  │   Chat   │   Content   │ Secondary│  Bar  │
│    (resize)      │  │   Panel  │   Panel     │ Sidebar  │ (fix) │
│                  │  │  (flex)  │  (resize)   │ (resize) │       │
│                  │  │          │ (collapse)  │(collapse)│       │
│                  │  └──────────┴─────────────┴──────────┘       │
│                  │                                               │
├──────────────────┴───────────────────────────────────────────────┤
│                         Status Bar                               │
└──────────────────────────────────────────────────────────────────┘
```

### 后续抽象路径

当前实现放在 `AppLayoutProvider` 里。如果以后需要复用，可以抽取为：

```typescript
// 独立 hook
function useResizableLayout(config: LayoutConfig) { ... }

// 或 Provider + Hook 组合
<ResizableLayoutProvider config={...}>
  {children}
</ResizableLayoutProvider>

function usePanel(id: string) { ... }
```
