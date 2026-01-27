# CONTRIBUTING

## Development

1. Install dependencies

```bash
$ npm install
```

2. Run the desktop app

```bash
$ npm run dev
```

Then you should see the desktop app running in your browser.

![](https://pic.sorrycc.com/proxy/1768919602086-390844259.png)

## Local Development with Custom @neovate/code

To use a local development version of `@neovate/code`, set the `NEOVATE_CODE_PATH` environment variable:

```bash
# First, build the @neovate/code package
cd /path/to/neovate-code
npm run build

# Then run the desktop app with the custom neovate-code path
NEOVATE_CODE_PATH=/path/to/neovate-code/dist/index.mjs npm run dev
```

> **Note:** You must run `npm run build` in the `neovate-code` repo whenever you make changes, as the `dist/index.mjs` file needs to be regenerated.

## How to Create Server Logic and Communicate with It

> **Note:** After we complete the plugin part, we will only need to update the plugin in this repo.

This section describes how to add new IPC handlers that allow the renderer process to communicate with the main process (which runs the neovate-code server).

### Step 1: Add Handler in neovate-code

Add your handler in the [nodeBridge.ts](https://github.com/neovateai/neovate-code/blob/master/src/nodeBridge.ts) file in the neovate-code repo.

### Step 2: Test and Update Types

Follow the [neovate-code CONTRIBUTING.md](https://github.com/neovateai/neovate-code/blob/master/CONTRIBUTING.md#testing-nodebridge-handlers) to test your handler:

```bash
bun scripts/test-nodebridge.ts
```

Remember to update the `nodeBridge.d.ts` file in the neovate-code repo (you can use AI to help generate the types).

### Step 3: Sync Types to Desktop Repo

Run the following script to sync `nodeBridge.d.ts` to this repo:

```bash
bun run scripts/update-node-bridge-types.ts
```

### Step 4: Run Desktop App with Local neovate-code

Follow the [Local Development with Custom @neovate/code](#local-development-with-custom-neovatecode) section above to run the desktop app with your local neovate-code repo.

> **Important:** Remember to build the neovate-code repo (`npm run build`) before running the desktop app, otherwise your changes won't be reflected.

### Step 5: Use `request` from Store in Renderer

In your React component, use the `request` function from the Zustand store to call your handler:

```tsx
import { useStore } from './store';

function MyComponent() {
  const { request } = useStore();

  const handleRequest = async () => {
    try {
      const response = await request('your.handlerName', { /* params */ });
      console.log('Response:', response);
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  return <button onClick={handleRequest}>Call Handler</button>;
}
```

See [WebSocketComponent.example.tsx](src/renderer/WebSocketComponent.example.tsx) for a complete example.

## Tips

### Debug Mode

Double hit `Ctrl+L` to toggle the UI into debug mode, which renders a Test Component for debugging purposes.
