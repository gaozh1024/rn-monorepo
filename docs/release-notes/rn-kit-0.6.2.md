# @gaozh1024/rn-kit 0.6.2 Release Notes

`0.6.2` is a UI customization patch for bringing login and verification-code screens back onto the shared rn-kit component system.

## What Changed

- `AppButton` now supports design-spec styling hooks:
  - `style`
  - `contentStyle`
  - `textStyle`
  - `pressedStyle`
  - `disabledStyle`
- `AppButton` now supports icon and custom-content composition:
  - `leftIcon`
  - `rightIcon`
  - `iconGap`
  - `renderContent`
- `AppButton` adds two variants:
  - `surface`: white/card background, no border, light elevation
  - `soft`: low-emphasis colored background with theme-colored text
- `AppInput` adds focus and visual-preset APIs:
  - `focusedContainerStyle`
  - `focusRingColor`
  - `focusRingWidth`
  - `focusBackgroundColor`
  - `variant`
  - `inputSize`
  - `visualPreset`
- `AppInput` includes `visualPreset="soft-login"` for 56px login-style inputs with 16px radius, white background, no border, and light elevation.
- Theme creation now includes design tokens for outline/surface/primary-fixed colors, `radii`, `shadows`, and typography presets.
- `Icon` now exports `IconName` and normalizes snake_case names such as `check_circle` to kebab-case names such as `check-circle` with a development warning.

## Upgrade Guidance

Upgrade within the existing Expo SDK 54 / SDK 55 compatible `0.6.x` line:

```bash
pnpm add @gaozh1024/rn-kit@^0.6.2
npx expo install --check
```

Typical login button usage can now stay on `AppButton`:

```tsx
<AppButton
  h={56}
  rounded={16}
  rightIcon={<Icon name="arrow-forward" size={20} color="white" />}
  textStyle={{ fontSize: 17, lineHeight: 24, fontWeight: '700' }}
  pressedStyle={{ opacity: 0.88 }}
>
  登录
</AppButton>
```

Verification-code buttons can use the new surface variant:

```tsx
<AppButton variant="surface" h={56} rounded={16}>
  获取验证码
</AppButton>
```

Login inputs can use the new preset:

```tsx
<AppInput visualPreset="soft-login" placeholder="请输入手机号" focusRingColor="primary-500" />
```

## Compatibility Notes

- Existing `solid` / `outline` / `ghost` buttons keep their behavior.
- String and number button children are still wrapped in `AppText`; complex React nodes render as-is.
- `surface` buttons intentionally default to no border. Use `style` if a design needs an explicit border.
- `Icon` snake_case normalization is compatibility-only. New code should prefer Material Icons kebab-case names or exported icon constants.
