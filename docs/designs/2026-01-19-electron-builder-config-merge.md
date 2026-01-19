# Electron Builder 配置合并

**Date:** 2026-01-19

## Context

项目中存在两个 electron-builder 配置文件：
- `configs/electron-builder.mjs` - 生产环境配置
- `configs/electron-builder.dev.mjs` - 开发环境配置

开发配置通过 `...baseConfig` 和 `...baseConfig.mac` 展开基础配置，这种方式会导致嵌套配置丢失。希望将两个文件合并为单一配置文件，通过环境变量区分构建环境。

## Discussion

### 环境变量设计
- 使用 `BUILD_ENV=dev` 表示开发模式
- 不设置或其他值表示生产模式

### 需要区分的配置
讨论后确定以下配置需要根据环境区分：

| 配置项 | prod | dev |
|--------|------|-----|
| appId | com.neovateai.desktop | com.neovateai.desktop.dev |
| productName | Neovate | Neovate Dev |
| mac.icon | build/icons/icon.icns | build/icons/icon-dev.icns |
| directories.output | release | release-dev |
| artifactName | neovate-${version}-${arch}.${ext} | neovate-dev-${arch}.${ext} |
| compression | maximum | store |

### 不区分环境的配置
以下配置由环境变量直接控制，不区分 dev/prod：
- `mac.identity` - 有 `CSC_LINK` 环境变量就签名
- `mac.notarize` - 有 `APPLE_ID` 和 `APPLE_APP_SPECIFIC_PASSWORD` 就公证

## Approach

在 `electron-builder.mjs` 顶部定义 `isDev` 变量：

```javascript
const isDev = process.env.BUILD_ENV === 'dev';
```

所有需要区分的配置使用三元表达式：

```javascript
appId: isDev ? 'com.neovateai.desktop.dev' : 'com.neovateai.desktop',
productName: isDev ? 'Neovate Dev' : 'Neovate',
```

签名和公证保持原有逻辑，只依赖相应环境变量是否存在。

## Architecture

### 配置文件结构

```javascript
// configs/electron-builder.mjs
const isDev = process.env.BUILD_ENV === 'dev';

const config = {
  appId: isDev ? 'com.neovateai.desktop.dev' : 'com.neovateai.desktop',
  productName: isDev ? 'Neovate Dev' : 'Neovate',

  directories: {
    output: isDev ? 'release-dev' : 'release',
  },

  artifactName: isDev
    ? 'neovate-dev-${arch}.${ext}'
    : 'neovate-${version}-${arch}.${ext}',

  compression: isDev ? 'store' : 'maximum',

  mac: {
    icon: isDev ? 'build/icons/icon-dev.icns' : 'build/icons/icon.icns',
    // ... 其他 mac 配置保持不变
    identity: process.env.CSC_LINK ? 'chen cheng (KU8S35TEW8)' : null,
    notarize: !!(process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD),
  },

  // ... 其他共享配置
};
```

### npm scripts

```json
{
  "scripts": {
    "package:dev": "BUILD_ENV=dev electron-builder --config configs/electron-builder.mjs",
    "package:mac": "electron-builder --config configs/electron-builder.mjs"
  }
}
```

### 文件变更

1. **修改** `configs/electron-builder.mjs` - 添加 `isDev` 判断逻辑
2. **删除** `configs/electron-builder.dev.mjs`
3. **更新** `package.json` scripts

### afterPack 日志简化

原有的 `afterPack` 钩子在删除语言包时会为每个文件输出一行日志，导致构建输出过于冗长。

**优化前：**
```
✅ Keeping language: en.lproj
✅ Keeping language: en_GB.lproj
🗑️  Removed language: af.lproj
🗑️  Removed language: am.lproj
... (200+ 行)
```

**优化后：**
```
Kept en, en_GB, removed 200 language packs
```

简化为单行总结，包含保留的语言和删除的数量。

**关于 MB 估算：** 原实现假设每个语言包约 1MB，使用 `removedCount` 作为节省的 MB 数。由于这是粗略估算且不准确，决定移除该显示，只保留删除数量。
