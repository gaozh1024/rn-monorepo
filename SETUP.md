# 🚀 Panther Expo Framework - 初始化指南

## 快速开始

### 1. 环境要求

```bash
# 检查Node版本（需要18+）
node --version  # v18.0.0+

# 检查pnpm（需要8+）
pnpm --version  # 8.0.0+

# 如果没有pnpm，安装它
npm install -g pnpm
```

### 2. 克隆/创建项目

```bash
# 克隆仓库
git clone <repository-url> monorepo-rn
cd monorepo-rn

# 安装依赖
pnpm install
```

### 3. 构建框架

```bash
# 构建统一框架包
pnpm --filter @gaozh1024/rn-kit build

# 或者构建所有
pnpm -r build
```

### 4. 本地开发（使用yalc）

```bash
# 安装yalc
npm install -g yalc

# 发布到本地yalc
pnpm yalc:publish

# 在测试项目中使用
cd your-test-project
yalc add @gaozh1024/rn-kit
```

## 在项目中使用

### 安装

```bash
npm install @gaozh1024/rn-kit
# 或
pnpm add @gaozh1024/rn-kit
```

### 前置依赖

```bash
npm install react react-native
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated
npm install react-native-svg
```

### 样式配置（重要）

本框架使用 **Tailwind CSS** 类名实现样式，需要在你的项目中配置 **NativeWind**：

```bash
npm install nativewind
npm install -D tailwindcss
```

然后创建 `tailwind.config.js`：

```javascript
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@gaozh1024/rn-kit/dist/**/*.{js,mjs}', // 必须包含框架路径
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

并在 `babel.config.js` 中添加：

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
```

📖 [查看完整配置指南](./packages/rn-kit/TAILWIND_SETUP.md)

### 基础用法

```tsx
import { AppProvider, AppView, AppText, AppButton } from '@gaozh1024/rn-kit';

function App() {
  return (
    <AppProvider>
      <AppView flex p={4}>
        <AppText size="xl">Hello Panther!</AppText>
        <AppButton>点击我</AppButton>
      </AppView>
    </AppProvider>
  );
}
```

### 状态栏推荐用法

框架现在默认由 `AppProvider` 统一管理状态栏。

- 全局 `AppStatusBar` 默认 `translucent={false}`
- 默认文字颜色会跟随当前主题切换
- Android 下默认背景色会跟随当前主题背景色

```tsx
import { AppProvider } from '@gaozh1024/rn-kit';

export default function App() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}
```

如果页面使用了 `AppHeader`，通常**不需要**再手动处理状态栏：

- `AppHeader` 内部会自动注入 `AppFocusedStatusBar`
- 配置为 `translucent + backgroundColor="transparent"`
- 顶部状态栏区域会直接显示 Header 自身背景色

如果某个页面需要单独覆盖状态栏：

```tsx
import { AppFocusedStatusBar } from '@gaozh1024/rn-kit';

<AppFocusedStatusBar barStyle="light-content" backgroundColor="transparent" translucent />;
```

更适合：

- 登录页
- 启动页
- 顶部大图 / 渐变背景页
- 不使用 `AppHeader` 的沉浸式页面

登录页全屏背景示例：

```tsx
import { AppFocusedStatusBar, SafeScreen, AppView } from '@gaozh1024/rn-kit';

export function LoginScreen() {
  return (
    <>
      <AppFocusedStatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeScreen bg="primary-500">
        <AppView flex className="bg-primary-500">
          {/* 登录内容 */}
        </AppView>
      </SafeScreen>
    </>
  );
}
```

### TabNavigator 默认底栏

框架的 `TabNavigator` 在未传入 `tabBar` 时，会默认使用内置 `BottomTabBar`，默认内容高度为 `65`。这个高度不包含底部安全区，`BottomTabBar` 会自动把设备底部安全区追加为底栏背景延伸。

```tsx
<TabNavigator
  tabBarOptions={{
    activeTintColor: '#f38b32',
    inactiveTintColor: '#9ca3af',
    height: 72,
    style: { borderTopWidth: 0 },
  }}
>
  {/* screens */}
</TabNavigator>
```

Tab 一级页面如果使用 `AppScreen`，请关闭页面自己的底部安全区，避免和底栏重复叠加：

```tsx
<AppScreen surface="background" bottom={false}>
  {/* tab root content */}
</AppScreen>
```

如果滚动内容需要主动避开固定底栏，请使用 `useBottomTabBarMetrics()` 计算总高度：

```tsx
const tabBar = useBottomTabBarMetrics({ height: 72 });

<AppScrollView contentContainerStyle={{ paddingBottom: tabBar.totalHeight + 24 }}>
  {/* content */}
</AppScrollView>;
```

如需完全自定义：

```tsx
<TabNavigator tabBar={props => <BottomTabBar {...props} height={72} />}>
  {/* screens */}
</TabNavigator>
```

## 开发命令速查

```bash
# 构建
pnpm -r build

# 开发模式（热更新）
pnpm --filter @gaozh1024/rn-kit dev

# 运行测试
pnpm -r test

# 发布到yalc
pnpm yalc:publish

# 推送更新到yalc
pnpm yalc:push
```

## 项目结构

```
monorepo-rn/
├── packages/
│   └── rn-kit/          # 统一框架包
│       ├── src/
│       │   ├── utils/      # 工具函数
│       │   ├── theme/      # 主题系统
│       │   ├── core/       # 核心业务
│       │   ├── ui/         # UI组件
│       │   └── navigation/ # 导航组件
│       └── package.json
├── docs/                   # 文档
└── package.json
```

## 故障排除

### Q: 依赖安装失败？

```bash
# 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q: 构建报错？

```bash
# 确保先安装依赖
pnpm install

# 重新构建
pnpm -r build
```

### Q: yalc链接不生效？

```bash
# 重新链接
yalc remove @gaozh1024/rn-kit
yalc add @gaozh1024/rn-kit
```
