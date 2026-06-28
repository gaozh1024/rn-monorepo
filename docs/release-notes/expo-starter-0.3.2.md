# @gaozh1024/expo-starter 0.3.2 Release Notes

`0.3.2` aligns the template with `@gaozh1024/rn-kit 0.6.1`.

## What Changed

- Update the template dependency to `@gaozh1024/rn-kit ^0.6.1`.
- Document the bottom tab safe-area contract: `BottomTabBar` owns the bottom safe-area inset, and tab root pages using `AppScreen` should pass `bottom={false}`.
- Document `useBottomTabBarMetrics()` for scroll padding or fixed bottom controls that need safe-area-aware spacing.
- Refresh AI usage artifacts so generated guidance matches the template README.

## Notes

The current template tab root screens do not wrap themselves in `AppScreen`, so no code change is needed there. The `bottom={false}` rule applies when a tab root page is later converted to `AppScreen`.
