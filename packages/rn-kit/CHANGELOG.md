# @gaozh1024/rn-kit

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
