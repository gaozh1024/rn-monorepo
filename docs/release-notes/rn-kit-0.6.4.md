# @gaozh1024/rn-kit 0.6.4 Release Notes

`0.6.4` fixes the Native wheel picker selection highlight so selected text remains visible on iOS and Android.

## What Changed

- Native `Picker` now renders its opaque selected-row highlight behind the `ScrollView` content.
- Native `DatePicker` receives the same fix because it reuses `Picker`.
- The top and bottom fade masks remain above the scroll content.
- Added a regression test that verifies the selection highlight is painted before the option text layer.

## Compatibility Notes

- No public API changes.
- Picker values, scrolling, snapping, disabled options, and callbacks are unchanged.
- `Picker.web` is unchanged because it already renders the selected background directly on each option.

## Upgrade

```bash
pnpm add @gaozh1024/rn-kit@^0.6.4
npx expo install --check
```
