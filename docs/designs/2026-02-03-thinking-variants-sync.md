# Thinking Variants Sync with Model Config

## Problem

Currently, thinking levels are hardcoded as `null | 'low' | 'medium' | 'high'`. This doesn't reflect the actual variants available in the model's config. Different models may have different thinking variants.

## Solution

Store available thinking variants per session, populated from model's `model.variants` keys. The toggle cycles through these dynamic variants instead of hardcoded levels.

## Implementation

### 1. Data Model Changes

**File: `src/renderer/store/slices/session.ts`**

- Change `ThinkingLevel` type from `null | 'low' | 'medium' | 'high'` to `string | null`
- Add `thinkingVariants: string[]` to `SessionInputState`
- Update `defaultSessionInputState` with `thinkingVariants: []`

### 2. Toggle Logic Changes

**File: `src/renderer/hooks/useInputState.ts`**

Update `toggleThinking()` to cycle through `thinkingVariants` array:
- If `thinking` is `null`, go to first variant
- If at last variant, go to `null`
- Otherwise, go to next variant

Also expose `thinkingVariants` in the hook's return value.

### 3. Model Info Fetching Changes

**File: `src/renderer/components/WorkspacePanel.tsx`**

When initializing session thinking config:
- Extract variant keys from `modelInfo.model.variants` (not `modelInfo.thinkingConfig`)
- Set `thinkingVariants` to the extracted keys
- Set `thinkingEnabled` based on whether variants exist
- Set initial `thinking` to first variant (or null if none)

**File: `src/renderer/components/ChatInput/ChatInput.tsx`**

When model changes via `handleModelChange`:
- Fetch new model info
- Update `thinkingVariants` from `modelInfo.model.variants`
- Reset `thinking` to first variant or null

### 4. Files Modified

| File | Change |
|------|--------|
| `src/renderer/store/slices/session.ts` | Update types, add `thinkingVariants` |
| `src/renderer/hooks/useInputState.ts` | Dynamic `toggleThinking()`, expose `thinkingVariants` |
| `src/renderer/components/WorkspacePanel.tsx` | Extract variants from `model.variants` on init |
| `src/renderer/components/ChatInput/ChatInput.tsx` | Extract variants from `model.variants` on model change |

## Key Finding

The thinking config is stored at `modelInfo.model.variants`, not `modelInfo.thinkingConfig`. This matches Takumi's implementation which accesses `model.model.variants` for the toggle logic.

## Testing

1. Switch to a model with thinking support → variants should populate
2. Toggle thinking → should cycle through model's actual variants
3. Switch to model without thinking → thinking should disable
4. Different sessions with different models → each should have correct variants
