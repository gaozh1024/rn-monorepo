# @gaozh1024/rn-kit AI Usage

## What It Is
Panther Expo Framework core package for app bootstrap, theme, UI, navigation helpers, overlays, and API factory usage in Expo or React Native apps.

## When To Use
- Use this package as the default foundation for a new Panther-based app.
- Use AppProvider when you need a ready-made app bootstrap that includes theme, navigation, overlays, status bar, and development-time observability.
- Use createAPI when you want the framework's typed API factory and its observability integration.
- Use createTelemetryClient when you need to forward sanitized production telemetry to an app-owned collector.
- Use SegmentedTabs for page-local menu/status/category switching when the selected background should slide horizontally between options.
- Use Card variant="flat" and AppPressable motionPreset="none" for high-density list/grid interactions where press feedback should stay lightweight.
- Use animated={false} or motionReduceMotion on Progress, SegmentedTabs, Switch, Checkbox and Radio when reduced motion or Reanimated-free render paths are required.

## When Not To Use
- Do not use this package if you only need a single isolated capability that already exists as a smaller dedicated package.
- Do not default to using ThemeProvider alone as full app bootstrap when AppProvider fits the app structure better.
- Do not assume UI components will style correctly unless NativeWind and Tailwind scanning are configured in the consuming app.

## Recommended Entry
- Prefer importing from the root package entry @gaozh1024/rn-kit.
- For app bootstrap, prefer AppProvider over manually assembling providers.
- For page containers, prefer AppScreen for ordinary business pages and SafeScreen only when you need direct safe-area control.

## Install Prerequisites
- Install command: pnpm add @gaozh1024/rn-kit
- Peer dependencies: @expo/vector-icons, expo, expo-image, expo-linear-gradient, react, react-native, react-native-gesture-handler, react-native-reanimated, react-native-safe-area-context, react-native-screens, react-native-worklets

## Required Project Setup
- In Expo projects, install native peer dependencies with expo install before or alongside rn-kit.
- Configure NativeWind and Tailwind content scanning to include the consuming app and rn-kit dist output.
- If the project uses Expo SDK 54 / RN 0.81, also confirm react-native-worklets compatibility.

## Minimal Working Example
- app-provider-bootstrap: templates/expo-starter/src/recipes/minimal-bootstrap.tsx
- api-factory-usage: templates/expo-starter/src/recipes/api-auth.ts

## Canonical Patterns
- Prefer the stable public API `AppProvider` when it matches the use case.
- Prefer the stable public API `ThemeProvider` when it matches the use case.
- Prefer the stable public API `createTheme` when it matches the use case.
- Prefer the stable public API `useTheme` when it matches the use case.
- Prefer the stable public API `AppScreen` when it matches the use case.
- Prefer the stable public API `AppButton` when it matches the use case.
- Prefer the stable public API `createAPI` when it matches the use case.
- Prefer the stable public API `useToggle` when it matches the use case.
- Prefer the stable public API `SegmentedTabs` when it matches the use case.
- Prefer the stable public API `AppPressable` when it matches the use case.
- Prefer the stable public API `Card` when it matches the use case.
- Prefer the stable public API `Progress` when it matches the use case.
- Prefer the stable public API `Switch` when it matches the use case.
- Prefer the stable public API `Checkbox` when it matches the use case.
- Prefer the stable public API `Radio` when it matches the use case.
- Prefer the stable public API `createTelemetryClient` when it matches the use case.

## Anti-Patterns
- Installing Expo-native peer dependencies with plain npm latest versions instead of expo install.
- Treating missing styles as a ThemeProvider issue before checking NativeWind and Tailwind configuration.
- Rebuilding the whole app tree to switch theme when passing isDark to AppProvider or ThemeProvider is sufficient.
- Do not call vendor monitoring SDKs directly from scattered components; wrap them behind createTelemetryClient transports.

## Common Failure Cases
- AppView, AppButton, or AppHeader render without styles because NativeWind Babel config, Tailwind content paths, or safelist are incomplete.
- Expo projects resolve incompatible native package versions because dependencies were installed without expo install.
- AppImage usage fails in older projects upgraded to newer rn-kit because expo-image was not added.
- SegmentedTabs appears not to move its selected indicator if the container has not measured yet; ensure it is rendered with a non-zero width via layout, w, or style.width.
- Reanimated-related warnings in dense lists can often be avoided by choosing AppPressable/Card no-motion paths and no-animation form/display controls where animated feedback is not needed.

## Compatibility Baseline
- Current compatibility guidance targets Expo >=53 <55 and React Native >=0.79 <0.82.
- Expo SDK 54 maps to React Native 0.81.
- AppImage is based on expo-image in rn-kit >= 0.4.6.
- AppPressable defaults to a no-motion native Pressable path; opt into motionPreset when animated press feedback is required.
- Progress, SegmentedTabs, Switch, Checkbox and Radio support explicit no-animation/reduced-motion paths that avoid Reanimated hook setup.

## See Also
- README.md
- AI_USAGE.md
- TAILWIND_SETUP.md
