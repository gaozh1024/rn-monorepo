# @gaozh1024/rn-kit

> Panther Expo Framework - All-in-one React Native framework

一个集成的 React Native 开发框架，包含主题系统、UI 组件、API 工厂和导航组件。

## ✅ 推荐初始化方式

业务 App 推荐优先使用 `AppProvider`，而不是只手动包一层 `ThemeProvider`。

`AppProvider` 默认会整合：

- `SafeAreaProvider`
- `ThemeProvider`
- `NavigationProvider`
- `OverlayProvider`
- `AppStatusBar`

另外在**开发环境**下，`AppProvider` 默认会启用一套轻量的开发日志基础设施：

- `LoggerProvider`
- CLI 彩色日志输出
- App 内 `LogOverlay` 浮层
- `AppErrorBoundary` React 渲染错误兜底

这样页面切换、主题切换时，状态栏会自动跟随全局主题变化。

## 🌐 Web support

`rn-kit` publishes a browser bundle and maintains a Web support matrix for Expo Web / React Native Web usage. See [docs/web-support-matrix.md](./docs/web-support-matrix.md) for supported components, conditional requirements, known limitations, and release verification commands.

## 📦 安装

```bash
npm install @gaozh1024/rn-kit
# 或
pnpm add @gaozh1024/rn-kit
# 或
yarn add @gaozh1024/rn-kit
```

### 前置依赖

#### Expo 项目（推荐）

如果你使用的是 Expo，请优先使用 `expo install`，让 Expo 按当前 SDK 自动选择兼容版本：

```bash
npx expo install react-native-screens react-native-safe-area-context
npx expo install react-native-gesture-handler react-native-reanimated
npx expo install @expo/vector-icons expo-linear-gradient
npm install react-native-svg
```

如果你的项目是 **Expo SDK 54 / React Native 0.81**，还需要：

```bash
npx expo install react-native-worklets
```

> 注意：**Expo SDK 54 对应的是 React Native 0.81，不是 0.79。**
> 如果你的项目是 React Native 0.79，通常对应 Expo SDK 53 一档，请不要直接按 SDK 54 的版本理解依赖关系。

#### 非 Expo / 手动安装

```bash
npm install react react-native
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated
npm install @expo/vector-icons expo-linear-gradient
npm install react-native-svg
```

#### 当前兼容性范围

`0.4.3` 当前将 peerDependencies 收紧到以下范围，避免 npm 解析到和当前 RN 不兼容的过高版本：

- `expo`: `>=53 <55`
- `react-native`: `>=0.79 <0.82`
- `react-native-reanimated`: `>=3.17.0 <5`
- `react-native-worklets`: `>=0.5.0 <0.6.0`（可选）

如果你在 Expo 项目中安装依赖，建议顺序是：

```bash
npx expo install react-native-screens react-native-safe-area-context
npx expo install react-native-gesture-handler react-native-reanimated
npx expo install @expo/vector-icons expo-linear-gradient expo-image
npx expo install react-native-worklets
npm install @gaozh1024/rn-kit
```

如果你是 Expo SDK 53 / RN 0.79 项目，通常不需要单独安装 `react-native-worklets`，以 `expo install` 给出的结果为准。

> 从 `rn-kit 0.4.6` 开始，`AppImage` 基于 `expo-image` 实现。
> **新建模板项目通常已内置，无需重复安装；旧项目升级到 `rn-kit >= 0.4.6` 时，请执行 `npx expo install expo-image`。**

### ⚠️ 样式配置（必看）

本框架使用 **Tailwind CSS** 类名实现样式（如 `bg-primary-500`, `flex-1`, `p-4`），需要在你的项目中配置 **NativeWind** 才能正常显示样式。

如果你发现 `AppHeader`、`AppView`、`AppButton` 没有样式或布局错乱，通常不是框架内部渲染失败，而是消费方 app 没有把 NativeWind 和 Tailwind 扫描范围配置完整。

```bash
npm install nativewind
npm install -D tailwindcss
```

创建 `tailwind.config.js`：

```javascript
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@gaozh1024/rn-kit/dist/**/*.{js,mjs}', // 必须包含框架路径
  ],
  safelist: [
    { pattern: /^(flex)-(1|2|3|4|5|6|7|8|9|10|11|12)$/ },
    'flex-wrap',
    { pattern: /^(items)-(start|center|end|stretch)$/ },
    { pattern: /^(justify)-(start|center|end|between|around)$/ },
    { pattern: /^(p|px|py|gap)-(0|1|2|3|4|5|6|8|10|12)$/ },
    { pattern: /^(rounded)-(none|sm|md|lg|xl|2xl|full)$/ },
    {
      pattern: /^(bg|text)-(primary|secondary|success|warning|error|info|gray|white|black)(-.+)?$/,
    },
  ],
  theme: { extend: {} },
  plugins: [],
};
```

修改 `babel.config.js`：

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
```

📖 [查看完整 Tailwind 配置指南](./TAILWIND_SETUP.md)

## 🚀 快速开始

```tsx
import { AppProvider, AppView, AppText, AppButton, useToggle } from '@gaozh1024/rn-kit';

function App() {
  const [visible, { toggle }] = useToggle(false);

  return (
    <AppProvider>
      <AppView flex p={4}>
        <AppText size="xl">Hello Panther!</AppText>
        <AppButton onPress={toggle}>{visible ? '隐藏' : '显示'}</AppButton>
      </AppView>
    </AppProvider>
  );
}
```

如果你只需要最小主题能力，也可以单独使用：

```tsx
import { ThemeProvider, createTheme } from '@gaozh1024/rn-kit';

const theme = createTheme({
  colors: {
    primary: '#f38b32',
  },
});
```

## 📚 API 概览

### 🎨 主题系统

```tsx
import { ThemeProvider, createTheme, useTheme } from '@gaozh1024/rn-kit';
```

### 🧱 应用初始化与状态栏

```tsx
import { AppProvider, AppStatusBar } from '@gaozh1024/rn-kit';
```

受控切换主题时，推荐直接给 `AppProvider` / `ThemeProvider` 传 `isDark`，不要再通过重建根组件强制刷新：

```tsx
<AppProvider lightTheme={lightTheme} darkTheme={darkTheme} isDark={themeMode === 'dark'}>
  <RootNavigator />
</AppProvider>
```

### 🌊 流式请求

`rn-kit` 提供一套轻量的流式请求基础能力，适合：

- `text/event-stream`
- AI / Chat 增量输出
- 长连接生成式响应

公开 API：

```tsx
import { createApiStreamRequest, readApiSSEStream, useStreamRequest } from '@gaozh1024/rn-kit';
```

详细说明见：

- [docs/streaming-api.md](./docs/streaming-api.md)

### 🧩 UI 组件

```tsx
import {
  AppView,
  AppScrollView,
  AppFlatList,
  AppText,
  AppPressable,
  KeyboardDismissView,
  KeyboardInsetView,
  AppInput, // 原子组件
  Row,
  Col,
  Center, // 布局
  AppButton, // 组合组件
  Toast,
  Alert,
  Loading,
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  Progress, // 反馈
  Card,
  Icon,
  AppImage,
  AppList,
  GradientView,
  SegmentedTabs,
  PageDrawer, // 数据展示 / 页面级抽屉
  Checkbox,
  Radio,
  Switch,
  Select,
  Picker,
  DatePicker, // 表单
} from '@gaozh1024/rn-kit';
```

#### 布局与容器约定

- 这批容器组件已统一支持一套快捷参数，优先走 React Native `style`，不再依赖这些参数对应的 Tailwind safelist：
  - 布局：`flex` / `row` / `wrap` / `center` / `between` / `items` / `justify`
  - 间距：`p` / `px` / `py` / `pt` / `pb` / `pl` / `pr` / `m` / `mx` / `my` / `mt` / `mb` / `ml` / `mr` / `gap`
  - 尺寸：`w` / `h` / `minW` / `minH` / `maxW` / `maxH`
  - 外观：`rounded`
- `SafeScreen` / `AppScreen` 同时支持：
  - `bg="primary-500"` 这类显式颜色
  - `surface="background" | "card" | "muted"` 这类语义背景
  - `dismissKeyboardOnPressOutside`：点击非输入区域时收起键盘
- 语义建议：
  - `SafeScreen`：底层安全区容器，默认 `top=true` / `bottom=true`
  - `AppScreen`：业务页面容器，默认 `top=false` / `bottom=true`，更适合和 `AppHeader` 搭配
- 顶部安全区职责建议：
  - **带 `AppHeader` 的页面**：顶部安全区交给 `AppHeader`，`AppScreen` 保持默认 `top={false}`
  - **不带 `AppHeader` 的页面**：顶部安全区交给 `AppScreen top` 或 `SafeScreen`
  - 这样 `status bar + header` 可以保持同一块背景，避免顶部颜色割裂
- 推荐模式：

```tsx
// Header 页
<AppScreen>
  <AppHeader title="设置" />
  <AppScrollView>{/* 内容 */}</AppScrollView>
</AppScreen>

// 非 Header 页
<AppScreen top>
  <AppView flex>{/* 内容 */}</AppView>
</AppScreen>

// 沉浸式页面
<SafeScreen top={false}>{/* 内容 */}</SafeScreen>
```

- `AppScrollView` 支持 `dismissKeyboardOnPressOutside`
  - 开启后会自动启用点击空白收起键盘
  - 并默认补上 `keyboardShouldPersistTaps="handled"`
- `AppFlatList` 支持与 `AppScrollView` 一致的容器快捷参数
  - 外层支持：`flex` / 外边距 / 尺寸 / `bg` / `surface` / `rounded`
  - 内容区支持：布局 / 内边距 / `gap`
  - 开启 `dismissKeyboardOnPressOutside` 时默认补上 `keyboardShouldPersistTaps="handled"`
- `KeyboardDismissView` 适合非页面容器、自定义布局场景下单独包裹使用
- `KeyboardInsetView` 适合底部输入栏 / 评论框 / 聊天输入区的键盘避让
- `AppInput` 的尺寸与样式控制建议：
  - `style={{ height: 56 }}` 会作用到输入框外层容器
  - `h` / `minH` / `maxH` / `rounded` / `bg` / `surface` 作用于输入容器
  - 文本字号、行高、文本内边距等更细粒度样式请使用 `inputStyle`
  - 输入容器边框、背景、圆角等覆盖请使用 `containerStyle`
  - Web 端已内置原生 `input:focus` outline reset，只保留 rn-kit 外层 focus 边框
- 表单类触发器补充说明：
  - `AppInput` / `Select` / `Picker` / `DatePicker` 现已支持一套“外层基础快捷参数”
  - 常用场景：
    - 外层排版：`flex` / `mt` / `mb` / `w`
    - 控件外观：`h` / `minH` / `maxH` / `rounded` / `bg` / `surface`
- `AppImage` 已基于 `expo-image` 封装
  - 支持缓存策略 `cachePolicy`
  - 支持占位图 `placeholder`
  - 默认支持淡入过渡 `transition`
- 骨架屏已提供统一组件：
  - `Skeleton`
  - `SkeletonBlock`
  - `SkeletonText`
  - `SkeletonAvatar`

#### 容器快捷参数支持矩阵

| 组件            | 默认行为                         | 支持快捷参数                                                                                       | 补充说明                                                                                            |
| --------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `AppView`       | 基础容器                         | 布局 / 间距 / 尺寸 / `bg` / `surface` / `rounded` / `className`                                    | 通用容器基座                                                                                        |
| `Row`           | `row`，默认 `items="center"`     | 继承 `AppView` 全部快捷参数                                                                        | `justify` 默认 `start`                                                                              |
| `Col`           | 纵向布局，默认 `items="stretch"` | 继承 `AppView` 全部快捷参数                                                                        | `justify` 默认 `start`                                                                              |
| `Center`        | 强制居中，默认不撑满             | 继承 `AppView` 大部分快捷参数                                                                      | 内部固定 `center`，需要铺满时请显式传 `flex`                                                        |
| `AppScrollView` | 滚动容器                         | 外层支持：`flex` / 外边距 / 尺寸 / `bg` / `surface` / `rounded`；内容区支持：布局 / 内边距 / `gap` | `row` / `items` / `justify` 作用于 `contentContainerStyle`                                          |
| `AppFlatList`   | 虚拟列表容器                     | 外层支持：`flex` / 外边距 / 尺寸 / `bg` / `surface` / `rounded`；内容区支持：布局 / 内边距 / `gap` | 保持原生 `FlatListProps<T>`，适合常规高性能列表场景                                                 |
| `AppPressable`  | 可点击容器                       | 布局 / 间距 / 尺寸 / `bg` / `surface` / `rounded` / `className`                                    | 适合作为“可点击的 `AppView`”，保留 `pressedClassName`，且兼容原生 `style(state)`                    |
| `AppText`       | 基础文本                         | `flex` / 间距 / 尺寸 / `bg` / `surface` / `rounded` / `className`                                  | 仅保留适合文本的快捷参数，不支持 `row/gap/items/justify` 等容器语义                                 |
| `GradientView`  | 渐变背景容器                     | 布局 / 间距 / 尺寸 / `rounded`                                                                     | 适合页面头图、Banner、渐变卡片容器                                                                  |
| `AppImage`      | 图片组件                         | 外层支持：`flex` / 外边距 / 尺寸 / `rounded` / `bg` / `surface`                                    | 保留 `width/height/borderRadius` 兼容写法，并新增快捷别名；`style` 中的宽高也会自动提取到外层容器   |
| `Icon`          | 图标组件                         | 外层支持：`flex` / 间距 / 尺寸 / `rounded` / `bg` / `surface`                                      | 适合做图标按钮、徽标入口、状态图标容器                                                              |
| `AppButton`     | 按钮                             | `flex` / 外边距 / 尺寸 / `rounded`                                                                 | `size` 继续控制默认内边距；快捷参数主要用于外层排版                                                 |
| `Card`          | 卡片容器                         | 布局 / 间距 / 尺寸 / `bg` / `surface` / `rounded` / `className`                                    | 另有 `variant` / `noShadow` / `noBorder` / `noRadius`；长列表推荐 `variant="flat"`                  |
| `AppList`       | 高级列表组件                     | 外层支持：`flex` / 外边距 / 尺寸 / `bg` / `surface` / `rounded`；内容区支持：布局 / 内边距 / `gap` | 和 `AppFlatList` 保持一致，适合直接承载业务空态/错态/骨架                                           |
| `SegmentedTabs` | 滑块式 Tab/Menu 切换条           | 外层支持：`flex` / 外边距 / 尺寸；滑块支持 `indicatorStyle` / `indicatorInset`                     | 适合页面内分类、状态筛选；点击后滑块会跟随选中项动画移动（Native: Reanimated，Web: CSS transition） |
| `AppInput`      | 输入框                           | 外层支持：`flex` / 外边距 / `w`；输入容器支持：尺寸 / `rounded` / `bg` / `surface`                 | 内置布局、内边距、圆角和字号不依赖 `className`；更细粒度仍推荐配合 `containerStyle` / `inputStyle`  |
| `Checkbox`      | 复选框                           | 外层支持：`flex` / 间距 / `gap` / 尺寸 / `rounded` / `bg` / `surface`                              | 适合直接扩展点击热区、间距和标签排版                                                                |
| `Radio`         | 单选框                           | 外层支持：`flex` / 间距 / `gap` / 尺寸 / `rounded` / `bg` / `surface`                              | 与 `Checkbox` 保持一致，便于统一表单行样式                                                          |
| `Switch`        | 开关                             | 外层支持：`flex` / 外边距；轨道支持：`rounded`                                                     | 尺寸仍建议优先使用 `size`，`style` 继续可用于细调轨道                                               |
| `Slider`        | 滑块                             | 外层支持：`flex` / 外边距 / 宽度；轨道支持：`rounded` / `bg` / `surface`                           | 更适合直接控制组件占位宽度与轨道观感                                                                |
| `CheckboxGroup` | 复选组                           | 布局 / 间距 / 尺寸 / `bg` / `surface` / `rounded` / `className`                                    | 组容器本身按 `AppView` 思路工作，子项仍使用 `Checkbox`                                              |
| `RadioGroup`    | 单选组                           | 布局 / 间距 / 尺寸 / `bg` / `surface` / `rounded` / `className`                                    | 组容器本身按 `AppView` 思路工作，子项仍使用 `Radio`                                                 |
| `Select`        | 选项选择器                       | 外层支持：`flex` / 外边距；触发器支持：尺寸 / `rounded` / `bg` / `surface`                         | 适合单选 / 多选列表型选择                                                                           |
| `Picker`        | 通用多列滚轮选择器               | 外层支持：`flex` / 外边距；触发器支持：尺寸 / `rounded` / `bg` / `surface`                         | 适合省市区、级联、多列滚轮选择                                                                      |
| `DatePicker`    | 日期滚轮选择器                   | 继承 `Picker` 的同一套基础快捷参数                                                                 | 仅封装日期语义与快捷按钮                                                                            |
| `FormItem`      | 表单项容器                       | 布局 / 间距 / 尺寸 / `bg` / `surface` / `rounded` / `className`                                    | 适合统一表单块容器、说明区、帮助文案区                                                              |
| `Progress`      | 进度条                           | 外层支持：`flex` / 外边距 / 尺寸；轨道支持：`rounded` / `bg` / `surface`                           | `size` 继续负责默认高度语义，`h` 可用于显式覆盖                                                     |
| `SafeScreen`    | 底层安全区容器                   | 布局 / 间距 / 尺寸 / `bg` / `surface` / `rounded` / `className`                                    | 默认 `top=true` / `bottom=true`，安全区 inset 会自动并入 padding                                    |
| `AppScreen`     | 页面语义容器                     | 布局 / 间距 / 尺寸 / `bg` / `surface` / `rounded` / `className`                                    | 默认 `top=false` / `bottom=true`，更适合带 `AppHeader` 的页面                                       |

`SegmentedTabs` 示例：

```tsx
const tabs = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'pending' },
  { label: '已完成', value: 'done' },
];

<SegmentedTabs
  options={tabs}
  value={status}
  onChange={nextStatus => setStatus(nextStatus)}
  indicatorColor="#f38b32"
  backgroundColor="#f3f4f6"
  indicatorStyle={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }}
  style={{ width: 280 }}
/>;
```

`SegmentedTabs` 适合页面内分类、状态筛选、顶部 menu 等场景；它不是导航容器，也不会创建路由。点击选项时，组件会根据选中索引更新滑块的 `translateX` 与宽度，从而得到左右滑动的选中块效果。

跨端动画策略：

- Native（iOS / Android）：默认使用 Reanimated 驱动滑块动画
- Web：默认使用 CSS transition 驱动滑块动画（`transform + width + opacity`）
- 如需关闭动画，可使用 `animated={false}` 或 `motionReduceMotion`

常用 Props：

| Prop                                                     | 说明                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| `options`                                                | 选项数组：`{ label, value, icon?, disabled?, accessibilityLabel? }` |
| `value` / `defaultValue`                                 | 受控 / 非受控当前值，`value` 支持 `string` 或 `number`              |
| `onChange`                                               | 切换回调：`(value, option, index) => void`                          |
| `size`                                                   | 尺寸预设：`sm` / `md` / `lg`                                        |
| `rounded`                                                | 圆角预设，默认 `full`                                               |
| `indicatorInset`                                         | 滑块与容器边缘间距，默认 `3`                                        |
| `indicatorColor`                                         | 选中滑块颜色，默认主题主色                                          |
| `backgroundColor`                                        | 容器背景色，默认主题分割线色                                        |
| `activeTintColor` / `inactiveTintColor`                  | 选中 / 未选中文字色                                                 |
| `animated`                                               | 是否启用滑块移动动画，默认 `true`                                   |
| `motionDuration`                                         | timing 动画时长                                                     |
| `motionSpringPreset`                                     | spring 动画预设：`snappy` / `smooth` / `bouncy`                     |
| `style` / `indicatorStyle`                               | 容器 / 滑块样式覆盖                                                 |
| `itemStyle` / `activeItemStyle`                          | 选项 / 选中选项样式覆盖                                             |
| `labelStyle` / `activeLabelStyle` / `disabledLabelStyle` | 标签样式覆盖                                                        |
| `renderLabel` / `renderItem`                             | 自定义标签或整个选项内容渲染                                        |

自定义内容示例：

```tsx
<SegmentedTabs
  options={tabs}
  value={status}
  onChange={nextStatus => setStatus(nextStatus)}
  renderItem={({ option, selected }) => (
    <AppText weight={selected ? 'bold' : 'medium'}>{option.label}</AppText>
  )}
/>
```

> 说明：`className` 依然走 NativeWind；上表中的快捷参数本身已经由框架直接转换为内联 `style`。
>
> Web / App 样式一致性约定：框架内置组件的关键布局、点击热区、输入框内边距、圆角和字号不应只依赖 `className`。`className` 仍可用于业务侧追加装饰样式；如果该样式影响可用性或移动端 Web 首屏体验，请优先使用快捷参数、`style`、`containerStyle` 或 `inputStyle`。

#### Card 轻量表面

`Card` 支持 `variant` 来表达列表/网格中的表面重量：

- `variant="flat"`：无阴影、无边框，推荐商品列表、Feed、瀑布流等高密度滚动场景。
- `variant="outlined"`：无阴影、有细边框，适合需要边界但不需要 elevation 的列表卡片。
- `variant="elevated"`：保持默认阴影 + 边框视觉；不传 `variant` 时也保持现有默认行为。

`noShadow` / `noBorder` / `noRadius` 仍可作为关闭型覆盖项使用。长列表里的可点击卡片建议同时关闭按压动画：

```tsx
<Card variant="flat" motionPreset="none" onPress={goDetail}>
  <AppText>商品标题</AppText>
</Card>
```

#### Button 颜色语义

`AppButton` 目前支持以下 `color`：

- `primary`
- `secondary`
- `success`
- `warning`
- `info`
- `error`
- `danger`（`error` 的兼容别名）
- `muted`

```tsx
<AppButton color="success">保存成功</AppButton>
<AppButton color="warning" variant="outline">
  继续操作
</AppButton>
<AppButton color="danger">删除</AppButton>
```

#### 键盘收起交互

`AppButton` 新增：

- `dismissKeyboardOnPress?: boolean`
- 默认值：`true`

也就是说，大多数提交/保存/登录按钮在点击前会先自动收起键盘：

```tsx
<AppButton onPress={handleSubmit}>提交</AppButton>

<AppButton dismissKeyboardOnPress={false} onPress={handleToolbarAction}>
  保持键盘
</AppButton>
```

容器侧推荐这样使用：

```tsx
<AppScreen dismissKeyboardOnPressOutside>
  <AppScrollView dismissKeyboardOnPressOutside>
    <AppInput placeholder="请输入手机号" />
    <AppInput placeholder="请输入密码" secureTextEntry />
    <AppButton onPress={handleLogin}>登录</AppButton>
  </AppScrollView>
</AppScreen>
```

#### `AppInput` 密码明文/密文切换

`AppInput` 支持可选的密码明文/密文切换能力：

- 默认**不显示**切换图标
- 仅在 `passwordToggle` 开启时显示
- 闭眼表示密文（`secureTextEntry=true`），睁眼表示明文（`secureTextEntry=false`）
- 图标位于输入框右侧并垂直居中

```tsx
<AppInput placeholder="请输入密码" secureTextEntry passwordToggle />
```

可自定义两种状态图标：

```tsx
<AppInput
  placeholder="请输入密码"
  secureTextEntry
  passwordToggle
  passwordToggleIcons={{
    hidden: <Icon name="visibility-off" size={20} color="gray-500" />,
    visible: <Icon name="visibility" size={20} color="gray-500" />,
  }}
  onPasswordVisibleChange={visible => {
    console.log('password visible:', visible);
  }}
/>
```

新增属性：

- `passwordToggle?: boolean` - 是否启用密码切换，默认 `false`
- `passwordVisibleDefault?: boolean` - 初始是否明文，默认 `false`
- `passwordToggleIcons?: { hidden?: ReactNode; visible?: ReactNode }` - 自定义切换图标
- `onPasswordVisibleChange?: (visible: boolean) => void` - 明文状态变更回调

在 React Native Web 上，`dismissKeyboardOnPressOutside` 会自动忽略
`input` / `textarea` / `contenteditable` 目标及其子节点，避免点击 `AppInput`
后刚获得焦点就被外层容器立即 `Keyboard.dismiss()`。

如果不是整页容器，而是局部自定义布局，也可以单独使用：

```tsx
<KeyboardDismissView>
  <AppView p={4} gap={3}>
    <AppInput placeholder="搜索内容" />
    <AppButton onPress={handleSearch}>搜索</AppButton>
  </AppView>
</KeyboardDismissView>
```

聊天页 / 底部输入栏场景推荐：

```tsx
<AppScreen>
  <AppView flex>{/* message list */}</AppView>

  <KeyboardInsetView px={4} py={3} surface="card">
    <AppInput placeholder="输入消息..." />
  </KeyboardInsetView>
</AppScreen>
```

`KeyboardInsetView` 支持：

- `enabled`
- `bottomSafeArea`
- `keyboardOffset`

适合：

- 聊天输入框
- 评论输入框
- 底部回复栏
- 固定在页面底部的表单操作区

列表场景则推荐：

```tsx
<AppFlatList
  data={users}
  renderItem={renderUser}
  keyExtractor={item => item.id}
  flex
  px={4}
  py={3}
  gap={3}
  dismissKeyboardOnPressOutside
/>
```

#### `AppScreen` 与 `SafeScreen` 的使用建议

推荐按语义区分：

```tsx
// 1) 常规业务页面：顶部由 AppHeader 负责安全区
<AppScreen>
  <AppHeader title="设置" />
  <AppView flex>{/* page content */}</AppView>
</AppScreen>

// 2) 无 Header 的全屏页面：直接使用 SafeScreen
<SafeScreen>
  <AppView flex>{/* full screen content */}</AppView>
</SafeScreen>

// 3) 即使使用 AppScreen，也仍然可以显式覆盖
<AppScreen top bottom={false}>
  <AppView flex>{/* custom layout */}</AppView>
</AppScreen>
```

#### `AppPressable` 状态样式建议

`AppPressable` 同时支持两类写法：

- 静态 `style={{ ... }}`
- 原生 `Pressable` 风格的 `style(state) => ({ ... })`

例如静态样式：

```tsx
<AppPressable p={12} rounded="lg" style={{ backgroundColor: '#6366f1', opacity: 0.9 }} />
```

以及状态样式：

```tsx
<AppPressable
  p={12}
  rounded="lg"
  bg="primary-500"
  style={({ pressed, hovered, focused }) => ({
    opacity: pressed ? 0.7 : 1,
    borderWidth: focused ? 2 : 0,
    borderColor: hovered ? '#f38b32' : 'transparent',
  })}
/>
```

适合：

- 业务侧自定义静态背景色 / 阴影 / 圆角
- 按下态透明度
- Web/TV 场景的 `hovered` / `focused`
- 与 `pressedClassName` 同时配合使用

#### 可本地化文案参数（i18n 推荐）

- `AppList`
  - 面向带空态 / 错误态 / 下拉刷新 / 上拉加载等“增强列表”场景
  - 如果只需要原生 `FlatList` + 统一布局/主题能力，优先使用 `AppFlatList`
  - `errorTitle`：错误标题（默认 `加载失败`）
  - `errorDescription`：错误描述兜底（默认 `请检查网络后重试`）
  - `retryText`：重试按钮文案（默认 `重新加载`）
- `Select`
  - `singleSelectTitle` / `multipleSelectTitle`：弹窗标题
  - `searchPlaceholder`：搜索占位文案
  - `emptyText`：空状态文案
  - `selectedCountText`：多选计数模板，支持 `{{count}}`
  - `confirmText`：多选确认按钮文案
- `Picker`
  - `pickerTitle` / `cancelText` / `confirmText`：弹窗文案
  - `renderDisplayText`：自定义触发区展示文本
  - `renderFooter`：自定义底部区域，适合扩展省市区、级联选择等场景
- `DatePicker`
  - `cancelText` / `confirmText`：弹窗操作按钮文案
  - `pickerTitle`：弹窗标题文案
  - `yearLabel` / `monthLabel` / `dayLabel`：列标题文案
  - `todayText` / `minDateText` / `maxDateText`：快捷按钮文案

#### 图片与骨架屏

`AppImage` 当前基于 `expo-image` 封装，适合统一处理远程图片缓存、占位和错误态：

```tsx
<AppImage
  source={{ uri: user.avatar }}
  width={80}
  height={80}
  borderRadius="full"
  placeholder={require('./avatar-placeholder.png')}
  cachePolicy="memory-disk"
/>
```

尺寸解析优先级：`w/h` > `width/height` > `style.width/height` > 默认值。
当通过 `style` 传入宽高时，组件会自动提取并应用到外层容器：

```tsx
{/* 以下三种写法效果等价 */}
<AppImage source={{ uri }} w={300} h={200} />
<AppImage source={{ uri }} width={300} height={200} />
<AppImage source={{ uri }} style={{ width: 300, height: 200 }} />
```

通用内容骨架推荐直接使用：

```tsx
<AppView p={4} gap={3}>
  <SkeletonAvatar size={48} />
  <SkeletonText lines={3} lineWidths={['100%', '92%', '60%']} />
  <Skeleton h={120} rounded="lg" />
</AppView>
```

`AppList` 和 `AppImage` 内部也已复用统一骨架能力。

#### 表单与反馈 Hook 当前 API

```tsx
import { useForm, useToast, useLoading, useAlert, useLogger } from '@gaozh1024/rn-kit';

const form = useForm({
  schema,
  defaultValues: { name: '' },
});

form.values;
form.errors;
form.setValue('name', 'Panther');
await form.validate();
await form.validateField('name');
await form.handleSubmit(async values => {
  console.log(values);
});

const toast = useToast();
toast.show('已保存', 'success', 2000);
toast.success('成功');

const loading = useLoading();
loading.show('加载中...');
loading.hide();

const alert = useAlert();
alert.alert({ title: '提示', message: '操作完成' });
alert.confirm({ title: '确认删除', message: '删除后不可恢复' });

const logger = useLogger('auth');
logger.info('开始登录', { page: 'Login' });
logger.error('登录失败', { code: 401 });
```

说明：

- `useForm` 使用 `defaultValues`，不是 `initialValues`
- `useForm` 提供 `setValue` / `handleSubmit`，不是 `setFieldValue` / `submit`
- `useToast` 当前签名为 `show(message, type?, duration?)`
- `useLoading` 当前签名为 `show(text?)` / `hide()`
- `useAlert` 当前提供 `alert()` / `confirm()`，不包含 `prompt()` / `custom()`
- `useLogger(namespace?)` 提供 `debug / info / warn / error / clear / entries`

#### 开发日志 / 可观测性基础设施

框架现在内置了一套**开发态可观测性基础设施**，同时提供可接生产监控的 `createTelemetryClient` 抽象。默认不会绑定任何监控厂商，也不会在没有 transport 时产生副作用。

默认能力：

- `useLogger(namespace?)`：组件内打点
- 内存日志缓冲：保留最近若干条日志
- Console Transport：CLI 中按 level 彩色输出
- `LogOverlay`：App 内浮动日志面板
- 浮层增强：level 筛选 / namespace 筛选 / 导出当前日志 / 按钮可拖动吸边并按当前 storage 实现恢复位置

生产可观测抽象：

- `createTelemetryClient({ transports })`：把事件发送到业务自己的监控服务
- 默认 noop：没有 transport 或 `enabled: false` 时不会发送任何事件
- 支持 `sanitize`：发送前可统一脱敏 token、手机号、用户资料等敏感字段
- transport 隔离：单个 transport 抛错不会影响业务流程或 API 请求结果

##### 1. 最简单用法：直接跟随 `AppProvider`

```tsx
import { AppProvider, useLogger, AppButton } from '@gaozh1024/rn-kit';

function LoginButton() {
  const logger = useLogger('login');

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

export default function App() {
  return (
    <AppProvider>
      <LoginButton />
    </AppProvider>
  );
}
```

说明：

- `AppProvider` 在开发环境下默认 `enableLogger = true`
- 生产环境默认关闭
- 开启后会同时启用 console 输出和 App 内日志浮层

##### 2. 显式控制是否启用

```tsx
<AppProvider
  enableLogger
  enableErrorBoundary
  loggerProps={{
    level: 'info',
    maxEntries: 300,
    consoleEnabled: true,
    defaultExpanded: false,
  }}
>
  <App />
</AppProvider>
```

常用 `loggerProps`：

- `enabled`
- `level`: `'debug' | 'info' | 'warn' | 'error'`
- `maxEntries`
- `consoleEnabled`
- `overlayEnabled`
- `defaultExpanded`
- `overlayPositionStorageKey`
- `exportEnabled`
- `onExport`

Web 与 Native 的日志浮动按钮都支持拖动、释放后自动吸附左右边缘，并通过
`overlayPositionStorageKey` 复用同一套位置持久化逻辑。拖动结束不会误触发
展开 / 收起；单击按钮仍会正常切换日志面板。

`onExport` 会收到：

```tsx
{
  entries: LogEntry[];
  serialized: string;
}
```

错误边界相关：

- `enableErrorBoundary`：是否启用 React 错误边界
- `errorBoundaryProps.title`：兜底标题
- `errorBoundaryProps.description`：兜底说明
- `errorBoundaryProps.showDetails`：是否显示错误详情
- `errorBoundaryProps.resetText`：重试按钮文案

当错误边界与 logger 同时开启时，组件渲染异常会自动写入 `react` 命名空间日志，便于在控制台和 `LogOverlay` 中回看。

##### 3. 接入生产错误监控 healthReporter

`rn-kit` 不直接依赖任何监控厂商，也不强依赖 `@gaozh1024/rn-observatory`。如果 App 需要线上错误监控，可以把实现了 `AppHealthReporter` 协议的对象传给 `AppProvider`：

```tsx
import { AppProvider } from '@gaozh1024/rn-kit';
import { AppObservatoryProvider } from '@gaozh1024/rn-observatory';

export default function App() {
  return (
    <AppObservatoryProvider endpoint="https://collector.example.com/api/app-observatory/events">
      {health => (
        <AppProvider enableErrorBoundary enableLogger healthReporter={health}>
          <RootNavigator />
        </AppProvider>
      )}
    </AppObservatoryProvider>
  );
}
```

接入后：

- `AppErrorBoundary` 捕获 React 渲染异常时会调用 `healthReporter.captureException`
- `LoggerProvider` 写入日志时会调用 `healthReporter.addBreadcrumb`
- 未传 `healthReporter` 时行为保持不变
- `rn-kit` 只负责桥接，不负责队列、上传、脱敏或 Native crash 捕获

##### 4. 单独使用 `OverlayProvider` / `LoggerProvider`

如果你不是通过 `AppProvider` 接入，而是自己手动包 Provider，需要注意：

- `LoggerProvider` 默认 `enabled = false`
- `OverlayProvider` 里传入的 logger 也默认不主动开启

所以需要显式打开：

```tsx
import { OverlayProvider } from '@gaozh1024/rn-kit';

<OverlayProvider
  loggerProps={{
    enabled: true,
    overlayEnabled: true,
    consoleEnabled: true,
  }}
>
  <App />
</OverlayProvider>;
```

或者：

```tsx
import { AppErrorBoundary, LoggerProvider } from '@gaozh1024/rn-kit';

<LoggerProvider enabled overlayEnabled consoleEnabled>
  <AppErrorBoundary enabled showDetails>
    <App />
  </AppErrorBoundary>
</LoggerProvider>;
```

##### 5. 生产 telemetry transport

如果要接入线上监控，请优先使用 `createTelemetryClient` 包一层业务 transport，而不是在组件里直接调用厂商 SDK。下面示例只演示接口形态，不绑定具体服务：

```tsx
import { createTelemetryClient } from '@gaozh1024/rn-kit';

const telemetry = createTelemetryClient({
  transports: [
    async event => {
      await fetch('https://collector.example.com/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event),
      });
    },
  ],
});

await telemetry.emit(
  {
    name: 'login.submit',
    category: 'auth',
    attributes: { userId: 'u_1', token: 'secret' },
  },
  {
    sanitize: event => ({
      ...event,
      attributes: { ...event.attributes, token: '[REDACTED]' },
    }),
  }
);
```

注意：`createTelemetryClient` 会吞掉 transport 异常并可写入 logger warning，因此监控服务短暂不可用不会阻断用户操作。

### 🪝 Hooks

```tsx
import {
  // UI Hooks
  useToggle,
  usePageDrawer,
  useDebounce,
  useThrottle,
  useKeyboard,
  useDimensions,
  useOrientation,
  // Core Hooks
  useAsyncState,
  useRequest,
  usePagination,
  useRefresh,
  useInfinite,
  useStorage,
} from '@gaozh1024/rn-kit';
```

### 🎞 Motion / 动画

框架当前动画底层已统一迁移到 **react-native-reanimated**，并继续通过 `motion/animated` adapter 收口 runtime。

当前 driver 固定为 `reanimated`，可直接读取 runtime 能力信息：

```tsx
import {
  getMotionAnimatedCapabilities,
  getMotionAnimatedDriver,
  getMotionScenarioRecommendation,
  shouldPreferReanimatedForScenario,
  supportsMotionCapability,
} from '@gaozh1024/rn-kit';

const driver = getMotionAnimatedDriver(); // 'reanimated'
const capabilities = getMotionAnimatedCapabilities();
const supportsSharedValues = supportsMotionCapability('sharedValues'); // true
const recommendation = getMotionScenarioRecommendation('sheet-drawer');
const preferReanimated = shouldPreferReanimatedForScenario('complex-gesture'); // true
```

当前 capability 结论：

- 基础 timing / sequence / parallel / event：支持
- `useNativeDriver` 兼容层：支持
- shared values / worklets / layout transitions：支持
- 复杂手势、滚动联动、抽屉 / sheet、可折叠 header 已统一跑在 reanimated 上

当前场景建议可简单理解为：

- 推荐直接使用当前 driver：
  - `press-feedback`
  - `presence-transition`
  - `progress-feedback`
  - `toggle-control`
  - `sheet-drawer`
  - `stagger-list`
  - `collapsible-header`
  - `complex-gesture`
- 当前 runtime 已支持，但是否采用还取决于上层方案：
  - `shared-element`
  - `layout-transition`

可以直接使用的 motion 能力：

```tsx
import {
  // motion hooks
  useReducedMotion,
  usePresenceMotion,
  usePressMotion,
  useToggleMotion,
  useProgressMotion,
  useSheetMotion,
  useStaggerMotion,
  useCollapsibleHeaderMotion,
  // motion components
  MotionView,
  MotionPressable,
  Presence,
  StaggerItem,
  CollapseView,
} from '@gaozh1024/rn-kit';
```

#### 1. 按压动画

以下组件已经内置按压动效，常用按压参数统一为：

- `motionPreset`
- `motionDuration`
- `motionReduceMotion`

默认策略：

- `AppPressable` 默认 `motionPreset="none"`，更适合做基础可点击容器；该默认路径使用原生 `Pressable`，不会初始化 `usePressMotion` / Reanimated shared value
- `MotionPressable` 默认 `motionPreset="soft"`
- `AppButton` / `Card` / `Select` / `Picker` / `DatePicker` / `PageDrawer` 等语义组件默认按压反馈为 `soft`

- `AppPressable`
- `MotionPressable`
- `AppButton`
- `Card`
- `Select`
- `Picker`
- `DatePicker`
- `AppHeader`
- `BottomTabBar`
- `DrawerContent`
- `PageDrawer`

```tsx
<AppButton>保存</AppButton>
<AppButton motionDuration={180}>保存</AppButton>
<AppPressable onPress={goNext}>基础跳转项</AppPressable> // 默认轻量 Pressable 路径
<AppPressable motionPreset="soft" onPress={submit}>需要按压反馈的操作</AppPressable>
<Card onPress={() => {}} motionPreset="strong" />
<Card variant="flat" motionPreset="none" onPress={goDetail}>长列表商品卡片</Card>
```

可选值：

- `'soft'`
- `'strong'`
- `'none'`

也可以通过全局 Provider 统一控制：

```tsx
import { AppProvider, MotionConfigProvider } from '@gaozh1024/rn-kit';

<MotionConfigProvider defaultPressPreset="strong" durationScale={0.9}>
  <App />
</MotionConfigProvider>;

<AppProvider
  motion={{
    reduceMotion: false,
    durationScale: 0.9,
    defaultPressPreset: 'soft',
    defaultPresencePreset: 'fadeUp',
  }}
>
  <App />
</AppProvider>;
```

可用于：

- 全局降低 / 关闭动画
- 统一默认按压反馈强度
- 统一默认显隐预设

#### 2. 显隐动画

适合弹层、提示、局部块出现/消失：

```tsx
import { Presence } from '@gaozh1024/rn-kit';

<Presence visible={visible} preset="fadeUp">
  <AppView>
    <AppText>内容出现</AppText>
  </AppView>
</Presence>;

<MotionView
  visible={visible}
  preset="fadeUp"
  motionDuration={260}
  motionDistance={24}
  motionReduceMotion={false}
/>;
```

常用 `preset`：

- `fade`
- `fadeUp`
- `fadeDown`
- `scale`
- `scaleFade`
- `slideUp`
- `slideDown`
- `slideLeft`
- `slideRight`
- `dialog`
- `toast`
- `sheet`

`Presence` / `MotionView` 额外支持：

- `motionPreset`（与 `preset` 并存，优先级更高）
- `motionDuration`
- `motionEnterDuration`
- `motionExitDuration`
- `motionDistance`
- `motionReduceMotion`

Web 端说明：

- `Presence` / `MotionView` / `StaggerItem` 在 Web 上使用 CSS-backed presence transition，不依赖 Reanimated Web shared value 推进到 `opacity: 1`，因此 `visible={true}` 的内容不会因为动画驱动未运行而停留在透明状态。
- 初始 `visible={true}` 会直接以最终可见样式渲染；后续 `false -> true` / `true -> false` 切换仍按 opacity / transform / duration 做浏览器原生过渡。
- 如果导航已经负责 screen mount/unmount，持久 screen 内容通常不需要再用 `Presence visible={useIsFocused()}` 包一层；如果业务确实这么做，Web 端现在也会按最终可见状态收敛。

#### 3. 列表错峰动画

```tsx
<AppList data={data} stagger staggerMs={50} renderItem={({ item }) => <Card>{item.title}</Card>} />
```

列表动画参数语义：

- `motionReduceMotion`：关闭普通列表项 entering / exiting / layout 动画
- `staggerReduceMotion`：仅关闭 `stagger` 模式下的错峰入场动画

导航抽屉也支持：

```tsx
<DrawerContent {...props} staggerItems />
```

#### 4. Sheet / Drawer 动画

`BottomSheetModal` 与 `PageDrawer` 已统一接入内部 motion：

- 遮罩淡入淡出
- 面板进出场
- 手势关闭
- 支持组件级 motion 参数覆盖

```tsx
<PageDrawer
  visible={visible}
  onClose={close}
  placement="right"
  motionPreset="soft"
  motionOverlayOpacity={0.72}
  motionVelocityThreshold={1.4}
/>

<BottomSheetModal
  visible={visible}
  onRequestClose={close}
  overlayColor="rgba(0,0,0,0.5)"
  surfaceColor="#fff"
  motionDuration={240}
  motionOpenDuration={320}
  motionCloseDuration={180}
  motionDistance={320}
  motionOverlayOpacity={0.72}
  motionSwipeThreshold={96}
/>
```

`BottomSheetModal` 可选：

- `motionDuration`
- `motionOpenDuration`
- `motionCloseDuration`
- `motionDistance`
- `motionOverlayOpacity`
- `motionSwipeThreshold`
- `motionVelocityThreshold`
- `motionReduceMotion`

`PageDrawer` 也支持：

- `motionPreset`
- `motionDuration`
- `motionOpenDuration`
- `motionCloseDuration`
- `motionReduceMotion`
- `motionDistance`
- `motionOverlayOpacity`
- `motionSwipeThreshold`（兼容旧的 `swipeThreshold`）
- `motionVelocityThreshold`

`Select` / `Picker` / `DatePicker` 也支持同一组 sheet 动画参数：

- 按压：`motionPreset` / `motionDuration` / `motionReduceMotion`
- `motionOpenDuration`
- `motionCloseDuration`
- `motionDistance`
- `motionOverlayOpacity`
- `motionSwipeThreshold`
- `motionVelocityThreshold`
- `motionReduceMotion`

#### 4.1 真实高度折叠 / 展开

如果你需要“高度从 `0` 平滑展开到内容实际高度”的效果，优先使用 `CollapseView`。

```tsx
<CollapseView visible={open} motionDuration={280} motionSpringPreset="smooth" unmountOnExit={false}>
  <AppView pt={15} pb={15}>
    {/* content */}
  </AppView>
</CollapseView>
```

可选参数：

- `motionDuration`
- `motionSpringPreset`
- `motionReduceMotion`
- `collapsedHeight`
- `unmountOnExit`

说明：

- `CollapseView` 用于真实高度折叠动画
- `motionLayoutPreset="accordion"` 仍然是布局/拉伸类预设，不等价于精确 height 补间

#### 5. 可折叠 Header

```tsx
import { Animated, AppHeader, useCollapsibleHeaderMotion } from '@gaozh1024/rn-kit';

const headerMotion = useCollapsibleHeaderMotion({
  minHeight: 44,
  maxHeight: 88,
});

<>
  <AppHeader title="首页" collapsibleMotion={headerMotion} />

  <Animated.ScrollView onScroll={headerMotion.onScroll} scrollEventThrottle={16}>
    {/* content */}
  </Animated.ScrollView>
</>;
```

也可以单独覆盖标题和图标颜色：

```tsx
<AppHeader
  title="详情"
  titleColor="#ffffff"
  leftIconColor="#ffffff"
  rightIconColor="#ffd700"
  style={{ backgroundColor: '#111827' }}
/>
```

如果你需要把标题区域替换成自定义组件，可以直接传 `titleNode`：

```tsx
<AppHeader
  leftIcon="arrow-back"
  titleNode={
    <AppView row items="center" gap={2}>
      <Icon name="sparkles" size={18} color="#f59e0b" />
      <AppText weight="semibold">自定义标题</AppText>
    </AppView>
  }
/>
```

说明：

- 传入 `titleNode` 时，会直接替换默认的 `title` / `subtitle` 文本区域
- 不传 `titleNode` 时，仍保持原来的 `title` / `subtitle` 行为
- `collapsibleMotion.titleStyle` 仍会作用在标题包裹层上

#### 6. 高级布局动画预设

`Presence` / `MotionView` / `StaggerItem` / `AppList` 现在支持更高层的布局动画封装：

- `motionLayoutPreset`
- `motionLayoutDuration`
- `motionLayoutDelay`
- `motionLayoutSpring`

可选预设：

- `fade`
- `fade-up`
- `fade-down`
- `slide-left`
- `slide-right`
- `zoom-fade`
- `list-item`
- `list-reorder`
- `accordion`
- `dialog`

```tsx
<Presence
  visible={visible}
  motionLayoutPreset="dialog"
  motionLayoutDuration={280}
  motionLayoutSpring="smooth"
>
  <AppView>{/* content */}</AppView>
</Presence>

<AppList
  data={data}
  motionLayoutPreset="list-item"
  motionLayoutDuration={260}
  motionLayoutDelay={30}
  motionLayoutSpring="snappy"
  renderItem={({ item }) => <Card>{item.title}</Card>}
/>
```

如果同时传入 `motionEntering` / `motionExiting` / `motionLayout`，则显式传入值优先。

> Web 端兼容性：显隐类 presence 动画（`Presence` / `MotionView` / `StaggerItem`）使用 CSS transition 适配；`motionEntering` / `motionExiting` / `motionLayout` 这类 Reanimated layout animation 对象只在原生端透传，Web 端会在框架内部丢弃，避免把 Reanimated-only 对象传给 React Native Web host 组件。

#### 7. Spring 动画配置

`Progress` / `Switch` / `Checkbox` / `Radio` / `SegmentedTabs` 现在支持：

- `motionSpringPreset`

可选值：

- `snappy`
- `smooth`
- `bouncy`

```tsx
<Progress value={72} motionSpringPreset="smooth" />
<Switch checked={enabled} onChange={setEnabled} motionSpringPreset="bouncy" />
<Checkbox checked motionSpringPreset="smooth" />
<SegmentedTabs options={tabs} value={tab} onChange={nextTab => setTab(nextTab)} motionSpringPreset="snappy" />
```

未传 `motionSpringPreset` 时，仍默认使用 timing 动画。

#### 8. 当前已接入动画的组件范围

- 反馈：`Alert` / `Toast` / overlay alert / overlay toast
- 表单：`Switch` / `Checkbox` / `Radio` / `Select` / `Picker` / `DatePicker`
- 展示：`Progress` / `Card` / `AppList` / `PageDrawer` / `AppButton` / `SegmentedTabs`
- 导航：`AppHeader` / `BottomTabBar` / `DrawerContent`

其中 `Alert` / `Toast` 以及 overlay alert 也支持组件级显隐动画控制：

- `motionPreset`
- `motionDuration`
- `motionEnterDuration`
- `motionExitDuration`
- `motionDistance`
- `motionReduceMotion`

`Presence` / `MotionView` / `StaggerItem` 额外支持基于 reanimated 的布局级动画透传（原生端生效；Web 端显隐动画走 CSS transition，布局动画对象会被安全丢弃）：

- `motionEntering`
- `motionExiting`
- `motionLayout`
- `motionLayoutPreset`
- `motionLayoutDuration`
- `motionLayoutDelay`
- `motionLayoutSpring`

`Progress` 也支持：

- `animated={false}`：使用普通 `AppView` 渲染进度条，不初始化 `useProgressMotion`
- `motionDuration`
- `motionSpringPreset`
- `motionReduceMotion`

`Switch` / `Checkbox` / `Radio` 也支持：

- `animated={false}`：使用普通视图更新状态，不初始化 `useToggleMotion`
- `motionDuration`
- `motionSpringPreset`
- `motionReduceMotion`：显式关闭状态切换动画，并走普通视图路径

`AppButton` / `Card` / `Select` / `Picker` / `DatePicker` / `PageDrawer` 也统一支持：

- `motionPreset`
- `motionDuration`
- `motionReduceMotion`

`SegmentedTabs` 也支持 `animated={false}` / `motionReduceMotion`。这两种场景下，选中滑块会直接使用静态 `width + translateX` 样式定位，不初始化动画分支；默认 `animated` 仍保持滑动体验（Native 走 timing/spring，Web 走 CSS transition）。

`AppList` 错峰 / 列表项动画还支持：

- `staggerPreset`
- `staggerMs`
- `staggerBaseDelayMs`
- `staggerDuration`
- `staggerDistance`
- `staggerReduceMotion`
- `motionEntering`
- `motionExiting`
- `motionLayout`

导航组件的动画参数也已统一：

- `AppHeader`
  - `motionPreset`
  - `motionDuration`
  - `motionReduceMotion`
  - 支持通过 `style.backgroundColor` 直接覆盖 header 背景色
- `BottomTabBar`
  - 按压：`motionPreset` / `motionDuration` / `motionReduceMotion`
  - 指示器：`indicatorMotionPreset` / `indicatorMotionDuration` / `indicatorMotionEnterDuration` / `indicatorMotionExitDuration` / `indicatorMotionDistance` / `indicatorMotionReduceMotion`
- `DrawerContent`
  - 按压：`motionPreset` / `motionDuration` / `motionReduceMotion`
  - 指示条：`indicatorMotionPreset` / `indicatorMotionDuration` / `indicatorMotionEnterDuration` / `indicatorMotionExitDuration` / `indicatorMotionDistance` / `indicatorMotionReduceMotion`
  - 错峰：`staggerPreset` / `staggerMs` / `staggerBaseDelayMs` / `staggerDuration` / `staggerDistance` / `staggerReduceMotion`

#### 9. 可复用的动画类型

可直接从包中导入：

```tsx
import type {
  PressMotionProps,
  PresenceMotionProps,
  SheetMotionProps,
  ProgressMotionProps,
  ToggleMotionProps,
  StaggerMotionProps,
  MotionSharedValue,
  MotionAnimatedViewStyle,
  MotionAnimatedTextStyle,
  MotionAnimatedScrollHandler,
} from '@gaozh1024/rn-kit';
```

运行时 helper / hooks 也可直接复用：

```tsx
import { useEffect } from 'react';
import {
  resolveMotionLayoutPreset,
  Animated,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from '@gaozh1024/rn-kit';

const layoutPreset = resolveMotionLayoutPreset({
  preset: 'dialog',
  duration: 280,
  spring: 'smooth',
});

function PulseDot() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return <Animated.View style={animatedStyle} />;
}
```

如需自定义循环动画、shared value 或滚动联动，推荐统一从框架导出的 motion adapter 获取：

- `Animated`（框架导出的 reanimated adapter alias，不是 RN 原生 `Animated`）
- `useSharedValue`
- `useAnimatedStyle`
- `useAnimatedScrollHandler`
- `useDerivedValue`
- `useAnimatedReaction`
- `withTiming`
- `withSpring`
- `withDelay`
- `withSequence`
- `withRepeat`

#### 10. Reanimated 迁移状态

当前框架 motion runtime 已完成统一迁移：

1. motion hooks 默认返回 reanimated shared value / animated style
2. `Pressable` / `Progress` / `Sheet` / `Drawer` / `Alert` / `Toast` / `Header` 等组件已接入 reanimated
3. 高级布局动画预设与 spring 动画已在常见组件层完成封装
4. 复杂手势、滚动联动和后续布局动画扩展都以 reanimated 为基础继续演进

### 🧭 导航

```tsx
import {
  NavigationProvider,
  StackNavigator,
  TabNavigator,
  BottomTabBar,
  DrawerNavigator,
  useNavigation,
  useRoute,
} from '@gaozh1024/rn-kit';
```

`TabNavigator` 在未显式传入 `tabBar` 时，会默认使用框架内置的 `BottomTabBar`（默认高度 `65`）。

> 默认情况下，框架已关闭底部导航“选中横条”指示器；如需开启，可通过 `tabBarOptions.showActiveIndicator` 或自定义 `BottomTabBar` 打开。

`StackNavigator` 默认使用 `slide_from_right` 动画；如果单个页面需要淡入等不同转场，可以直接在 `StackNavigator.Screen` 上覆盖：

```tsx
<StackNavigator.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
```

```tsx
<TabNavigator
  tabBarOptions={{
    activeTintColor: '#f38b32',
    inactiveTintColor: '#9ca3af',
    height: 72,
    showActiveIndicator: true,
    indicatorColor: '#f38b32',
    indicatorHeight: 3,
    style: { borderTopWidth: 0 },
  }}
>
  {/* screens */}
</TabNavigator>
```

如果你需要完全自定义底栏，也可以手动覆盖：

```tsx
<TabNavigator tabBar={props => <BottomTabBar {...props} height={72} />}>
  {/* screens */}
</TabNavigator>
```

### 🧲 抽屉

框架同时提供两类抽屉能力：

- **导航级抽屉**：`DrawerNavigator` / `DrawerContent`
- **页面级抽屉**：`PageDrawer`

#### 1. 页面级抽屉

适合当前页面内的筛选面板、操作栏、详情侧栏。

```tsx
import React from 'react';
import { AppButton, AppText, AppView, PageDrawer } from '@gaozh1024/rn-kit';

function FilterPanel() {
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <AppButton onPress={() => setVisible(true)}>打开筛选</AppButton>

      <PageDrawer
        visible={visible}
        onClose={() => setVisible(false)}
        title="筛选条件"
        placement="right"
        width={320}
      >
        <AppView gap={3}>
          <AppText>这里放筛选项</AppText>
        </AppView>
      </PageDrawer>
    </>
  );
}
```

`PageDrawer` 支持：

- 左 / 右侧抽屉
- 点击遮罩关闭
- 自定义 `header` / `footer`
- 手势滑动关闭
- Android 返回键优先关闭抽屉

常用参数：

- `placement`: `'left' | 'right'`
- `width`: 抽屉宽度，默认 `320`
- `swipeEnabled`: 是否启用手势关闭，默认 `true`
- `swipeThreshold`: 触发关闭阈值，默认 `80`
- `closeOnBackdropPress`: 点击遮罩关闭，默认 `true`

### 🌈 渐变背景

框架提供 `GradientView` 作为渐变背景容器，底层封装 `expo-linear-gradient`。

```tsx
import { GradientView, AppText } from '@gaozh1024/rn-kit';

<GradientView colors={['#f38b32', '#fb923c']} style={{ padding: 24, borderRadius: 16 }}>
  <AppText color="white" weight="bold">
    渐变卡片
  </AppText>
</GradientView>;
```

TypeScript 下如果你把颜色数组先提到变量里，建议写成 tuple：

```tsx
const heroColors = ['#f38b32', '#fb923c'] as const;

<GradientView colors={heroColors} />;
```

如果你的应用是手动集成 `@gaozh1024/rn-kit`，请同时安装：

```bash
npx expo install expo-linear-gradient
```

如果你不想在页面里重复写 `useState(false)`，也可以直接使用：

```tsx
import { AppButton, PageDrawer, usePageDrawer } from '@gaozh1024/rn-kit';

const drawer = usePageDrawer();

<AppButton onPress={drawer.open}>打开</AppButton>;
<PageDrawer visible={drawer.visible} onClose={drawer.close} />;
```

#### 2. 导航级抽屉

适合整个导航结构都交给抽屉接管的场景：

> 默认情况下，框架已关闭 `DrawerContent` 当前项指示条；如需开启，可显式传入 `showActiveIndicator`。

```tsx
import { DrawerContent, DrawerNavigator } from '@gaozh1024/rn-kit';

<DrawerNavigator
  drawerContent={props => (
    <DrawerContent
      {...props}
      showActiveIndicator
      items={[
        { name: 'Home', label: '首页', icon: 'home' },
        { name: 'Settings', label: '设置', icon: 'settings' },
      ]}
    />
  )}
>
  {/* screens */}
</DrawerNavigator>;
```

### 🔌 API 工厂

```tsx
import {
  createAPI,
  createApiLoggerTransport,
  createTelemetryClient,
  storage,
  ErrorCode,
} from '@gaozh1024/rn-kit';
import { z } from 'zod';

const api = createAPI({
  baseURL: 'https://api.example.com',
  getHeaders: async () => {
    const token = await storage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  },
  endpoints: {
    getUser: {
      method: 'GET',
      path: '/users/{id}',
      input: z.object({
        id: z.string(),
        include: z.string().optional(),
      }),
    },
    revokeDevice: {
      method: 'POST',
      path: '/devices/{device_id}/revoke',
      input: z.object({
        device_id: z.string(),
      }),
    },
  },
});
```

默认行为：

- 支持 `{id}` 和 `:id` 两种路径参数写法
- 如果路径参数缺失，调用会在发请求前直接抛出 `VALIDATION` 错误
- `GET`：路径参数会替换到 URL，剩余字段自动拼到 query，不发送 body
- `POST` / `PUT` / `PATCH` / `DELETE`：会发送完整 body
- 普通对象 body 默认使用 `application/json`
- 如果用户显式传入 `Content-Type`，以用户传入的为准
- `headers` 与 `getHeaders()` 会自动合并，后者优先级更高
- `getHeaders()` / `endpoint.getHeaders()` / 请求体序列化阶段如果抛错，也会统一进入 `onError` 与 `observability.error`

例如：

```tsx
await api.getUser({
  id: 'u_1',
  include: 'profile',
});
// => GET https://api.example.com/users/u_1?include=profile

await api.revokeDevice({
  device_id: 'dev_1',
});
// => POST https://api.example.com/devices/dev_1/revoke
// => body: {"device_id":"dev_1"}
```

#### Storage 注入：项目启动时切换为持久化存储

框架默认导出的 `storage` 是内存实现，适合测试和无持久化场景。

如果项目希望统一改成持久化存储，推荐在启动阶段注入。

推荐放到独立启动文件中，例如：

```tsx
// src/bootstrap/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStorageAdapter } from '@gaozh1024/rn-kit';

setStorageAdapter({
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
});
```

然后在应用入口最早执行：

```tsx
// App.tsx
import './src/bootstrap/storage';
```

如果你只想快速演示，也可以直接在启动代码里写：

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStorageAdapter } from '@gaozh1024/rn-kit';

setStorageAdapter({
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
});
```

注入后，框架内所有基于 `storage` 的能力都会自动走你提供的实现，例如：

- `createAPI` 中的 token 读取
- `useStorage`
- logger 按钮位置持久化
- 你自己的 `session` / 缓存 / 草稿等业务存储

业务代码仍然保持：

```tsx
import { storage } from '@gaozh1024/rn-kit';

await storage.setItem('token', 'abc123');
const token = await storage.getItem('token');
```

#### API 自动打点（request / response / error）

`createAPI` 已支持开发态自动打点。

默认行为：

- 开发环境下 `observability.enabled` 默认开启
- 如果当前 App 已通过 `AppProvider` / `LoggerProvider` 启用了 logger
- 那么 API 请求会自动写入 `api` 命名空间日志

记录阶段：

- request
- response
- error

```tsx
const api = createAPI({
  baseURL: 'https://api.example.com',
  observability: {
    enabled: true,
    includeInput: true,
    includeResponseData: false,
  },
  endpoints: {
    getProfile: {
      method: 'GET',
      path: '/profile',
    },
  },
});
```

也可以添加自定义 transport：

```tsx
const api = createAPI({
  baseURL: 'https://api.example.com',
  observability: {
    enabled: true,
    transports: [
      event => {
        console.log('api event', event.stage, event.endpointName);
      },
    ],
  },
  endpoints: {
    getProfile: {
      method: 'GET',
      path: '/profile',
    },
  },
});
```

生产环境建议同时配置 `sanitize`，自定义 transport 收到的是脱敏后的事件；transport 抛错也不会影响 API 请求结果：

```tsx
const api = createAPI({
  baseURL: 'https://api.example.com',
  observability: {
    enabled: true,
    transports: [event => sendToCollector(event)],
    sanitize: (value, meta) => {
      if (meta.field === 'input') return '[REDACTED_INPUT]';
      if (meta.field === 'responseData') return '[REDACTED_RESPONSE]';
      return value;
    },
  },
  endpoints: {
    getProfile: { method: 'GET', path: '/profile' },
  },
});
```

如果你想手动指定写到某个 logger，也可以：

```tsx
const transport = createApiLoggerTransport({
  namespace: 'network',
  includeInput: true,
  includeResponseData: true,
});

const api = createAPI({
  baseURL: 'https://api.example.com',
  observability: {
    enabled: true,
    transports: [transport],
  },
  endpoints: {
    getProfile: {
      method: 'GET',
      path: '/profile',
    },
  },
});
```

## 📄 文档

- [框架文档](../../docs/README.md) - 完整文档索引

## 🤖 AI 初始化

如果你希望安装完成后，让 AI 助手在业务项目根目录直接看到 Panther 的接入规则，可以执行：

```bash
npx @gaozh1024/rn-kit init-ai
```

默认会同步：

- `AGENTS.md`
- `.github/copilot-instructions.md`

如果你还希望生成 Cursor 规则文件：

```bash
npx @gaozh1024/rn-kit init-ai --include cursor
```

可用参数：

```bash
npx @gaozh1024/rn-kit init-ai --target ./my-app
npx @gaozh1024/rn-kit init-ai --check
npx @gaozh1024/rn-kit init-ai --dry-run
```

行为说明：

- 该命令是**幂等**的，可以重复执行
- 如果目标文件不存在，会自动创建
- 如果目标文件已存在，会只更新 `<!-- panther:init-ai:start -->` 到 `<!-- panther:init-ai:end -->` 之间的受管区块
- 不会无限追加相同内容
- 如果 marker 损坏，会报错而不是盲写

这个命令的作用不是接管你的项目文档，而是把 Panther 的关键框架约束同步到消费项目入口，减少 AI 在接入时的误判。

## 📱 状态栏使用说明

### 1. 全局默认行为

推荐：

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

此时框架会自动注入全局 `AppStatusBar`：

- 亮色主题：`dark-content`
- 暗色主题：`light-content`
- 默认 `translucent={false}`
- Android 状态栏背景默认跟随当前主题背景色

### 2. 使用 `AppHeader` 时的默认行为

如果页面使用了 `AppHeader`，通常不需要再单独处理状态栏：

- `AppHeader` 内部会自动注入 `AppFocusedStatusBar`
- 配置为 `translucent + backgroundColor="transparent"`
- 顶部状态栏区域会直接显示 Header 自身背景色

适合：

- 普通详情页
- 设置页
- 使用有色 Header 的二级页面

### 3. 页面级覆盖

如果某个页面需要单独控制状态栏，可以在页面内显式渲染：

```tsx
import { AppFocusedStatusBar } from '@gaozh1024/rn-kit';

<AppFocusedStatusBar barStyle="light-content" backgroundColor="transparent" translucent />;
```

适合：

- 登录页
- 沉浸式详情页
- 顶部大图/渐变背景页

对于导航页面，优先使用 `AppFocusedStatusBar`，这样只有当前聚焦页面会覆盖状态栏配置。

### 4. 登录页全屏背景示例

如果登录页希望顶部状态栏区域也和页面背景保持一致，不要直接使用默认白底容器。

推荐：

```tsx
import { AppFocusedStatusBar, SafeScreen, AppView } from '@gaozh1024/rn-kit';

export function LoginScreen() {
  return (
    <>
      <AppFocusedStatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <SafeScreen bg="primary-500">
        <AppView flex className="bg-primary-500">
          {/* page content */}
        </AppView>
      </SafeScreen>
    </>
  );
}
```

### 5. 沉浸式状态栏示例

```tsx
import { AppFocusedStatusBar, SafeScreen, AppView } from '@gaozh1024/rn-kit';

export function HeroScreen() {
  return (
    <>
      <AppFocusedStatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <SafeScreen top={false} bottom={false}>
        <AppView flex className="bg-black">
          {/* hero content */}
        </AppView>
      </SafeScreen>
    </>
  );
}
```

### 6. 常见问题

#### 为什么顶部还是白色？

通常是以下原因之一：

1. 当前页面没有使用 `AppHeader`，也没有单独覆盖 `AppFocusedStatusBar` / `AppStatusBar`
2. 页面容器本身是白底
3. 使用了 `AppScreen` / `SafeScreen`，但没有设置 `bg`
4. 顶部安全区没有和页面背景统一

如果你用的是：

```tsx
<AppScreen>
```

那它默认不适合登录页这类全屏品牌色场景。请改成：

```tsx
<AppScreen bg="primary-500">
```

或者直接用：

```tsx
<SafeScreen bg="primary-500">
```

## 📄 许可证

MIT
