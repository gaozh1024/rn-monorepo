# @gaozh1024/rn-kit 0.6.5 Release Notes

`0.6.5` fixes Native input focus cancellation when `dismissKeyboardOnPressOutside` is enabled on screen-level containers.

## What Changed

- `KeyboardDismissPressable` now keeps its `TouchableWithoutFeedback` wrapper Web-only.
- Native `AppScreen`, `SafeScreen`, and `KeyboardDismissView` render children without injecting a full-screen responder wrapper.
- Web outside-press keyboard dismissal remains unchanged, including the editable-target guard for `input`, `textarea`, and `contenteditable`.
- `AppScrollView`, `AppFlatList`, and `AppList` still default `keyboardShouldPersistTaps` to `handled` when `dismissKeyboardOnPressOutside` is enabled.
- Tests now cover Native no-wrapper behavior and Web outside-dismiss behavior.

## Compatibility Notes

- No public API names were removed.
- Native static screen wrappers no longer provide wrapper-based whole-screen outside-tap dismissal. This is intentional so tapping `TextInput` / `AppInput` cannot be immediately followed by framework `Keyboard.dismiss()`.
- Native form screens should prefer `AppScrollView`, `AppFlatList`, or `AppList` for keyboard tap handling.
- `KeyboardDismissView` wrapper-based outside dismissal is Web-only; on Native it renders children without adding a dismissal wrapper.

## Upgrade

```bash
pnpm add @gaozh1024/rn-kit@^0.6.5
npx expo install --check
```
