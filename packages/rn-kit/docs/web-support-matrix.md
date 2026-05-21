# rn-kit Web Support Matrix

This matrix is the maintained contract for Expo Web / React Native Web support.

## Support levels

- **Supported**: expected to import, render and behave on iOS, Android and mobile Web.
- **Web variant**: native and Web share the same public API, but Web uses a browser-specific implementation.
- **Conditional**: supported when the template/runtime is configured correctly.
- **Native semantic gap**: component renders but browser behavior is intentionally different or limited.

## Supported

- `core/*`
- `theme/*`
- `utils/*`
- `AppView`, `AppText`, `Row`, `Col`, `Center`
- `AppInput`, `FormItem`, `useForm`
  - `AppInput` resets the browser's native `input:focus` outline on Web and keeps rn-kit's outer focus border as the single visible focus treatment.
  - `AppInput` built-in container padding, radius, text padding and font size are resolved through shortcut props / explicit styles instead of relying on NativeWind `className` injection.
- `Skeleton`, `SkeletonText`, `SkeletonCircle`
- `AppPressable`: default `motionPreset="none"` uses the native `Pressable` path and avoids Reanimated hook setup on Web.
- `Progress`, `SegmentedTabs`, `Switch`, `Checkbox`, `Radio`:
  - Native keeps Reanimated-based motion by default.
  - Web uses CSS transition-backed indicator/thumb/progress animation for default animated usage.
  - `animated={false}` and reduced-motion paths render with plain static styles instead of animated shared values.
- `useToggle`, `useDebounce`, `useThrottle`, `useDimensions`, `useOrientation`

## Web variant

- `AppStatusBar`: Web maps status-bar background to browser `theme-color` where possible; there is no native browser status bar.
- `BottomSheetModal`: Web uses a dialog-like sheet without native swipe handling; Escape closes the sheet.
- `PageDrawer`: Web uses a fixed drawer/dialog surface with Escape/backdrop close instead of `BackHandler` and native gestures.
- `Slider`: Web uses browser range semantics for keyboard and accessibility while preserving rn-kit visuals.
- `LogOverlay`: Web uses a fixed toggle/panel without PanResponder dragging.
- `Select`: Web uses sheet/listbox-style options with searchable, clearable, single and multiple selection flows.
- `Picker`: Web uses sheet/list columns with confirm/cancel and temp-value semantics.
- `DatePicker`: Web uses the Picker Web variant for year/month/day parity with the app.
- `Presence` / `MotionView` / `StaggerItem`: Web uses a CSS-backed presence engine and a plain React Native `View` surface, so visible content does not depend on Reanimated shared values reaching `opacity: 1`.

## Conditional

- Reanimated-based components generally require the Expo/Web app to include `react-native-worklets/plugin` or equivalent Reanimated Web setup. `Presence` / `MotionView` / `StaggerItem` visibility and `Progress` / `SegmentedTabs` / `Switch` / `Checkbox` / `Radio` default visual animations on Web are exceptions: they use CSS-backed transitions and do not depend on Reanimated shared-value progression for those specific visual updates.
- Components that explicitly choose `animated={false}` or `motionReduceMotion` for the supported no-animation paths do not require Reanimated shared-value progression for that visual state update.
- Reanimated layout animation props (`motionEntering`, `motionExiting`, `motionLayout` and layout presets) are native/Reanimated-only on Web presence surfaces; rn-kit drops those objects before they reach the React Native Web host component.
- Gesture-based components require `GestureHandlerRootView`; `AppProvider` now supplies it by default.
- React Navigation Web requires app-level linking configuration for URL parity.
- `AppImage`, `GradientView`, `Icon` depend on Expo Web-compatible peer packages and font/image loading.

## Web styling maintenance rule

Web-critical layout must not rely only on NativeWind `className` injection. This is especially
important for `AppPressable` (it is backed by an animated pressable) and for native browser controls
such as `TextInput` on Web.

For built-in components, spacing, alignment, radius, text size, input padding and hit-area styles that
affect usability should use rn-kit shortcut props or explicit styles (`row`, `flex`, `items`,
`justify`, `p`/`px`/`py`, `m`/`mt`, `rounded`, `style`, `containerStyle`, `inputStyle`). Decorative
classes may remain when the required Web behavior has an inline fallback.

## Native semantic gap

- Keyboard dismissal and safe-area helpers are browser-safe but not identical to iOS/Android soft-keyboard behavior.

## Release verification

Run the Web release gate before publishing:

```bash
pnpm verify:web
```

For browser-level validation, open the Expo starter Web smoke route after starting the template:

```bash
pnpm --dir templates/expo-starter web
# then visit /web-smoke
```

The smoke screen imports `@gaozh1024/rn-kit` from the package entry and renders the Web-sensitive components covered by this matrix.
