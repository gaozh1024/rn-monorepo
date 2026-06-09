# Tailwind CSS / NativeWind 配置指南

> 本框架使用 Tailwind CSS 类名来实现样式，需要在你的项目中配置 NativeWind 才能正常使用。

## 为什么需要这个配置？

框架的 UI 组件（如 `AppView`, `AppText`, `AppButton` 等）使用 Tailwind CSS 类名（如 `bg-primary-500`, `flex-1`, `p-4`）来定义样式。

这些类名需要 **NativeWind** 在构建时解析并转换为 React Native 的 StyleSheet。

`AppHeader` 也是同样的机制。它的布局依赖 `AppView` 的这些属性：

- `row`
- `items="center"`
- `px={4}`

这些属性最终会生成 `flex-row`、`items-center`、`px-4` 这样的 Tailwind 类名。如果 app 没有正确配置 NativeWind，或者 Tailwind 没有扫描到这些类名，`AppHeader` 看起来就会像“完全没样式”。

## 安装依赖

```bash
npm install nativewind
npm install -D tailwindcss
```

## 配置文件

### 1. 创建 Tailwind 配置文件

在项目根目录创建 `tailwind.config.js`：

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // 你的项目文件
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',

    // 使用 npm / pnpm / yarn 安装发布包时，必须包含框架产物路径
    './node_modules/@gaozh1024/rn-kit/dist/**/*.{js,mjs}',

    // 如果你在本地通过 workspace / file: / 本地源码方式接入框架，
    // 还需要把实际源码路径加进来
    // '../rn-monorepo/packages/rn-kit/src/**/*.{ts,tsx}',
  ],
  safelist: [
    // AppView / SafeScreen 的动态类
    { pattern: /^(flex)-(1|2|3|4|5|6|7|8|9|10|11|12)$/ },
    { pattern: /^(items)-(start|center|end|stretch)$/ },
    { pattern: /^(justify)-(start|center|end|between|around)$/ },
    { pattern: /^(p|px|py|gap)-(0|1|2|3|4|5|6|8|10|12)$/ },
    { pattern: /^(rounded)-(none|sm|md|lg|xl|2xl|full)$/ },

    // AppView / AppText / 框架组件中常见的动态颜色类
    {
      pattern: /^(bg|text)-(primary|secondary|success|warning|error|info|gray|white|black)(-.+)?$/,
    },
  ],
  theme: {
    extend: {
      // 可以扩展或覆盖框架主题
      colors: {
        primary: {
          DEFAULT: '#f38b32',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f38b32',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // ... 其他颜色
      },
    },
  },
  plugins: [],
};
```

### 为什么还需要 `safelist`？

框架里有一部分样式不是写死字符串，而是通过 props 动态拼出来的，例如：

```tsx
<AppView px={4} items="center" bg="primary-500" rounded="lg" />
```

这些 props 会在运行时生成：

- `px-4`
- `items-center`
- `bg-primary-500`
- `rounded-lg`

如果不把这些动态类加入 `safelist`，Tailwind 在扫描时无法完整收集它们，最终表现就是：

- 组件能渲染
- 但布局、间距、背景色、圆角不生效
- `AppHeader` 看起来尤其明显

### 2. 配置 Babel

修改 `babel.config.js`：

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
```

关键点：

- `nativewind/babel` 在 NativeWind 4.x 里是 `preset`，不要放进 `plugins`
- Expo 项目需要在 `babel-preset-expo` 上补 `jsxImportSource: 'nativewind'`
- 对 Expo SDK 54/55 + Reanimated 4 场景，不需要再额外挂 `react-native-reanimated/plugin`

错误示例：

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'], // 错误：这里会触发 .plugins is not a valid Plugin property
  };
};
```

### 3. 配置 Metro（如果需要）

对于某些 React Native 版本，可能需要配置 `metro.config.js`：

```javascript
const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();

  return {
    transformer: {
      babelTransformerPath: require.resolve('nativewind/src/css-interop/transformer'),
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'css'),
      sourceExts: [...sourceExts, 'css'],
    },
  };
})();
```

### 4. 创建 CSS 入口文件（推荐）

创建 `global.css` 文件：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

在应用入口导入（如 `App.tsx`）：

```tsx
import './global.css';
// ... 其他导入
```

## 验证配置

创建一个测试页面验证样式是否正常：

```tsx
import { AppView, AppText, AppButton } from '@gaozh1024/rn-kit';

export function TestScreen() {
  return (
    <AppView flex center p={4} bg="gray-100">
      <AppText size="xl" weight="bold" color="primary-500">
        如果这行文字是橙色，说明配置成功！
      </AppText>

      <AppButton
        className="mt-4 px-6 py-3 bg-primary-500 rounded-lg"
        onPress={() => console.log('Clicked!')}
      >
        测试按钮
      </AppButton>
    </AppView>
  );
}
```

如果这个页面正常，但 `AppHeader` 仍没有样式，再额外验证：

```tsx
import { AppHeader, AppScreen } from '@gaozh1024/rn-kit';

export function HeaderTestScreen() {
  return (
    <AppScreen>
      <AppHeader title="样式检查" rightIcons={[{ icon: 'search', onPress: () => {} }]} />
    </AppScreen>
  );
}
```

预期现象：

- 顶部区域有高度和左右内边距
- 标题居中
- 右侧图标有点击区域

如果这里仍然没有样式，优先检查 `content` 和 `safelist`。

## 常见问题

### Q: 样式不生效，组件显示默认样式？

**检查清单**：

1. ✅ `tailwind.config.js` 中的 `content` 是否包含框架路径？
2. ✅ `babel.config.js` 是否按 NativeWind 4.x 写成 `presets` 配置？
3. ✅ `tailwind.config.js` 是否添加了框架所需的 `safelist`？
4. ✅ 是否重启了 Metro bundler？（修改配置后需要重启）
5. ✅ 是否清除了缓存？（Expo 推荐 `npx expo start -c`，React Native CLI 可用 `npx react-native start --reset-cache`）
6. ✅ `babel-preset-expo` 是否配置了 `jsxImportSource: 'nativewind'`？

### Q: 为什么 `ThemeProvider` 配了，组件还是没样式？

因为 `ThemeProvider` 只负责运行时主题数据，不负责把 `className` 转成 React Native 样式。

这里要区分两件事：

- `ThemeProvider` / `createTheme`
  - 提供主题对象、颜色值、暗黑模式信息
- NativeWind / Tailwind
  - 负责把 `className="px-4 bg-primary-500"` 转成真正的 RN 样式

所以即使 `ThemeProvider` 正常，NativeWind 没接好时，组件还是会“无样式”。

### Q: 为什么 `AppHeader` 特别容易暴露这个问题？

因为它内部大量依赖布局类名组合：

- `row`
- `items="center"`
- `px={4}`

这些都是通过框架组件在运行时拼出来的。如果 app 没配置 `safelist`，`AppHeader` 往往会先表现出：

- 标题不居中
- 左右按钮没有布局
- 顶部内边距不对
- 看起来像“几乎没样式”

### Q: 这算框架问题还是 app 配置问题？

结论：

- “完全没样式”通常是 **app 配置问题**
- “已接通 NativeWind，但某些 props 风格不生效”则和框架当前使用了**动态 className** 有关，app 需要额外补 `safelist`

也就是说，这不是渲染 bug，但框架对消费方配置有明确要求。

但还有一个容易忽略的例外：

- 如果你是通过 `yalc`、`file:`、本地源码链接的方式接入框架，app 里实际加载的可能还是**旧的构建产物**

例如框架已经修复了样式运行时，但 app 的 `.yalc/@gaozh1024/rn-kit/dist` 没同步更新，那么你即使把 app 的 NativeWind 配置全改对，组件依然可能没有样式。

遇到这种情况，除了检查 app 配置，还要确认：

1. 框架是否已经重新执行 `build`
2. 本地链接包是否已经重新同步到 app
3. Expo / Metro 是否已经清缓存重启

推荐顺序：

```bash
# 在框架仓库
pnpm --filter @gaozh1024/rn-kit build

# 如果使用 yalc
yalc publish

# 在 app 仓库
yalc update @gaozh1024/rn-kit
npx expo start -c
```

### Q: `AppHeader` 没样式，但 `tailwind.config.js` 看起来已经配好了？

优先检查 `babel.config.js` 有没有把 `nativewind/babel` 错写到 `plugins`，或者漏掉 `jsxImportSource: 'nativewind'`。

这是一个高频误配。出现这个问题时，通常会看到：

- `AppHeader` 没有左右内边距
- 标题布局不对
- `AppView` 的 `row`、`items="center"`、`px={4}` 全部像没生效

原因不是 `AppHeader` 本身有 bug，而是 NativeWind 根本没有正确参与 Babel 转换。

### Q: 如何自定义主题颜色？

在 `tailwind.config.js` 中扩展主题：

```javascript
module.exports = {
  content: [
    /* ... */
  ],
  theme: {
    extend: {
      colors: {
        // 覆盖框架默认主色
        primary: {
          500: '#1890ff', // 改为蓝色
        },
        // 添加自定义颜色
        brand: {
          500: '#ff6b6b',
        },
      },
    },
  },
};
```

然后在组件中使用：

```tsx
<AppView bg="brand-500" /> // 使用自定义颜色
```

### Q: 与框架主题系统的关系？

框架的 `ThemeProvider` 和 `createTheme` 提供**运行时主题数据**（如颜色值、间距值）。

Tailwind CSS 提供**构建时样式类名**。

两者配合工作：

- Tailwind 类名决定样式结构（如 `flex`, `p-4`, `rounded-lg`）
- 主题系统提供具体的颜色值（如 `primary-500` 对应的颜色）

## 相关文档

- [NativeWind 官方文档](https://www.nativewind.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [框架快速开始](../../SETUP.md)
