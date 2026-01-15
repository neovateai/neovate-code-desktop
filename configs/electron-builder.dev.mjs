import baseConfig from './electron-builder.mjs';

/**
 * @type {import('electron-builder').Configuration}
 */
const devConfig = {
  ...baseConfig,
  // Development-specific overrides
  compression: 'store', // Faster builds
  mac: {
    ...baseConfig.mac,
    // Sign with ad-hoc identity for faster dev builds
    identity: null,
  },
};

export default devConfig;
