# @gaozh1024/rn-kit 0.5.2 Release Notes

发布日期：2026-05-16

## 修复

- 修复 React Native Web / Expo Web 下 `dismissKeyboardOnPressOutside` 包裹 `AppInput` 时，点击输入框会立即触发外层 `Keyboard.dismiss()` 导致输入框失焦的问题。
- `AppScreen`、`SafeScreen`、`AppScrollView`、`AppFlatList`、`AppList`、`KeyboardDismissView` 现在统一使用 Web-safe 的键盘收起入口，会跳过 `input` / `textarea` / `contenteditable` 目标及其子节点。
- 修复 Web 端开发日志 `LogOverlay` 浮动按钮固定在右下角、无法拖动的问题。
- Web 端 `LogOverlay` 现在支持 pointer 拖动、释放后自动吸附左右边缘，并复用 `overlayPositionStorageKey` 持久化位置。
- 拖动日志浮动按钮后不会误触发展开 / 收起；单击按钮仍会正常切换日志面板。

## 验证

- 增加 Web 输入目标过滤测试，覆盖 `input`、`textarea`、`contenteditable` 和嵌套输入目标。
- 增加 `LogOverlay.web` 测试，覆盖恢复持久化位置、拖动吸边持久化、拖动不误触发展开。
- 已通过 rn-kit 测试、类型检查、构建与 npm pack dry-run。

## 升级建议

- 升级到 `@gaozh1024/rn-kit@0.5.2`。
- Web 项目无需修改业务代码；继续使用 `dismissKeyboardOnPressOutside` 和 `loggerProps.overlayEnabled` 即可获得修复。
