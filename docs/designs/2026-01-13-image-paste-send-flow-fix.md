# Image Paste and Send Flow Fix

**Date:** 2026-01-13

## Context

Users reported a bug where pasting an image into the chat input would show the image reference (e.g., `[Image 412X412 Electro....23.09.png#3]`) in the input field, but after sending the message, the image content was lost and only the text portion was transmitted to the backend.

## Discussion

Through debugging, multiple issues were identified in the image paste/send flow:

1. **Stale Closure Issue**: The `pastedImageMap` lookup in `useImagePasteManager` was using a stale closure, causing image data to not be found when expanding references.

2. **Missing Images Parameter**: The `sendMessage` function chain was not passing the `images` parameter through from the WorkspacePanel to the store action.

3. **Missing mimeType Field**: The backend expects `ImagePart` structures with a `mimeType` field, but attachments were being constructed without it.

4. **Double Data URL Prefix**: In `UserMessage.tsx`, the image rendering code was constructing a data URL from `imagePart.data`, but the data field already contained the full data URL, resulting in a malformed double prefix.

## Approach

Each issue was fixed independently:

1. Read `pastedImageMap` directly from the store via `useStore.getState()` to avoid stale closure issues.

2. Added `images?: string[]` parameter to `sendMessage` in both `WorkspacePanel.tsx` and `store.tsx`.

3. Extract `mimeType` from the data URL when constructing attachments in `store.tsx`.

4. Use `imagePart.data` directly as the `src` attribute since it already contains the full data URL.

## Architecture

### Data Flow

```
useImagePasteManager.handleImagePaste
  → stores image in pastedImageMap with ID like #1
  → inserts [Image ...#1] placeholder in input

expandImageReferences (on submit)
  → reads pastedImageMap from store via getState()
  → extracts image data and replaces placeholders
  → returns images array with full data URLs

sendMessage (WorkspacePanel)
  → receives images array
  → passes to store.sendMessage

store.sendMessage
  → constructs attachments with { type: 'image', data: dataUrl, mimeType }
  → sends to backend

UserMessage (rendering)
  → uses imagePart.data directly as img src
```

### Key Files Modified

- `src/renderer/hooks/useImagePasteManager.ts` - Fixed stale closure, added sessionId parameter
- `src/renderer/hooks/useInputHandlers.ts` - Passes sessionId to imageManager
- `src/renderer/components/WorkspacePanel.tsx` - Added images parameter passthrough
- `src/renderer/store.tsx` - Added images parameter, constructs attachments with mimeType
- `src/renderer/components/messages/UserMessage.tsx` - Fixed double data URL prefix

### ImagePart Structure

The backend expects:
```typescript
{
  type: 'image',
  data: 'data:image/png;base64,...',  // Full data URL
  mimeType: 'image/png'
}
```

The `data` field contains the complete data URL, not just raw base64 data.
