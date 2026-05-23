# @gaozh1024/rn-observatory 0.1.0 Release Notes

发布日期：2026-05-17

## 新增

- 新增 `@gaozh1024/rn-observatory`，提供 Expo / React Native 应用观测 MVP。
- 支持 `AppObservatoryProvider`、`useAppObservatory`、`createAppObservatoryClient`。
- 支持 `captureException`、`captureMessage`、`addBreadcrumb`、`flush`、`setUser`、`setTags`。
- 支持 React Native `global.ErrorUtils`、Web `window.error` 和 `window.unhandledrejection` 的全局错误捕获。
- 支持本地事件队列、批量 flush、上传失败保留队列。
- 支持内置 fetch transport：`POST /api/app-observatory/events`。
- 支持默认敏感字段脱敏，包括 token、password、authorization、cookie、phone、email 等。
- 支持 session 记录和 `previous_session_crash` 异常退出推断。
- 预留 `NativeCrashAdapter`，后续可接 Sentry、Firebase Crashlytics 或自研原生 crash 模块。

## 与 rn-kit 集成

配合 `@gaozh1024/rn-kit@0.5.3` 使用时，可以把 `AppObservatoryProvider` 产生的 reporter 传给 `AppProvider.healthReporter`：

```tsx
<AppObservatoryProvider endpoint="https://api.example.com/api/app-observatory/events">
  {health => (
    <AppProvider enableErrorBoundary enableLogger healthReporter={health}>
      <RootNavigator />
    </AppProvider>
  )}
</AppObservatoryProvider>
```

此时：

- React ErrorBoundary 捕获的渲染异常会自动调用 `captureException`
- Logger 日志会自动成为 breadcrumbs
- `rn-kit` 本身不依赖 `rn-observatory`，未接入时行为不变

## 注意事项

- 默认 `MemoryObservatoryStorage` 不适合生产持久化；生产项目应注入 AsyncStorage / MMKV 等持久化 storage adapter。
- `previous_session_crash` 是异常退出推断，不等同于精确 Native crash。
- Native crash 需要后续通过 `NativeCrashAdapter` 或厂商 SDK 接入。
