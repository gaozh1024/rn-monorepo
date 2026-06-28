# @gaozh1024/rn-kit 0.6.1 Release Notes

`0.6.1` is a bottom-tab safe-area patch for device-specific blank space above the tab bar.

## What Changed

- Added `useAppSafeAreaInsets()` as the framework-owned safe-area hook wrapper.
- Added `useBottomTabBarMetrics({ height })`, returning `contentHeight`, `safeAreaBottom`, and `totalHeight`.
- Exported `DEFAULT_BOTTOM_TAB_BAR_HEIGHT` so apps and docs can share the same default content-row height.
- Updated `BottomTabBar` so `height` controls only the tab content row and the bottom safe-area inset is rendered as a separate spacer.
- Ignored `style.height` on `BottomTabBar`; use `height` / `tabBarOptions.height` instead.
- Documented that tab root pages using `AppScreen` should pass `bottom={false}` because the tab bar owns the bottom safe area.

## Upgrade Guidance

For Expo SDK 54 and SDK 55 projects, update `rn-kit` within the existing `0.6.x` line:

```bash
pnpm add @gaozh1024/rn-kit@^0.6.1
npx expo install --check
```

If a page needs fixed bottom controls or scroll padding above the tab bar, use:

```tsx
const tabBar = useBottomTabBarMetrics({ height: 72 });

<ScrollView contentContainerStyle={{ paddingBottom: tabBar.totalHeight + 24 }} />;
```
