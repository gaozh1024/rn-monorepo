# @gaozh1024/rn-kit 0.5.3 Release Notes

发布日期：2026-05-17

## 修复 / 增强

- 新增 `healthReporter` 桥接协议，允许业务把 `@gaozh1024/rn-health` 或其他监控 SDK 接入 rn-kit。
- `AppProvider` 新增 `healthReporter` 参数，并向内部 `LoggerProvider` 和 `AppErrorBoundary` 传递。
- `AppErrorBoundary` 捕获 React 渲染异常时会调用 `healthReporter.captureException`。
- `LoggerProvider` 写日志时会调用 `healthReporter.addBreadcrumb`。
- 未传 `healthReporter` 时保持原有行为，不引入新的运行时依赖。

## 推荐用法

```tsx
<AppHealthProvider endpoint="https://api.example.com/app-health/events">
  {health => (
    <AppProvider enableErrorBoundary enableLogger healthReporter={health}>
      <RootNavigator />
    </AppProvider>
  )}
</AppHealthProvider>
```

## 验证

- 补充 ErrorBoundary 自动上报测试。
- 补充 Logger breadcrumb 桥接测试。
- 补充 AppProvider 透传 `healthReporter` 测试。
