# @gaozh1024/rn-kit 0.6.3 Release Notes

`0.6.3` adds first-class textarea support so note, comment, description, and chat-draft inputs can stay inside the shared rn-kit component system.

## What Changed

- Added `AppTextarea` as a semantic multiline text-entry component.
- Added explicit `AppInput textarea` mode for advanced wrappers that need AppInput internals with textarea layout semantics.
- `AppTextarea` defaults to:
  - `multiline`
  - `textAlignVertical="top"`
  - `blurOnSubmit={false}`
  - `scrollEnabled={false}`
  - `minH={96}`
- `AppInput textarea` no longer applies the single-line default height, and instead uses textarea min/max height rules.
- `AppInput multiline` remains a raw React Native `TextInput` pass-through and does not automatically enter textarea mode.
- AppInput focus styling now reserves border width across focus and blur, preventing layout jumps when focus rings are enabled.

## Upgrade Guidance

Upgrade within the existing Expo SDK 54 / SDK 55 compatible `0.6.x` line:

```bash
pnpm add @gaozh1024/rn-kit@^0.6.3
npx expo install --check
```

Prefer `AppTextarea` for business text areas:

```tsx
<AppTextarea
  value={value}
  onChangeText={setValue}
  placeholder="想到什么先写下来..."
  minH={58}
  variant="surface"
  focusRingWidth={0}
  containerStyle={{ backgroundColor: 'transparent', borderWidth: 0 }}
  inputStyle={{
    fontSize: 17,
    lineHeight: 26,
    paddingHorizontal: 0,
    paddingVertical: 0,
  }}
/>
```

Use `AppInput textarea` only when building a custom wrapper:

```tsx
<AppInput textarea value={value} onChangeText={setValue} placeholder="请输入备注" />
```

## Compatibility Notes

- Existing `AppInput` single-line usage keeps its default sizing behavior.
- Existing `AppInput multiline` usage keeps its pass-through behavior for compatibility.
- `AppTextareaProps` intentionally does not expose `textarea` or `multiline`; the component always stays in textarea mode.
- Existing focus APIs remain compatible, but border width is now reserved before focus so focus/unfocus does not resize the field.
