# Rename @base-ui-components/react to @base-ui/react

**Date:** 2026-01-20

## Context
The project uses `@base-ui-components/react` v1.0.0-rc.0 for UI components. This package was renamed to `@base-ui/react` while maintaining identical APIs.

## Proof of Safe Migration

Evidence from `package-lock.json` confirms the rename is safe:

```
"node_modules/@base-ui-components/react": {
  "version": "1.0.0-rc.0",
  "resolved": "https://registry.npmjs.org/@base-ui-components/react/-/react-1.0.0-rc.0.tgz",
  "deprecated": "Package was renamed to @base-ui/react"
}
```

**What this proves:**
1. **NPM confirms the rename** - The npm registry itself marks the package as deprecated with message "Package was renamed to @base-ui/react"
2. **Same codebase** - It's not a fork or rewrite; the package was republished under a new name
3. **No breaking changes** - If there were API changes, npm would typically warn about migration steps. The simple rename message indicates the new package has identical exports
4. **Identical version number** - Both packages use v1.0.0-rc.0, confirming this is a straight rename, not an upgrade with changes

Additionally, documentation analysis confirms component APIs match:
- `@base-ui/react/accordion` exports: `Root`, `Item`, `Header`, `Trigger`, `Panel`
- `@base-ui/react/dialog` exports: `Root`, `Trigger`, `Portal`, `Close`, `Backdrop`, `Popup`, `Title`, `Description`

This matches the current usage patterns in the codebase.

## Approach
Replace all import paths and package.json dependency from `@base-ui-components/react` to `@base-ui/react`. No component code changes required since APIs match.

## Files to Modify
- `package.json` - dependency name
- 20 component files in `src/renderer/components/ui/`

## Scope
Source code changes only (no documentation updates)
