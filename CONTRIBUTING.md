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

To use a local development version of `@neovate/code`, set the `NEOVATE_CODE_CLI_PATH` environment variable:

```bash
# First, build the @neovate/code package
cd /path/to/neovate-code
npm run build

# Then run the desktop app with the custom CLI path
NEOVATE_CODE_CLI_PATH=/path/to/neovate-code/dist/cli.mjs npm run dev
```

> **Note:** You must run `npm run build` in the `neovate-code` repo whenever you make changes, as the `dist/cli.mjs` file needs to be regenerated.

## Tips

### Debug Mode

Double hit `Ctrl+L` to toggle the UI into debug mode, which renders a Test Component for debugging purposes.
