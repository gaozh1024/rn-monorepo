# @gaozh1024/rn-kit

## 0.6.6

### Patch Changes

- Refresh the package release metadata and generated distribution artifacts for the current rn-kit framework baseline.

## 0.6.5

### Patch Changes

- Fix Native `dismissKeyboardOnPressOutside` focus cancellation by keeping the wrapper-based `TouchableWithoutFeedback` keyboard dismiss behavior Web-only. Native `AppScreen`, `SafeScreen`, and `KeyboardDismissView` now render children without injecting a full-screen responder wrapper, while scroll/list containers keep `keyboardShouldPersistTaps="handled"`.

## 0.6.4

### Patch Changes

- Fix Native `Picker` and `DatePicker` selected-row text being obscured by the opaque selection highlight by rendering the highlight behind the scroll content.

## 0.6.3

### Patch Changes

- Add `AppTextarea` as the semantic rn-kit component for notes, comments, descriptions, and other multiline text entry.
- Add explicit `AppInput textarea` mode with top-aligned multiline defaults, configurable min/max heights, and legacy-safe behavior that does not auto-trigger from `multiline`.
- Reserve AppInput focus border width across focus and blur so focus styling no longer changes layout dimensions.
- Document textarea usage, public API exports, release notes, and AI usage guidance for migrating raw multiline `TextInput` usage back to rn-kit.

## 0.6.2

### Patch Changes

- Expand `AppButton` with design-spec styling hooks: `style`, `contentStyle`, `textStyle`, `pressedStyle`, and `disabledStyle`.
- Add `AppButton` icon/content composition APIs: `leftIcon`, `rightIcon`, `iconGap`, and `renderContent`; non-text children can now render as-is instead of being forced through `AppText`.
- Add `surface` and `soft` button variants for white/card buttons with light elevation and low-emphasis colored actions.
- Add `AppInput` focus styling APIs, visual variants, fixed input sizes, and `soft-login` / `surface` presets for login-form inputs.
- Add theme design tokens for outline/surface/primary-fixed colors, `radii`, `shadows`, and typography presets.
- Add `IconName` typing and snake_case-to-kebab-case icon name compatibility with clearer development warnings.

## 0.6.1

### Patch Changes

- Add bottom tab bar metrics helpers so apps can read the content height, bottom safe-area inset, and total occupied tab bar height from one framework API.
- Refactor `BottomTabBar` so the configured tab height is the content row height and the bottom safe-area inset is rendered as an explicit spacer instead of being folded into the tab content row.
- Ignore `style.height` on `BottomTabBar` in favor of the `height` prop / `tabBarOptions.height`, preventing consumer styles from accidentally overriding safe-area-aware layout.
- Document the canonical tab root screen pattern: when a tab page uses `AppScreen`, pass `bottom={false}` because `BottomTabBar` owns the bottom safe-area inset.

## 0.6.0

### Minor Changes

- Add Expo SDK 55 / React Native 0.83 compatibility while preserving Expo SDK 54 / React Native 0.81 support for existing projects.
- Expand peer dependency ranges for Expo, React Native, Reanimated, and Worklets so host apps can keep SDK-aligned native packages.
- Treat `react-native-svg` as an Expo-managed peer dependency to avoid duplicate native module versions in SDK 55 projects.
- Move the development baseline to Expo SDK 55 package versions and document SDK-specific worklets guidance.
- Refresh AI usage artifacts and compatibility docs for the dual SDK 54/55 support policy.

## 0.5.6

### Patch Changes

- Switch `createApiStreamRequest` to use Expo's `expo/fetch` implementation by default so React Native / Expo streaming can read `response.body.getReader()` without app-level fetch polyfills.
- Keep the `fetcher` option for tests, Web, and app-owned transport customization.
- Update SSE parsing to default missing event names to `message`, support CRLF frame boundaries, and expose an `onMessage(event, data, message)` convenience callback alongside `onEvent`.
- Update streaming documentation and the Expo starter recipe to show the current `expo/fetch` SSE workflow.

## 0.5.5

### Patch Changes

- Add official streaming request foundations for React Native / Expo / Web usage:
  - `createApiStreamRequest`
  - `readApiSSEStream`
  - `useStreamRequest`
- Add typed stream request / SSE message contracts so apps can model raw stream and SSE workflows without inventing their own shapes.
- Add fallback stream behavior when a runtime cannot expose `response.body`, keeping the API surface stable across environments.
- Add streaming documentation and RN / Expo polyfill guidance in `docs/streaming-api.md` and the main README.
- Add streaming tests covering stream request creation, SSE parsing, and hook lifecycle behavior.

## 0.5.4

### Patch Changes

- Fix `SegmentedTabs` Web selected-indicator rendering when `animated=true` by switching the Web indicator path to CSS transition-based animation (`transform + width + opacity`) while keeping Native on Reanimated.
- Add Web animation fallback paths for `Progress`, `Switch`, `Checkbox`, and `Radio` so default animated usage remains visible and smooth on React Native Web without requiring consumers to disable animation manually.
- Expand tests for Web animated branches of `SegmentedTabs`, `Progress`, `Switch`, `Checkbox`, and `Radio`; keep `animated=false` and reduced-motion no-animation semantics unchanged.
- Update README and Web support matrix to document cross-platform animation strategy (Native = Reanimated, Web = CSS transitions where applicable).

## 0.5.3

### Patch Changes

- Add a vendor-neutral `healthReporter` bridge to `AppProvider`, `LoggerProvider`, and `AppErrorBoundary` so apps can connect `@gaozh1024/rn-observatory` or another monitoring SDK without making rn-kit depend on it.
- React render errors now call `healthReporter.captureException`, and logger writes now call `healthReporter.addBreadcrumb` when a reporter is provided.

## 0.5.2

### Patch Changes

- Fix `dismissKeyboardOnPressOutside` on React Native Web so clicks inside `input`, `textarea`, and `contenteditable` targets keep focus instead of immediately blurring the field.
- Bring the Web logger overlay toggle to parity with Native by adding pointer drag, edge snapping, and persisted button position support.

## 0.5.1

### Patch Changes

- Harden `AppInput` Web/mobile parity by moving built-in input layout, padding, radius and font-size styles off NativeWind-only `className` paths; document the Web focus-outline reset and style override guidance.
- Make `Presence`, `MotionView`, `StaggerItem`, Toast and Alert presence surfaces safe on React Native Web by using CSS-backed Web transitions and dropping Reanimated-only layout animation props from Web host components.
- Stabilize overlay and theme context values so toast/loading/alert state changes do not create new hook API object references for consumers.
- Add an `AppPressable` no-motion fast path backed by plain React Native `Pressable`, and add `Card` surface variants for scroll-heavy list/grid screens.
- Add plain no-animation paths for `Progress`, `SegmentedTabs`, `Switch`, `Checkbox`, and `Radio` so explicit non-animated/reduced-motion usage avoids Reanimated hook setup.

## 0.5.0

### Minor Changes

- Add `SegmentedTabs`, a page-local animated Tab/Menu switcher with a horizontally sliding selected indicator, controlled/uncontrolled value support, style overrides, disabled options, and timing/spring motion configuration.
- Document `SegmentedTabs` usage, styling hooks, and motion options.

## 0.4.20

### Patch Changes

- Fix the StackNavigator direct-children regression by restoring React Navigation's native Screen component while keeping the default slide transition overridable.

## 0.4.19

### Patch Changes

- Fix StackNavigator transition defaults so screen-level animation options such as `fade` can override the default slide transition.

## 0.4.18

### Patch Changes

- `AppHeader` 新增 `titleNode`，支持直接渲染自定义标题节点，而不再只能传字符串标题
- 保持 `title` / `subtitle` 现有文本标题行为不变，兼容已有页面
- 补充 `AppHeader` 自定义标题节点测试
- 同步 README 与 release notes

## 0.4.17

### Patch Changes

- 修复 `AppImage` 通过 `style` 传入宽高时外层容器未正确获取尺寸的问题：
  - 之前只从 `w`/`h` 或 `width`/`height` 属性读取尺寸，忽略 `style` 中的宽高，导致外层容器高度为 `undefined`，在 Android 上图片可能无法显示
  - 新增尺寸解析优先级链：`w/h` > `width/height` > `style.width/height` > 默认值
  - 三种传参方式现在效果等价：`w/h` 属性、`width/height` 属性、`style={{ width, height }}`
- 补充 `AppImage` style fallback 单元测试
- 同步 README 与 release notes

## 0.4.16

### Patch Changes

- `AppHeader` 新增颜色覆盖能力：
  - 支持 `titleColor`
  - 支持 `subtitleColor`
  - 支持 `leftIconColor`
  - 支持 `rightIconColor`
- 补充 `AppHeader` 颜色透传测试
- 同步 README 与 release notes

## 0.4.15

### Patch Changes

- 补齐高级动画能力封装：
  - 新增高级布局动画预设：`motionLayoutPreset`、`motionLayoutDuration`、`motionLayoutDelay`、`motionLayoutSpring`
  - 新增 spring 动画参数：`motionSpringPreset`
  - `Presence`、`MotionView`、`StaggerItem`、`AppList` 接入高级布局动画预设
  - `Progress`、`Switch`、`Checkbox`、`Radio` 接入 spring 动画预设
  - 补充 `resolveMotionLayoutPreset`、`withSpring`、`withRepeat` 以及常用 reanimated hooks 导出
  - `BottomSheetModal`、`PageDrawer`、`Select`、`Picker`、`DatePicker` 新增 `motionOpenDuration` / `motionCloseDuration`
  - `BottomSheetModal` / `PageDrawer` 拖拽关闭运行时切换到 `react-native-gesture-handler` + reanimated
  - `AppList` 拆分 `motionReduceMotion` 与 `staggerReduceMotion` 语义，避免互相干扰
  - `Switch` 交互锁定时长改为跟随 motion 配置，不再固定写死 `220ms`
  - 新增 `CollapseView`，用于真实高度折叠 / 展开动画
  - 新增 `KeyboardInsetView`，用于底部输入栏 / 聊天输入框键盘避让
  - `BottomTabBar` 与 `DrawerContent` 默认关闭激活指示条，并支持显式开启
  - 修复 `AppHeader` 无法通过 `style.backgroundColor` 覆盖背景色的问题
  - 同步 README 与 release notes
