# @gaozh1024/rn-kit 0.5.1 Release Notes

发布日期：2026-05-09

`0.5.1` 是一次性能与稳定性补丁发布，重点降低高密度列表、移动端 Web 与显式无动画场景中的 Reanimated 初始化成本，同时稳定 Overlay / Theme Hook API 引用。

## 本次更新

### 1. 更轻量的可点击与卡片表面

- `AppPressable` 默认 `motionPreset="none"`，走原生 `Pressable` 快路径，不初始化 `usePressMotion` / Reanimated shared value。
- 需要按压反馈时仍可显式使用 `motionPreset="soft" | "strong"`，并继续支持全局 `MotionConfigProvider` 默认按压预设。
- `Card` 新增 `variant`：
  - `flat`：无阴影、无边框，推荐商品列表、Feed、瀑布流等高密度滚动场景。
  - `outlined`：无阴影、有细边框，适合需要边界但不需要 elevation 的列表卡片。
  - `elevated`：保持默认阴影 + 边框视觉。

```tsx
<Card variant="flat" motionPreset="none" onPress={goDetail}>
  <AppText>商品标题</AppText>
</Card>
```

### 2. 状态组件支持显式无动画路径

以下组件在 `animated={false}` 或 `motionReduceMotion` 场景下会使用普通视图 / 静态样式更新，避免不必要的 Reanimated hook setup：

- `Progress`
- `SegmentedTabs`
- `Switch`
- `Checkbox`
- `Radio`

`SegmentedTabs` 默认仍保持 timing/spring 滑动体验；只有显式关闭动画或 reduced-motion 时才使用静态 `width + translateX` 定位。

### 3. Overlay / Theme Hook 引用稳定性

- Toast、Loading、Alert provider 的上下文 API 对象引用在状态变化时保持稳定。
- Theme provider 的上下文动作引用保持稳定，减少消费者对 hook 返回对象的无效重渲染判断。

### 4. Web / 文档同步

- README 补充 Card 轻量表面、AppPressable 默认无动画快路径、Progress / SegmentedTabs / 表单控件无动画说明。
- Web Support Matrix 补充无动画 / reduced-motion 路径的 Web 支持边界。
- 公共 API 清单、AI_USAGE 与 ai-manifest 同步 0.5.1 能力说明。

## 发布前验证

已验证：

- `pnpm --dir packages/rn-kit typecheck`
- `pnpm --dir packages/rn-kit test`
- `pnpm --dir packages/rn-kit build`
- `pnpm verify:release`
- `pnpm ai:check`
- `npm_config_cache=/tmp/npm-cache npm pack --dry-run`（在 `packages/rn-kit` 下执行）

## 配套版本

- `@gaozh1024/rn-kit`：`0.5.1`
- `@gaozh1024/expo-starter`：现有 `^0.5.0` 依赖范围可直接接收 `0.5.1`，无需模板版本同步发布。
