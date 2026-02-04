# Plugin UI Customization

**Date:** 2026-02-02

## Context

Renderer App has a basic plugin system (PluginManager, RendererPlugin, beforeRender hook), but lacks UI extension capabilities. The goal is to allow plugins to contribute custom UI elements, similar to VSCode and Obsidian extension mechanisms.

### Application Layout

```
┌────────────────────────────────────────────────────────────────┐
│ Primary   │ Chat    │ Content       │ Secondary  │ Activity   │
│ Sidebar   │ Panel   │ Panel         │ Sidebar    │ Bar        │
│           │         │               │            │            │
│ (fixed)   │ (fixed) │ (imperative)  │ (extends)  │ [icons]←──│
│           │         │               │     ↑      │     │      │
│           │         │               │     └──────┼─────┘      │
├────────────────────────────────────────────────────────────────┤
│ Status Bar  [left items...]                 [right items...]   │
└────────────────────────────────────────────────────────────────┘
```

UI extension points to support:
- **Secondary Sidebar** - Activity Bar icons + panel content
- **Content Panel** - Imperatively opened content panels
- **Status Bar** - Bottom status bar items

## Discussion

### Registration Approach

Three approaches discussed:

1. **Imperative API** (Obsidian style) - `plugin.registerView(type, viewCreator)`
2. **Declarative Config** (VSCode style) - Declare contributes in manifest
3. **Hybrid Mode** - Declarative config + imperative API

Final choice: Declarative config in function form to access context and generate dynamic config.

### Function Naming

Multiple naming options discussed:
- `contributes` - Rejected, it's a function not static config
- `setup` - Concise but unclear
- `configView` - Might be misunderstood as view-only
- **`configContributes`** - Final choice, clearly means "contribution config"

### Config Structure

Using flat structure for simplicity:
- `secondarySidebarPanels` - Secondary Sidebar panels (includes Activity Bar icons)
- `contentPanels` - Content Panel panels (imperatively opened)
- `statusBarItems` - Status bar items

### View Rendering

Need to support both:
- **React Component** - Direct rendering, can access main app store
- **iframe/WebView** - Isolated rendering, for external tool integration (future)

### State Access

Plugins have full access to main app's Zustand store, exposed via PluginContext (acceptable for first-party plugins).

### i18n Support

Using `%key%` syntax for i18n, works with existing `configI18n()` hook:

- Plain string: Display directly
- `%key%` format: Framework auto-resolves using plugin's i18n namespace

```typescript
// Plugin declaration
const myPlugin: RendererPlugin = {
  name: 'my-plugin',

  // Register i18n resources
  configI18n() {
    return {
      namespace: 'plugin.my',
      loader: async (locale) => import(`./locales/${locale}.json`),
    };
  },

  configContributes(ctx) {
    return {
      secondarySidebarPanels: [
        {
          id: 'my-plugin:explorer',
          title: '%explorer.title%',  // i18n key
          icon: FolderIcon,
          component: () => import('./ExplorerPanel'),
        },
        {
          id: 'my-plugin:debug',
          title: 'Debug',  // literal string when i18n not needed
          icon: BugIcon,
          component: () => import('./DebugPanel'),
        },
      ],
    };
  },
};
```

Framework resolves during rendering:

```typescript
function resolveI18nString(str: string, namespace: string, t: TFunction): string {
  if (str.startsWith('%') && str.endsWith('%')) {
    const key = str.slice(1, -1);
    return t(`${namespace}:${key}`);
  }
  return str;
}
```

Fallback strategy for missing translations: Display raw string (`%key%` as-is), print warn in dev mode.

### Plugin Loading Mechanism

Current plugin system uses synchronous loading—all plugins passed in during `RendererApp` construction, list fixed after startup.

This means:
- Collect all `configContributes` returns once at startup
- No incremental update mechanism needed
- Simple implementation

### Storage Strategy

**In-Memory Storage + Context Passing**
- Config stored in `RendererApp` instance memory
- Passed to UI components via `useRendererApp()` Context
- Simple and direct, meets declarative config needs
- Lifecycle: Only uses `beforeRender` (main window), registered at Renderer startup; no runtime unloading
- Sub-windows: Not pluginized yet (sub window directly renders matching component)

## Approach

Using `configContributes` function pattern, declaring all UI contributions in plugin definition:

```typescript
const myPlugin: RendererPlugin = {
  name: 'my-plugin',

  configContributes(ctx) {
    // ctx: PluginContext, access RendererApp via ctx.app
    return {
      secondarySidebarPanels: [
        {
          id: 'my-plugin:explorer',
          title: '%explorer.title%',  // i18n
          icon: FolderIcon,
          component: () => import('./ExplorerPanel'),
        },
        {
          id: 'my-plugin:search',
          title: '%search.title%',    // i18n
          icon: SearchIcon,
          component: () => import('./SearchPanel'),
        },
      ],

      contentPanels: [
        {
          id: 'my-plugin:welcome',
          title: '%welcome.title%',   // i18n
          component: () => import('./WelcomePanel'),
        },
        {
          id: 'my-plugin:settings',
          title: '%settings.title%',  // i18n
          component: () => import('./SettingsPanel'),
        },
      ],

      statusBarItems: [
        {
          id: 'my-plugin:git-branch',
          name: 'Git Branch',
          tooltip: '%git.branch.tooltip%',
          alignment: 'left',
          priority: 100,
          component: () => import('./GitBranchStatus'),
        },
        {
          id: 'my-plugin:notifications',
          name: 'Notifications',
          alignment: 'right',
          priority: 50,
          component: () => import('./NotificationStatus'),
        },
      ],
    };
  },

  beforeRender(ctx) { ... }
};
```

## Architecture

### Hook Definition

```typescript
export interface RendererPluginHooks {
  /**
   * Called after store hydration, before React render.
   */
  beforeRender(
    this: PluginContext,
    options: { store: typeof useStore },
  ): void | Promise<void>;

  /**
   * Called to collect UI contributions from plugins.
   */
  configContributes(
    ctx: PluginContext,
  ): PluginConfigContribution;
}
```

### Type Definitions

```typescript
interface PluginConfigContribution {
  secondarySidebarPanels?: SecondarySidebarPanelDescriptor[];
  contentPanels?: ContentPanelDescriptor[];
  statusBarItems?: StatusBarItemDescriptor[];
}

interface SecondarySidebarPanelDescriptor {
  id: string;                       // Recommend pluginId:panelId namespace
  title: string;                    // Supports %i18nKey% syntax
  icon: ComponentType;              // Activity Bar icon
  component: () => Promise<{ default: ComponentType<PanelProps> }>;
}

interface ContentPanelDescriptor {
  id: string;                       // Recommend pluginId:panelId namespace
  title: string;                    // Supports %i18nKey% syntax
  icon?: ComponentType;
  component: () => Promise<{ default: ComponentType<PanelProps> }>;
}

/**
 * Status Bar Item Descriptor
 *
 * Based on VSCode StatusBarItem interface, using component instead of static text.
 *
 * Omitted VSCode properties (handled by component or framework):
 * - text → replaced by component
 * - color, backgroundColor → use Tailwind in component
 * - command → handle click events in component
 * - accessibilityInformation → add as needed in future
 * - show(), hide(), dispose() → framework manages lifecycle
 */
interface StatusBarItemDescriptor {
  /** Unique identifier, recommend pluginId:itemId namespace */
  id: string;
  /** Alignment */
  alignment: 'left' | 'right';
  /** Sort priority, higher value = more to the left (same as VSCode), default 0 */
  priority?: number;
  /** Display name, for settings panel etc., e.g. 'Git Branch', 'Notifications' */
  name?: string;
  /** Hover tooltip, supports %i18nKey% syntax */
  tooltip?: string;
  /** Status bar component, supports lazy loading */
  component: () => Promise<{ default: ComponentType<StatusBarItemProps> }>;
}

interface StatusBarItemProps {
  context: PanelContext;
}
```

### Panel Props & Context

```typescript
// Panel component Props
interface PanelProps {
  context: PanelContext;
}

// Panel context - capabilities provided to components
interface PanelContext {
  app: RendererApp;
}
```

### UIService

UI operations managed by `UIService` class:

```typescript
class UIService {
  constructor(private app: RendererApp) {}

  openContentPanel(id: string, props?: Record<string, unknown>): void;
  closeContentPanel(id: string): void;
  // Future extensions
  // showMessage(message: string, type: 'info' | 'warning' | 'error'): void;
  // showQuickPick<T>(items: T[]): Promise<T | undefined>;
}

// RendererApp holds instance
class RendererApp {
  readonly ui = new UIService(this);
}
```

Via `context.app.ui` you can access:
- `openContentPanel(id, props)` - Open Content Panel
- `closeContentPanel(id)` - Close Content Panel

### Config Collection Flow

```typescript
class RendererApp {
  contributions: PluginConfigContribution = {};

  async start() {
    await hydrateStore(useStore);

    // Collect all plugin UI contributions, merge into one object
    this.contributions = await this.pluginManager.applySeriesMerge(
      'configContributes',
      { app: this },
      {}
    );

    await this.pluginManager.applySeries('beforeRender', ...);
    this.render(App);
  }

  openContentPanel(id: string, props?: Record<string, unknown>) {
    // Open specified Content Panel
  }
}

// UI components get config via Context
function ActivityBar() {
  const app = useRendererApp();
  const panels = app.contributions.secondarySidebarPanels ?? [];
  return panels.map(panel => <ActivityBarIcon key={panel.id} {...panel} />);
}
```

Flow:
1. `start()` calls `applySeriesMerge('configContributes', ...)` to collect config
2. Use `defu` to merge all plugin contributions (earlier registered = higher priority)
3. Config stored in `RendererApp.contributions`
4. UI components get via `useRendererApp().contributions`
5. Render order follows plugin registration order; no order/group/priority for now

### Status Bar Priority Sorting

Same as VSCode: higher value = more to the left (higher priority)

Framework sorts by priority descending after collection:

```typescript
const leftItems = items
  .filter(item => item.alignment === 'left')
  .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

const rightItems = items
  .filter(item => item.alignment === 'right')
  .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
```

Render layout:
```
┌─────────────────────────────────────────────────────────────────┐
│ [left:100] [left:50] [left:0]       [right:100] [right:50] ... │
└─────────────────────────────────────────────────────────────────┘
```

### Rendering Flow

#### Secondary Sidebar

```
User clicks Activity Bar icon
        ↓
Open corresponding Secondary Sidebar Panel
        ↓
PanelRenderer renders based on descriptor
        ↓
Lazy load component: React.lazy(descriptor.component)
        ↓
Pass PanelContext to component
        ↓
Component can modify title/badge via context
```

#### Content Panel

```
Call app.openContentPanel('welcome')
        ↓
Find corresponding descriptor in contentPanels
        ↓
Render in Content Panel area
        ↓
Lazy load component, pass PanelContext
```

### Framework-Side Rendering Implementation

```typescript
function PanelRenderer({ descriptor }: { descriptor: SecondarySidebarPanelDescriptor }) {
  const app = useRendererApp();

  const context: PanelContext = useMemo(() => ({ app }), [app]);

  const Component = React.lazy(descriptor.component);

  return (
    <Suspense fallback={<Loading />}>
      <Component context={context} />
    </Suspense>
  );
}
```

### Plugin Component Usage Example

```typescript
// Plugin declaration
configContributes(ctx) {
  return {
    secondarySidebarPanels: [{
      id: 'my-plugin:search',
      title: '%search.title%',  // i18n
      icon: SearchIcon,
      component: () => import('./SearchPanel'),
    }],
    contentPanels: [{
      id: 'my-plugin:search-detail',
      title: '%search.detail.title%',  // i18n
      component: () => import('./SearchDetailPanel'),
    }],
  };
}

// Secondary Sidebar component implementation
function SearchPanel({ context }: PanelProps) {
  const [results, setResults] = useState([]);

  // Click result item to open detail in Content Panel
  const handleItemClick = (item: SearchResult) => {
    context.app.ui.openContentPanel('my-plugin:search-detail', { item });
  };

  return <div>...</div>;
}
```

### PanelContext Capability Comparison

| Capability | VSCode Provider | Our Approach |
|------------|-----------------|--------------|
| Open other panels | `commands.executeCommand` | `context.app.ui.openContentPanel()` |
| State persistence | `context.state` | Zustand store |
| Access main app | N/A | `context.app` |

### References

- [VSCode viewsContainers](https://code.visualstudio.com/api/references/contribution-points#contributes.viewsContainers)
- [VSCode views](https://code.visualstudio.com/api/references/contribution-points#contributes.views)
- [Obsidian Plugin API](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)

### Pending Items

- Error fallback strategy: Host provides unified error boundary (e.g. react-error-boundary) with render and recovery mechanism
- Final behavior confirmation for i18n missing translation fallback strategy
- WebView type view implementation details (iframe communication mechanism, future)
