# Expo Starter

基于 `@gaozh1024/rn-kit` 的 React Native 项目模板。

## 通过 create-expo-app 创建项目

推荐使用带 scope 的包名发布模板，避免 `expo-starter` 这类通用包名和 npm 上已有包冲突：

```bash
npx create-expo-app@latest my-app --template @gaozh1024/expo-starter
```

> 如果你发布后仍使用 `--template expo-starter`，create-expo-app 解析到的可能不是你的模板包。

## 特性

- ✅ Provider 初始化顺序固定，开箱可跑
- ✅ 目录层级稳定，职责清晰
- ✅ 首版页面覆盖基础产品能力
- ✅ 结构不过度设计，后续可自然扩展
- ✅ 内置 11 个基础页面
- ✅ Mock 数据支持，无需后端即可开发
- ✅ 内置 Logo 图片资源与应用图标配置
- ✅ 已内置 `expo-image`，可直接使用框架 `AppImage`
- ✅ 已内置 `expo-linear-gradient`，可直接使用 `GradientView`
- ✅ 已内置 `@expo/vector-icons`，可稳定使用框架 `Icon`
- ✅ 基于 Expo SDK 54 / React Native 0.81 依赖基线维护
- ✅ 默认接入 `expo-secure-store` 作为持久化 storage 适配
- ✅ 内置 deep linking 配置脚手架，可直接扩展 App Scheme 路由
- ✅ 预留业务级 Provider 扩展位，便于接入用户态、推送、埋点等能力
- ✅ 表单页已接入键盘收起交互，输入体验更一致
- ✅ 开发环境已预配置日志浮层、错误边界与 API 自动打点
- ✅ API 示例默认带敏感字段脱敏，便于发布前直接联调
- ✅ 已预置统一骨架屏能力，可直接使用 `Skeleton` / `SkeletonText` / `SkeletonAvatar`
- ✅ 设置页已接入框架 `Switch`，登录/注册/找回密码页使用框架 `AppButton`
- ✅ 页面容器优先使用 `AppScreen surface="background"` 自动适配主题

## 页面列表

| 页面           | 路径                                             | 说明                       |
| -------------- | ------------------------------------------------ | -------------------------- |
| Launch         | `features/launch/screens/LaunchScreen.tsx`       | 启动页，自动跳转登录或首页 |
| Login          | `features/auth/screens/LoginScreen.tsx`          | 登录页                     |
| Register       | `features/auth/screens/RegisterScreen.tsx`       | 注册页                     |
| ForgotPassword | `features/auth/screens/ForgotPasswordScreen.tsx` | 找回密码                   |
| Home           | `features/home/screens/HomeScreen.tsx`           | 首页                       |
| My             | `features/profile/screens/MyScreen.tsx`          | 我的页面                   |
| UserInfo       | `features/profile/screens/UserInfoScreen.tsx`    | 用户信息                   |
| Settings       | `features/profile/screens/SettingsScreen.tsx`    | 设置中心                   |
| Theme          | `features/profile/screens/ThemeScreen.tsx`       | 主题切换                   |
| Language       | `features/profile/screens/LanguageScreen.tsx`    | 语言切换                   |
| About          | `features/profile/screens/AboutScreen.tsx`       | 关于我们                   |

## 目录结构

```
expo-starter/
├── index.js                      # Expo 注册入口
├── App.tsx                       # 应用根组件
├── src/
│   ├── root/                     # 应用级装配代码
│   │   ├── RootApp.tsx           # 根应用，启动流程控制
│   │   └── providers.tsx         # 统一 Provider 配置
│   ├── bootstrap/                # 启动配置层
│   │   ├── app-config.ts         # 应用配置
│   │   ├── storage.ts            # 持久化 storage 注入
│   │   ├── theme.ts              # 主题配置
│   │   └── constants.ts          # 常量定义
│   ├── navigation/               # 导航定义
│   │   ├── RootNavigator.tsx     # 根导航器（单层导航）
│   │   ├── MainTabs.tsx          # 主 Tab 导航
│   │   ├── linking.ts            # Deep linking 配置
│   │   ├── routes.ts             # 路由常量
│   │   └── types.ts              # 导航类型
│   ├── providers/                # 业务级 Provider 扩展位
│   ├── features/                 # 业务域
│   │   ├── launch/               # 启动
│   │   ├── auth/                 # 认证
│   │   ├── home/                 # 首页
│   │   └── profile/              # 个人中心
│   ├── components/               # 公共组件
│   │   └── common/               # 通用组件
│   ├── data/                     # 数据层
│   │   ├── api.ts                # API 工厂
│   │   ├── schemas.ts            # 数据 Schema
│   │   ├── session.ts            # Session 管理
│   │   └── mocks/                # Mock 数据
│   ├── store/                    # 全局状态
│   │   ├── session.store.ts      # 登录态
│   │   └── ui.store.ts           # UI 状态
│   ├── utils/                    # 工具函数
│   └── types/                    # 类型定义
├── global.css                    # 全局样式
├── tailwind.config.js            # Tailwind 配置
├── babel.config.js               # Babel 配置
├── metro.config.js               # Metro 配置
└── package.json
```

> 当前模板采用**单层根导航**结构：所有页面统一注册在 `RootNavigator` 中，`MainTabs` 仅包含 Home 与 My 两个 Tab，二级页面（如 Settings、UserInfo 等）与 Tab 同级挂在 RootStack 下。这种结构在 rn-kit 0.4.x 推荐用法下更简洁，也便于全局手势与页面转场统一管理。

## 快速开始

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 启动开发服务器

```bash
npx expo start
```

## AI / Recipe 参考

模板内新增了一组最小参考文件，放在 [`src/recipes/`](./src/recipes/)：

- `minimal-bootstrap.tsx`：最小 `AppProvider` 接入
- `theme-toggle.tsx`：受控主题切换模式
- `api-auth.ts`：带 token 头、脱敏 observability 的 API 工厂模式
- `segmented-tabs.tsx`：页面内筛选 / 分类切换的滑块式 `SegmentedTabs` 示例
- `observatory-navigation.tsx`：`rn-observatory + rn-kit + React Navigation` 自动页面埋点接入示例

这些文件不会自动参与模板运行时，只作为可复制、可被 AI 直接引用的参考实现存在。

## 持久化 storage

模板默认已经在 [`src/bootstrap/storage.ts`](./src/bootstrap/storage.ts) 中使用 `expo-secure-store` 注入了 `@gaozh1024/rn-kit` 的 storage 适配器。

这意味着以下能力在应用重启后可以继续保留：

- `src/data/session.ts`
- `createAPI(...getHeaders)`
- Logger 浮层按钮位置

如果你要替换成别的存储实现，只需要改这一处。

## Deep Linking

模板已经内置一个最小可用的 linking 配置，文件在 [`src/navigation/linking.ts`](./src/navigation/linking.ts)。

默认使用 [`app.json`](./app.json) 里的 `scheme`:

```json
{
  "expo": {
    "scheme": "pantherstarter"
  }
}
```

当前示例支持：

- `pantherstarter://launch`
- `pantherstarter://login`
- `pantherstarter://home`
- `pantherstarter://my`
- `pantherstarter://settings`

如果你要扩展业务跳转，优先在 `src/navigation/linking.ts` 里补路由映射。

## Provider 扩展位

模板将业务级 Provider 单独放在 [`src/providers/AppProviders.tsx`](./src/providers/AppProviders.tsx)。

推荐做法：

- 根级 `src/root/providers.tsx` 只保留主题、导航、全局日志/错误边界这类稳定基础设施
- 用户态、推送、埋点、实验平台、权限初始化等业务能力统一挂在 `AppProviders`

这样模板升级时更容易和业务代码解耦。

## 依赖兼容性说明

当前模板以 **Expo SDK 54.0.x + React Native 0.81.x** 为基线维护，配套 `@gaozh1024/rn-kit ^0.5.4`。

如果你准备把 `@gaozh1024/rn-kit` 接入到其他 Expo 项目，建议：

1. 先确认你的 Expo SDK 版本
2. 使用 `npx expo install ...` 安装原生依赖
3. 再安装 `@gaozh1024/rn-kit`

模板当前默认用法与 `rn-kit 0.5.4` 对齐，推荐保持下面这套根接入方式：

- 统一由 `src/root/providers.tsx` 包裹 `AppProvider`
- 通过 `lightTheme` / `darkTheme` + `isDark` 做受控主题切换
- 开发环境默认开启 `enableLogger` 和 `enableErrorBoundary`
- 业务级 Provider 继续放在 `src/providers/AppProviders.tsx`，不要把业务能力直接塞回根装配层

尤其是：

- `expo-image`
- `react-native-reanimated`
- `react-native-worklets`
- `react-native-gesture-handler`
- `react-native-safe-area-context`
- `react-native-screens`

不要直接让 npm 在 Expo 项目里自由解析这些依赖的最新版本。

补充说明：

- 当前模板已经默认安装 `expo-image`，新建项目后可直接使用 `AppImage`
- 只有把 `rn-kit >= 0.4.6` 接入到**旧项目**时，才需要手动执行 `npx expo install expo-image`

## 本地测试模板

推荐在模板发布前，先走一遍本地安装链路验证。

### 1. 用本地模板创建项目

```bash
npx create-expo-app template-app --template file:/absolute/path/to/templates/expo-starter
```

例如：

```bash
npx create-expo-app template-app --template file:/Users/gzh/Projects/framework/rn-monorepo/templates/expo-starter
```

### 2. 注入本地 rn-kit

如果你正在联调本地框架，可以在新项目中执行：

```bash
yalc add @gaozh1024/rn-kit
npm install
```

然后启动：

```bash
yarn start
# 或
npx expo start
```

这个流程适合验证：

- 模板能否被 `create-expo-app` 正常消费
- 本地 `rn-kit` 改动能否正确注入模板项目
- 页面、导航、状态栏、底部 Tab 是否都正常工作
- 渐变背景页面是否正常显示

## 发布前检查

1. 先发布 `@gaozh1024/rn-kit`
2. 再发布当前模板包
3. 确认 `app.json` 中的 `icon / splash / adaptiveIcon / favicon` 对应资源都已打包
4. 确认模板里的 `expo` 版本和你希望支持的 Expo Go SDK 一致
5. 确认 README 中的模板包名、scope 包名、安装命令与实际发布信息一致
6. 确认 `app.json` 里的 `name / slug / scheme / ios.bundleIdentifier / android.package` 是否为你希望交付给模板使用者的默认值

### 运行到设备

```bash
# iOS
npx expo start --ios

# Android
npx expo start --android
```

## 开发指南

### 页面实现约定

模板页面默认优先使用 `rn-kit` 提供的组件与能力：

- 布局：`AppScreen` / `SafeScreen` / `AppView` / `Center` / `AppScrollView`
- 展示：`AppText` / `Card` / `Icon` / `AppImage`
- 交互：`AppButton` / `AppPressable`
- 表单：`AppInput` / `Select` / `Picker` / `DatePicker` / `Switch`
- 反馈：`Toast` / `Loading` / `Skeleton` / `SkeletonText` / `SkeletonAvatar` / `useAlert`
- 状态栏：`AppStatusBar` / `AppFocusedStatusBar`
- 导航：`StackNavigator` / `TabNavigator` / `useNavigation`
- 可观测性：`useLogger` / `createAPI(...observability)`

页面层尽量不要直接从 `react-native` 或 `@react-navigation/*` 引入基础 UI / 导航能力，优先使用 `rn-kit` 暴露的统一 API。

- `AppPressable` 已支持基础容器快捷参数，适合直接写可点击卡片、列表行、筛选项
- `AppText` 也支持文本场景常用的快捷参数（如 `p` / `m` / `w` / `rounded` / `bg`），但不建议把它当布局容器使用
- `GradientView` / `FormItem` 也已支持基础容器快捷参数
- `AppButton` / `AppInput` / `Select` / `Picker` / `DatePicker` / `Switch` 已支持常用外层快捷参数，适合直接控制 `mt` / `w` / `h` / `rounded`
- `Checkbox` / `Radio` / `Slider` / `CheckboxGroup` / `RadioGroup` / `Progress` 也已补齐常用基础快捷参数，表单与状态组件现在可以直接做快速排版
- `AppList` / `AppImage` / `Icon` 也已支持基础快捷参数，列表、图片、图标入口的快速排版会更统一

页面容器推荐这样区分：

- 常规业务页（尤其是带 `AppHeader` 的页面）：优先使用 `AppScreen surface="background"`
- 无 Header 的全屏页、沉浸式背景页：使用 `SafeScreen`
- 如果页面**没有 `AppHeader` 但仍需要顶部安全区**，请显式使用 `AppScreen top`

带 `AppHeader` 的页面通常不需要单独处理状态栏，推荐直接：

```tsx
<AppScreen surface="background">
  <AppHeader title="设置" />
  <AppScrollView>{/* 页面内容 */}</AppScrollView>
</AppScreen>
```

此时：

- `AppHeader` 会自动注入聚焦态透明状态栏
- `AppScreen` 默认 `top=false`，顶部安全区由 `AppHeader` 自己承接
- `status bar + header` 会保持同一块背景，避免顶部颜色割裂
- 底部安全区仍由 `AppScreen` 承接

如果页面**没有 Header**，推荐这样写：

```tsx
<AppScreen top surface="background">
  <AppView flex>{/* 页面内容 */}</AppView>
</AppScreen>
```

例如登录页、启动页这类全屏彩色背景页面，推荐在页面内局部覆盖状态栏：

```tsx
<>
  <AppFocusedStatusBar barStyle="light-content" translucent backgroundColor="transparent" />
  <GradientView colors={['#f38b32', '#fb923c']} style={{ flex: 1 }}>
    <SafeScreen flex top={false}>
      {/* 页面内容 */}
    </SafeScreen>
  </GradientView>
</>
```

模板已经预装 `expo-linear-gradient`，因此可以直接使用框架导出的 `GradientView`。

输入框尺寸如果需要统一调整，推荐直接：

```tsx
<AppInput placeholder="请输入手机号" style={{ height: 56 }} inputStyle={{ fontSize: 16 }} />
```

其中 `style.height` 会作用到输入框外层容器，适合整体高度控制。

### 图片与骨架屏约定

模板已经预装 `expo-image`，因此可以直接使用框架导出的 `AppImage`：

```tsx
<AppImage
  source={{ uri: user.avatar }}
  width={72}
  height={72}
  borderRadius="full"
  cachePolicy="memory-disk"
/>
```

尺寸解析优先级：`w/h` > `width/height` > `style.width/height` > 默认值。
通过 `style` 传入的宽高也会自动提取到外层容器，以下写法等价：

```tsx
<AppImage source={{ uri }} w={72} h={72} />
<AppImage source={{ uri }} width={72} height={72} />
<AppImage source={{ uri }} style={{ width: 72, height: 72 }} />
```

加载中的卡片、资料区、列表占位，推荐直接使用统一骨架组件：

```tsx
<AppView p={4} gap={3}>
  <SkeletonAvatar size={48} />
  <SkeletonText lines={3} lineWidths={['100%', '88%', '60%']} />
</AppView>
```

如果只是通用列表加载，优先使用框架的 `AppList loading`，内部已经接入统一骨架样式。

### 开发态可观测性

模板默认通过 `AppProvider` 承接框架的开发态可观测性能力。

开发环境下建议直接使用：

- `useLogger(namespace)` 记录页面和交互日志
- `createAPI({ observability })` 自动记录请求、响应和错误
- `enableErrorBoundary` 捕获 React 渲染错误

示例：

```tsx
import { AppButton, useLogger } from '@gaozh1024/rn-kit';

export function LoginAction() {
  const logger = useLogger('auth');

  return (
    <AppButton
      onPress={() => {
        logger.info('点击登录按钮');
      }}
    >
      登录
    </AppButton>
  );
}
```

如果你想显式控制，可以在 `src/root/providers.tsx` 中给 `AppProvider` 传：

```tsx
<AppProvider
  enableLogger
  enableErrorBoundary
  loggerProps={{
    level: 'info',
    overlayEnabled: true,
    exportEnabled: true,
  }}
  errorBoundaryProps={{
    title: '应用渲染异常',
    description: '开发环境已启用错误边界，可结合日志浮层快速排查问题。',
    showDetails: true,
    resetText: '重新加载',
  }}
>
  <RootApp />
</AppProvider>
```

模板当前默认就是这套接法，因此升级到 `rn-kit ^0.5.4` 时不需要额外改业务页面的根初始化方式；优先保持 `AppProvider -> AppProviders -> RootApp` 这一层级即可。

如果业务准备接入 `@gaozh1024/rn-observatory`，并且希望自动上报 `screen_view`，可以参考：

- `src/recipes/observatory-navigation.tsx`

推荐方式是把 `AppObservatoryProvider` 和 `createNavigationObservatoryTracker(...)` 放在根装配层，而不是每个页面手工调用 `trackScreen()`。

框架会在开发环境下提供：

- CLI 彩色日志输出
- App 内 `LogOverlay`
- level / namespace / 搜索 / 导出
- API `request / response / error` 自动打点

详细说明见：

- `packages/rn-kit/README.md`
- `docs/04-开发规范/开发态可观测性说明.md`

### 键盘交互约定

模板中的表单页推荐统一遵循以下约定：

- 常规页面容器优先使用 `AppScreen dismissKeyboardOnPressOutside`
- 全屏无 Header 页面优先使用 `SafeScreen dismissKeyboardOnPressOutside`
- 滚动容器优先使用 `AppScrollView dismissKeyboardOnPressOutside`
- 提交按钮默认保留 `AppButton` 的 `dismissKeyboardOnPress={true}`

这样用户点击空白区域或提交按钮时，键盘会自动收起，减少焦点残留与遮挡问题。

局部表单块如果不是整页滚动容器，也可以用：

```tsx
import { KeyboardDismissView } from '@gaozh1024/rn-kit';

<KeyboardDismissView>{/* 局部输入区域 */}</KeyboardDismissView>;
```

### 选择器与弹层约定

当前模板里与选择器相关的 UI 约定已经和框架保持一致：

- `Select`：适合单选 / 多选项列表
- `Picker`：适合通用多列选择
- `DatePicker`：当前本质上是基于多列滚轮的日期选择器

这三者的底部弹层样式与动画已统一：

- 遮罩层淡入淡出
- 面板从底部进入 / 退出
- 支持点击遮罩关闭

如果业务后续需要省市区、级联项等滚轮选择，优先基于 `Picker` 扩展。

### 主题切换说明

模板已改为通过 `AppProvider isDark` 受控切换主题，切换浅色 / 深色 / 跟随系统时不再依赖重新挂载根组件。

页面实现上优先使用这些主题语义能力：

- 容器背景：`surface="background"` / `surface="card"`
- 文本颜色：`tone="default"` / `tone="muted"` / `color="primary-500"`
- 页面容器：`AppScreen` / `SafeScreen` / `AppView` / `AppScrollView`

如果页面里直接写死 `bg-white`、`text-gray-700` 这类类名，暗色模式下通常就不会自动跟随主题。

### 底部导航栏

模板中的 `MainTabs` 默认使用 `rn-kit` 内置的 `BottomTabBar`，通过 `tabBarOptions` 统一配置高度、颜色和样式：

```tsx
<TabNavigator
  tabBarOptions={{
    activeTintColor: '#f38b32',
    inactiveTintColor: '#9ca3af',
    activeBackgroundColor: '#fff7ed',
    height: 72,
    style: { borderTopWidth: 0, backgroundColor: '#ffffff' },
  }}
>
  {/* screens */}
</TabNavigator>
```

### 导航类型约定

模板导航相关代码集中在：

- `src/navigation/types.ts`：参数列表与导航类型别名
- `src/navigation/routes.ts`：路由名称常量
- `src/navigation/*.tsx`：基于 `rn-kit` 的导航器装配

推荐页面内这样写：

```tsx
import { useNavigation } from '@gaozh1024/rn-kit';
import type { RootNavigationProp } from '@/navigation/types';

export function LoginScreen() {
  const navigation = useNavigation<RootNavigationProp>();

  return null;
}
```

这样页面只依赖：

- `rn-kit` 提供的导航 hook
- 模板自己的导航类型文件

不会直接耦合 `@react-navigation/native` 或 `@react-navigation/stack`。

导航结构说明：

- `RootNavigator`：根导航器，管理整个应用的路由栈
- `MainTabs`：主 Tab 导航，包含 Home 和 My 两个标签页
- 认证页面（Login、Register、ForgotPassword）和二级页面（Theme、Language、UserInfo、Settings、About）都在 RootStack 中注册

### 添加新页面

1. 在 `src/features/{domain}/screens/` 创建页面组件
2. 在 `src/navigation/types.ts` 添加路由参数类型
3. 如有需要，在 `src/navigation/types.ts` 增加页面对应的导航类型别名
4. 在 `RootNavigator.tsx` 中注册页面

### 添加新 API

1. 在对应 feature 的 `api.ts` 中定义端点
2. 在 `src/data/schemas.ts` 中定义输入输出 Schema
3. 在 `src/data/mocks/` 中添加 Mock 数据（如需要）

### 组件放置规则

- **页面私有组件**：放在页面文件附近
- **业务域内复用组件**：放在 `features/{domain}/components/`
- **跨业务域复用组件**：放在 `components/common/`

## 技术栈

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Zod](https://zod.dev/)
- [@gaozh1024/rn-kit](https://github.com/gaozh1024/rn-kit)

## 许可证

MIT

## Web smoke route

This starter includes a Web smoke route at `/web-smoke`. It renders representative `@gaozh1024/rn-kit` components through the package entry so package exports, Web variants, NativeWind, Reanimated/Worklets, Gesture Handler, overlays, forms, and navigation can be checked in a real Expo Web runtime.

```bash
pnpm web
# open http://localhost:8081/web-smoke
```
