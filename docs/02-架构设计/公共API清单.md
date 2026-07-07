# 公共 API 清单

> 本文档是下一阶段架构任务 A1 的交付物
>
> 创建日期: 2026-03-18
>
> 用途: 明确哪些导出属于稳定公共 API，哪些只是内部实现细节

## 概览

| 模块         | 稳定性    | 说明                                          |
| ------------ | --------- | --------------------------------------------- |
| `utils`      | ✅ 稳定   | 通用工具函数，变动频率低                      |
| `theme`      | ✅ 稳定   | 主题系统核心 API                              |
| `core`       | ⚠️ 待观察 | 包含三方库 deprecated 兼容导出，v1.0.0 前保留 |
| `ui`         | ✅ 稳定   | UI 组件库，公共组件稳定                       |
| `navigation` | ✅ 稳定   | 类型与 Hook 已拆分，公共入口已收敛            |
| `overlay`    | ✅ 稳定   | Loading / Toast / Alert 已拆分为独立子系统    |

---

## 1. Utils 模块 (`@/utils`)

### 稳定性: ✅ 稳定

所有导出均为**稳定公共 API**，建议长期使用。

| 导出项                 | 类型     | 稳定性  | 备注               |
| ---------------------- | -------- | ------- | ------------------ |
| `cn`                   | function | ✅ 稳定 | className 合并工具 |
| `clsx`                 | function | ✅ 稳定 | className 条件合并 |
| `twMerge`              | function | ✅ 稳定 | Tailwind 类名合并  |
| `ClassValue`           | type     | ✅ 稳定 | clsx 输入类型      |
| `hexToRgb`             | function | ✅ 稳定 | 颜色转换           |
| `rgbToHex`             | function | ✅ 稳定 | 颜色转换           |
| `adjustBrightness`     | function | ✅ 稳定 | 颜色亮度调整       |
| `generateColorPalette` | function | ✅ 稳定 | 生成色板           |
| `RgbObject`            | type     | ✅ 稳定 | RGB 对象类型       |
| `ColorPalette`         | type     | ✅ 稳定 | 色板类型           |
| `isDevelopment`        | function | ✅ 稳定 | 环境判断           |
| `formatDate`           | function | ✅ 稳定 | 日期格式化         |
| `formatRelativeTime`   | function | ✅ 稳定 | 相对时间格式化     |
| `truncate`             | function | ✅ 稳定 | 字符串截断         |
| `slugify`              | function | ✅ 稳定 | URL 友好字符串     |
| `capitalize`           | function | ✅ 稳定 | 首字母大写         |
| `formatNumber`         | function | ✅ 稳定 | 数字格式化         |
| `formatCurrency`       | function | ✅ 稳定 | 货币格式化         |
| `formatPercent`        | function | ✅ 稳定 | 百分比格式化       |
| `clamp`                | function | ✅ 稳定 | 数值限制           |
| `deepMerge`            | function | ✅ 稳定 | 对象深度合并       |
| `pick`                 | function | ✅ 稳定 | 对象属性选取       |
| `omit`                 | function | ✅ 稳定 | 对象属性排除       |
| `getValidationErrors`  | function | ✅ 稳定 | 获取验证错误       |
| `isValidEmail`         | function | ✅ 稳定 | 邮箱验证           |
| `isValidPhone`         | function | ✅ 稳定 | 手机号验证         |

---

## 2. Theme 模块 (`@/theme`)

### 稳定性: ✅ 稳定

主题系统核心 API，建议长期使用。

| 导出项               | 类型      | 稳定性  | 备注                |
| -------------------- | --------- | ------- | ------------------- |
| `Theme`              | type      | ✅ 稳定 | 主题类型            |
| `ThemeConfig`        | type      | ✅ 稳定 | 主题配置类型        |
| `ColorPalette`       | type      | ✅ 稳定 | 色板类型            |
| `ColorToken`         | type      | ✅ 稳定 | 颜色令牌类型        |
| `ShadowToken`        | type      | ✅ 稳定 | 阴影令牌类型        |
| `TypographyToken`    | type      | ✅ 稳定 | 排版令牌类型        |
| `createTheme`        | function  | ✅ 稳定 | 创建主题            |
| `ThemeProvider`      | component | ✅ 稳定 | 主题提供者          |
| `useTheme`           | hook      | ✅ 稳定 | 获取主题上下文      |
| `ThemeProviderProps` | type      | ✅ 稳定 | Provider Props 类型 |
| `getThemeColors`     | function  | ✅ 稳定 | 读取语义颜色令牌    |
| `useThemeColors`     | hook      | ✅ 稳定 | Hook 形式读取语义色 |
| `ThemeColorTokens`   | type      | ✅ 稳定 | 语义颜色令牌类型    |

**注意**: 根入口 `index.ts` 将 `ColorPalette` 重命名为 `ThemeColorPalette` 导出，以避免与 `utils` 中的同名类型冲突。

---

## 3. Core 模块 (`@/core`)

### 稳定性: ⚠️ 待观察

包含三方库 deprecated 兼容导出；v0.x 保留，v1.0.0 按迁移说明移除（参见 A3 任务）。

### 3.1 Error 子模块

| 导出项          | 类型     | 稳定性      | 备注                                    |
| --------------- | -------- | ----------- | --------------------------------------- |
| `ErrorCode`     | enum     | ✅ 稳定     | 错误码枚举                              |
| `AppError`      | type     | ✅ 稳定     | 应用错误类型                            |
| `mapHttpStatus` | function | ✅ 稳定     | HTTP 状态映射                           |
| `enhanceError`  | function | ✅ 稳定     | 错误增强                                |
| `useAsyncState` | hook     | ⚠️ 兼容导出 | 已迁移至 `core/hooks`，当前仅保留兼容层 |
| `UseAsyncState` | type     | ⚠️ 兼容导出 | 已迁移至 `core/hooks`，当前仅保留兼容层 |

### 3.2 API 子模块

| 导出项                     | 类型     | 稳定性  | 备注                                  |
| -------------------------- | -------- | ------- | ------------------------------------- |
| `ApiEndpointConfig`        | type     | ✅ 稳定 | API 端点配置                          |
| `ApiConfig`                | type     | ✅ 稳定 | API 全局配置                          |
| `ApiObservabilityConfig`   | type     | ✅ 稳定 | API 打点配置                          |
| `ApiLogEvent`              | type     | ✅ 稳定 | API request/response/error 事件类型   |
| `ApiLogTransport`          | type     | ✅ 稳定 | API 打点 transport 类型               |
| `createAPI`                | function | ✅ 稳定 | API 创建函数                          |
| `createApiLoggerTransport` | function | ✅ 稳定 | 将 API 打点事件写入 logger 的 adapter |

### 3.3 Storage 子模块

| 导出项                | 类型     | 稳定性  | 备注                     |
| --------------------- | -------- | ------- | ------------------------ |
| `StorageAdapter`      | type     | ✅ 稳定 | 统一存储适配器接口       |
| `MemoryStorage`       | class    | ✅ 稳定 | 内存存储实现             |
| `storage`             | instance | ✅ 稳定 | 当前生效的默认存储实例   |
| `setStorageAdapter`   | function | ✅ 稳定 | 在项目启动时注入存储实现 |
| `getStorageAdapter`   | function | ✅ 稳定 | 获取当前生效的存储实现   |
| `resetStorageAdapter` | function | ✅ 稳定 | 重置为默认内存存储实现   |

### 3.4 Hooks 子模块

| 导出项                 | 类型 | 稳定性  | 备注                  |
| ---------------------- | ---- | ------- | --------------------- |
| `useRequest`           | hook | ✅ 稳定 | 请求 Hook             |
| `usePagination`        | hook | ✅ 稳定 | 分页 Hook             |
| `UsePaginationReturn`  | type | ✅ 稳定 | 分页返回类型          |
| `UsePaginationOptions` | type | ✅ 稳定 | 分页选项类型          |
| `PaginationParams`     | type | ✅ 稳定 | 分页参数类型          |
| `PaginationResult`     | type | ✅ 稳定 | 分页结果类型          |
| `usePrevious`          | hook | ✅ 稳定 | 获取上一次的值        |
| `useSetState`          | hook | ✅ 稳定 | 状态合并更新          |
| `useMemoizedFn`        | hook | ✅ 稳定 | 函数记忆化            |
| `useUpdateEffect`      | hook | ✅ 稳定 | 跳过首次执行的 effect |
| `useStorage`           | hook | ✅ 稳定 | 存储 Hook             |
| `useRefresh`           | hook | ✅ 稳定 | 下拉刷新              |
| `UseRefreshReturn`     | type | ✅ 稳定 | 刷新返回类型          |
| `useInfinite`          | hook | ✅ 稳定 | 无限滚动              |
| `UseInfiniteReturn`    | type | ✅ 稳定 | 无限滚动返回类型      |
| `UseInfiniteOptions`   | type | ✅ 稳定 | 无限滚动选项          |
| `InfiniteFetchParams`  | type | ✅ 稳定 | 无限滚动参数          |
| `InfiniteFetchResult`  | type | ✅ 稳定 | 无限滚动结果          |
| `useAsyncState`        | hook | ✅ 稳定 | 已迁移到 hooks 主入口 |
| `UseAsyncState`        | type | ✅ 稳定 | 已迁移到 hooks 主入口 |

### 3.5 Telemetry 子模块

| 导出项                      | 类型     | 稳定性  | 备注                                 |
| --------------------------- | -------- | ------- | ------------------------------------ |
| `TelemetryEvent`            | type     | ✅ 稳定 | 生产可观测事件基础类型               |
| `TelemetryTransport`        | type     | ✅ 稳定 | 生产可观测 transport 类型            |
| `TelemetryClient`           | type     | ✅ 稳定 | 可复用 telemetry client 接口         |
| `TelemetryClientConfig`     | type     | ✅ 稳定 | telemetry client 配置                |
| `TelemetrySanitizer`        | type     | ✅ 稳定 | 事件级脱敏函数                       |
| `createTelemetryClient`     | function | ✅ 稳定 | 创建安全 telemetry client，默认 noop |
| `createNoopTelemetryClient` | function | ✅ 稳定 | 显式 noop telemetry client           |

### 3.6 三方库二次导出 (deprecated 兼容导出)

| 导出项        | 来源                    | 稳定性        | 备注                                     |
| ------------- | ----------------------- | ------------- | ---------------------------------------- |
| `z`           | `zod`                   | ⚠️ deprecated | v0.x 保留兼容导出；v1.0.0 按迁移说明移除 |
| `useQuery`    | `@tanstack/react-query` | ⚠️ deprecated | v0.x 保留兼容导出；v1.0.0 按迁移说明移除 |
| `useMutation` | `@tanstack/react-query` | ⚠️ deprecated | v0.x 保留兼容导出；v1.0.0 按迁移说明移除 |

**建议**: 新代码直接依赖原始库；框架根入口仅为 v0.x 兼容旧使用方保留这些导出。

---

## 4. UI 模块 (`@/ui`)

### 稳定性: ✅ 稳定

UI 组件库，所有组件均为**稳定公共 API**。

### 4.1 Primitives 基础组件

| 导出项              | 类型      | 稳定性  | 备注       |
| ------------------- | --------- | ------- | ---------- |
| `AppView`           | component | ✅ 稳定 | 视图容器   |
| `AppViewProps`      | type      | ✅ 稳定 | Props 类型 |
| `AppText`           | component | ✅ 稳定 | 文本组件   |
| `AppTextProps`      | type      | ✅ 稳定 | Props 类型 |
| `AppPressable`      | component | ✅ 稳定 | 可按压组件 |
| `AppPressableProps` | type      | ✅ 稳定 | Props 类型 |

### 4.2 Layout 布局组件

| 导出项                 | 类型      | 稳定性  | 备注                      |
| ---------------------- | --------- | ------- | ------------------------- |
| `Row`                  | component | ✅ 稳定 | 水平布局                  |
| `RowProps`             | type      | ✅ 稳定 | Props 类型                |
| `Col`                  | component | ✅ 稳定 | 垂直布局                  |
| `ColProps`             | type      | ✅ 稳定 | Props 类型                |
| `Center`               | component | ✅ 稳定 | 居中布局                  |
| `CenterProps`          | type      | ✅ 稳定 | Props 类型                |
| `SafeScreen`           | component | ✅ 稳定 | 安全区域基础容器          |
| `AppScreen`            | component | ✅ 稳定 | 页面容器（推荐）          |
| `SafeBottom`           | component | ✅ 稳定 | 底部安全区域              |
| `useAppSafeAreaInsets` | hook      | ✅ 稳定 | 读取框架统一安全区 Insets |
| `SafeScreenProps`      | type      | ✅ 稳定 | Props 类型                |

### 4.3 Actions 操作组件

| 导出项           | 类型      | 稳定性  | 备注       |
| ---------------- | --------- | ------- | ---------- |
| `AppButton`      | component | ✅ 稳定 | 按钮组件   |
| `AppButtonProps` | type      | ✅ 稳定 | Props 类型 |

#### 0.6.2 AppButton 设计稿级扩展

- `variant` 增加 `surface` / `soft`，其中 `surface` 默认白底/卡片底、无边框、轻阴影，`soft` 默认浅色背景 + 主题文字。
- 新增精细样式入口：`style` / `contentStyle` / `textStyle` / `pressedStyle` / `disabledStyle`。
- 新增内容插槽：`leftIcon` / `rightIcon` / `iconGap` / `renderContent`。
- 字符串/数字 children 仍会包进 `AppText`，复杂 ReactNode children 会按原样渲染，适合“登录 + 箭头”这类组合按钮。

### 4.4 Feedback 反馈组件

| 导出项         | 类型      | 稳定性  | 备注         |
| -------------- | --------- | ------- | ------------ |
| `Toast`        | component | ✅ 稳定 | Toast 组件   |
| `ToastProps`   | type      | ✅ 稳定 | Props 类型   |
| `Alert`        | component | ✅ 稳定 | Alert 组件   |
| `AlertProps`   | type      | ✅ 稳定 | Props 类型   |
| `Loading`      | component | ✅ 稳定 | Loading 组件 |
| `LoadingProps` | type      | ✅ 稳定 | Props 类型   |

### 4.5 Display 展示组件

| 导出项                     | 类型      | 稳定性  | 备注                                     |
| -------------------------- | --------- | ------- | ---------------------------------------- |
| `Progress`                 | component | ✅ 稳定 | 进度条                                   |
| `ProgressProps`            | type      | ✅ 稳定 | Props 类型                               |
| `Card`                     | component | ✅ 稳定 | 卡片                                     |
| `CardProps`                | type      | ✅ 稳定 | Props 类型                               |
| `CardVariant`              | type      | ✅ 稳定 | 卡片表面重量：flat / outlined / elevated |
| `Icon`                     | component | ✅ 稳定 | 图标组件                                 |
| `IconProps`                | type      | ✅ 稳定 | Props 类型                               |
| `IconName`                 | type      | ✅ 稳定 | 图标名称类型，兼容 MaterialIcons 字符串  |
| `IconSize`                 | type      | ✅ 稳定 | 图标尺寸                                 |
| `NavigationIcons`          | object    | ✅ 稳定 | 导航图标集合                             |
| `ActionIcons`              | object    | ✅ 稳定 | 操作图标集合                             |
| `StatusIcons`              | object    | ✅ 稳定 | 状态图标集合                             |
| `FileIcons`                | object    | ✅ 稳定 | 文件图标集合                             |
| `AppImage`                 | component | ✅ 稳定 | 图片组件                                 |
| `AppImageProps`            | type      | ✅ 稳定 | Props 类型                               |
| `AppList`                  | component | ✅ 稳定 | 列表组件                                 |
| `AppListProps`             | type      | ✅ 稳定 | Props 类型                               |
| `GradientView`             | component | ✅ 稳定 | 渐变背景容器                             |
| `GradientViewProps`        | type      | ✅ 稳定 | Props 类型                               |
| `PageDrawer`               | component | ✅ 稳定 | 页面级抽屉                               |
| `PageDrawerProps`          | type      | ✅ 稳定 | Props 类型                               |
| `SegmentedTabs`            | component | ✅ 稳定 | 页面内分段切换，支持动画指示器和样式定制 |
| `SegmentedTabsProps`       | type      | ✅ 稳定 | Props 类型                               |
| `SegmentedTabOption`       | type      | ✅ 稳定 | 选项类型                                 |
| `SegmentedTabsRenderState` | type      | ✅ 稳定 | 自定义渲染状态类型                       |

#### 0.5.1 轻量渲染与无动画路径

- `AppPressable` 默认 `motionPreset="none"`，使用原生 `Pressable` 快路径；需要按压反馈时显式传入 `motionPreset="soft" | "strong"`。
- `Card` 新增 `variant="flat" | "outlined" | "elevated"`：长列表/网格优先使用 `flat`，需要边界但不需要阴影时使用 `outlined`。
- `Progress`、`SegmentedTabs`、`Switch`、`Checkbox`、`Radio` 支持 `animated={false}` / `motionReduceMotion` 的普通视图更新路径，用于减少密集列表与 Web 场景中的 Reanimated 初始化成本。
- Toast / Loading / Alert 与 Theme Provider 的 Hook API 对象引用保持稳定，避免纯状态变化触发消费者误判为 API 变更。

#### AppList 可本地化文案参数（可选）

| 字段               | 类型     | 默认值             | 说明                 |
| ------------------ | -------- | ------------------ | -------------------- |
| `emptyTitle`       | `string` | `暂无数据`         | 空状态标题           |
| `emptyDescription` | `string` | -                  | 空状态描述           |
| `errorTitle`       | `string` | `加载失败`         | 错误状态标题         |
| `errorDescription` | `string` | `请检查网络后重试` | 错误状态描述兜底文案 |
| `retryText`        | `string` | `重新加载`         | 错误状态重试按钮文案 |

### 4.6 Form 表单组件

| 导出项                 | 类型      | 稳定性  | 备注           |
| ---------------------- | --------- | ------- | -------------- |
| `AppInput`             | component | ✅ 稳定 | 输入框         |
| `AppInputProps`        | type      | ✅ 稳定 | Props 类型     |
| `AppInputVariant`      | type      | ✅ 稳定 | 输入框视觉变体 |
| `AppInputSize`         | type      | ✅ 稳定 | 输入框尺寸     |
| `AppInputVisualPreset` | type      | ✅ 稳定 | 输入框视觉预设 |
| `AppTextarea`          | component | ✅ 稳定 | 多行文本域     |
| `AppTextareaProps`     | type      | ✅ 稳定 | Props 类型     |
| `Checkbox`             | component | ✅ 稳定 | 复选框         |
| `CheckboxProps`        | type      | ✅ 稳定 | Props 类型     |
| `CheckboxGroup`        | component | ✅ 稳定 | 复选框组       |
| `CheckboxGroupProps`   | type      | ✅ 稳定 | Props 类型     |
| `Radio`                | component | ✅ 稳定 | 单选框         |
| `RadioProps`           | type      | ✅ 稳定 | Props 类型     |
| `RadioGroup`           | component | ✅ 稳定 | 单选框组       |
| `RadioGroupProps`      | type      | ✅ 稳定 | Props 类型     |
| `Switch`               | component | ✅ 稳定 | 开关           |
| `SwitchProps`          | type      | ✅ 稳定 | Props 类型     |
| `Slider`               | component | ✅ 稳定 | 滑块           |
| `SliderProps`          | type      | ✅ 稳定 | Props 类型     |
| `Select`               | component | ✅ 稳定 | 选择器         |
| `SelectProps`          | type      | ✅ 稳定 | Props 类型     |
| `SelectOption`         | type      | ✅ 稳定 | 选项类型       |
| `DatePicker`           | component | ✅ 稳定 | 日期选择器     |
| `DatePickerProps`      | type      | ✅ 稳定 | Props 类型     |
| `FormItem`             | component | ✅ 稳定 | 表单项         |
| `FormItemProps`        | type      | ✅ 稳定 | Props 类型     |
| `useForm`              | hook      | ✅ 稳定 | 表单管理       |

#### 0.6.2 AppInput 设计稿级扩展

- 新增 focus API：`focusedContainerStyle` / `focusRingColor` / `focusRingWidth` / `focusBackgroundColor`。
- 新增视觉变体：`variant="outline" | "filled" | "soft" | "surface"`。
- 新增固定视觉规格：`inputSize="sm" | "md" | "lg"` 与 `visualPreset="default" | "soft-login" | "surface"`。
- `soft-login` 默认适合登录页输入框：高度 56、圆角 16、白底、无边框、弱阴影、outline-variant 占位色。

#### 0.6.3 AppTextarea 与 AppInput textarea 模式

- 新增 `AppTextarea`，用于备注、评论、描述等多行输入场景，内部复用 `AppInput`。
- 新增 `AppInput textarea` 显式模式，默认启用 `multiline`、顶部对齐、`blurOnSubmit={false}`、`scrollEnabled={false}`。
- `AppInput multiline` 保持原始透传行为，不自动进入 textarea 视觉模式，避免旧项目行为变化。
- `focusRingWidth` 现在会在 focus/unfocus 间保持同一 `borderWidth`，聚焦态只改变颜色、背景和阴影。

#### Select 可本地化文案参数（可选）

| 字段                  | 类型     | 默认值                | 说明                               |
| --------------------- | -------- | --------------------- | ---------------------------------- |
| `singleSelectTitle`   | `string` | `请选择`              | 单选弹窗标题                       |
| `multipleSelectTitle` | `string` | `选择选项`            | 多选弹窗标题                       |
| `searchPlaceholder`   | `string` | `搜索...`             | 搜索框占位文案                     |
| `emptyText`           | `string` | `暂无选项`            | 选项为空时的提示文案               |
| `selectedCountText`   | `string` | `已选择 {{count}} 项` | 多选数量文案模板，支持 `{{count}}` |
| `confirmText`         | `string` | `确定`                | 多选确认按钮文案                   |

#### DatePicker 可本地化文案参数（可选）

| 字段               | 类型     | 默认值           | 说明             |
| ------------------ | -------- | ---------------- | ---------------- |
| `placeholder`      | `string` | `请选择日期`     | 输入框占位文案   |
| `cancelText`       | `string` | `取消`           | 弹窗取消按钮文案 |
| `confirmText`      | `string` | `确定`           | 弹窗确认按钮文案 |
| `pickerTitle`      | `string` | `选择日期`       | 弹窗标题         |
| `pickerDateFormat` | `string` | `yyyy年MM月dd日` | 弹窗顶部日期格式 |
| `yearLabel`        | `string` | `年`             | 年列标题         |
| `monthLabel`       | `string` | `月`             | 月列标题         |
| `dayLabel`         | `string` | `日`             | 日列标题         |
| `todayText`        | `string` | `今天`           | 快捷按钮文案     |
| `minDateText`      | `string` | `最早`           | 最小日期快捷文案 |
| `maxDateText`      | `string` | `最晚`           | 最大日期快捷文案 |

### 4.7 Hooks UI 相关 Hooks

| 导出项                 | 类型 | 稳定性  | 备注               |
| ---------------------- | ---- | ------- | ------------------ |
| `useToggle`            | hook | ✅ 稳定 | 布尔状态切换       |
| `UseToggleActions`     | type | ✅ 稳定 | 切换操作类型       |
| `usePageDrawer`        | hook | ✅ 稳定 | 页面级抽屉状态管理 |
| `UsePageDrawerReturn`  | type | ✅ 稳定 | 页面级抽屉返回类型 |
| `useDebounce`          | hook | ✅ 稳定 | 防抖               |
| `useThrottle`          | hook | ✅ 稳定 | 节流               |
| `useKeyboard`          | hook | ✅ 稳定 | 键盘状态           |
| `UseKeyboardReturn`    | type | ✅ 稳定 | 键盘返回类型       |
| `useDimensions`        | hook | ✅ 稳定 | 屏幕尺寸           |
| `UseDimensionsReturn`  | type | ✅ 稳定 | 尺寸返回类型       |
| `useOrientation`       | hook | ✅ 稳定 | 屏幕方向           |
| `UseOrientationReturn` | type | ✅ 稳定 | 方向返回类型       |
| `Orientation`          | type | ✅ 稳定 | 方向类型           |

---

## 5. Navigation 模块 (`@/navigation`)

### 稳定性: ✅ 稳定

导航类型和 Hook 已完成拆分，当前主要风险集中在对 React Navigation 原始类型的二次暴露策略。

### 5.1 Provider

| 导出项                    | 类型      | 稳定性    | 备注                       |
| ------------------------- | --------- | --------- | -------------------------- |
| `NavigationProvider`      | component | ✅ 稳定   | 导航提供者                 |
| `NavigationProviderProps` | type      | ⚠️ 待观察 | 依赖 React Navigation 类型 |

### 5.2 Navigators

| 导出项                    | 类型      | 稳定性    | 备注                                |
| ------------------------- | --------- | --------- | ----------------------------------- |
| `StackNavigator`          | component | ✅ 稳定   | 堆栈导航器                          |
| `TabNavigator`            | component | ✅ 稳定   | 标签导航器，默认使用 `BottomTabBar` |
| `DrawerNavigator`         | component | ✅ 稳定   | 抽屉导航器                          |
| `createStackScreens`      | function  | ✅ 稳定   | 创建堆栈屏幕                        |
| `createTabScreens`        | function  | ✅ 稳定   | 创建标签屏幕                        |
| `createDrawerScreens`     | function  | ✅ 稳定   | 创建抽屉屏幕                        |
| `StackNavigatorProps`     | type      | ✅ 稳定   | 已从独立类型模块导出                |
| `TabNavigatorProps`       | type      | ✅ 稳定   | 已从独立类型模块导出                |
| `DrawerNavigatorProps`    | type      | ✅ 稳定   | 已从独立类型模块导出                |
| `NativeStackScreenProps`  | type      | ⚠️ 待观察 | React Navigation 原始类型           |
| `BottomTabScreenProps`    | type      | ⚠️ 待观察 | React Navigation 原始类型           |
| `NativeDrawerScreenProps` | type      | ⚠️ 待观察 | React Navigation 原始类型           |

### 5.3 Components

| 导出项                    | 类型      | 稳定性  | 备注                                            |
| ------------------------- | --------- | ------- | ----------------------------------------------- |
| `AppHeader`               | component | ✅ 稳定 | 应用头部                                        |
| `AppHeaderProps`          | type      | ✅ 稳定 | Props 类型                                      |
| `AppScrollView`           | component | ✅ 稳定 | 滚动容器                                        |
| `AppScrollViewProps`      | type      | ✅ 稳定 | Props 类型                                      |
| `BottomTabBar`            | component | ✅ 稳定 | 底部标签栏，默认内容高度 65，自动追加底部安全区 |
| `CustomBottomTabBarProps` | type      | ✅ 稳定 | Props 类型                                      |
| `DrawerContent`           | component | ✅ 稳定 | 抽屉内容                                        |
| `DrawerContentProps`      | type      | ✅ 稳定 | Props 类型                                      |
| `DrawerItem`              | type      | ✅ 稳定 | 抽屉项类型                                      |

### 5.4 Hooks

| 导出项                          | 类型 | 稳定性    | 备注                                     |
| ------------------------------- | ---- | --------- | ---------------------------------------- |
| `useStackNavigation`            | hook | ✅ 稳定   | 堆栈导航 Hook                            |
| `useTabNavigation`              | hook | ✅ 稳定   | 标签导航 Hook                            |
| `useDrawerNavigation`           | hook | ✅ 稳定   | 抽屉导航 Hook                            |
| `useRoute`                      | hook | ✅ 稳定   | 获取当前路由                             |
| `useNavigationState`            | hook | ✅ 稳定   | 获取导航状态                             |
| `useBackHandler`                | hook | ✅ 稳定   | 安卓返回键处理                           |
| `useBottomTabBarMetrics`        | hook | ✅ 稳定   | 获取底部导航内容高度、安全区与总占位高度 |
| `useIsFocused`                  | hook | ✅ 稳定   | React Navigation 官方 Hook               |
| `useFocusEffect`                | hook | ✅ 稳定   | React Navigation 官方 Hook               |
| `useScrollToTop`                | hook | ✅ 稳定   | React Navigation 官方 Hook               |
| `NativeStackNavigationProp`     | type | ⚠️ 待观察 | React Navigation 原始类型                |
| `BottomTabNavigationProp`       | type | ⚠️ 待观察 | React Navigation 原始类型                |
| `DrawerNavigationProp`          | type | ⚠️ 待观察 | React Navigation 原始类型                |
| `RouteProp`                     | type | ⚠️ 待观察 | React Navigation 原始类型                |
| `NavigationProp`                | type | ⚠️ 待观察 | React Navigation 原始类型                |
| `BottomTabBarMetrics`           | type | ✅ 稳定   | 底部导航高度指标                         |
| `UseBottomTabBarMetricsOptions` | type | ✅ 稳定   | 底部导航高度指标 Hook 参数               |

### 5.5 Types

| 导出项                | 类型      | 稳定性  | 备注                                                       |
| --------------------- | --------- | ------- | ---------------------------------------------------------- |
| `StackParamList`      | interface | ✅ 稳定 | 用户扩展类型                                               |
| `TabParamList`        | interface | ✅ 稳定 | 用户扩展类型                                               |
| `DrawerParamList`     | interface | ✅ 稳定 | 用户扩展类型                                               |
| `ParamListBase`       | type      | ✅ 稳定 | 基础参数类型                                               |
| `RouteConfig`         | interface | ✅ 稳定 | 路由配置                                                   |
| `StackRouteConfig`    | interface | ✅ 稳定 | 堆栈路由配置                                               |
| `TabRouteConfig`      | interface | ✅ 稳定 | 标签路由配置                                               |
| `DrawerRouteConfig`   | interface | ✅ 稳定 | 抽屉路由配置                                               |
| `StackScreenOptions`  | interface | ✅ 稳定 | 屏幕选项                                                   |
| `TabScreenOptions`    | interface | ✅ 稳定 | 屏幕选项                                                   |
| `TabBarOptions`       | interface | ✅ 稳定 | 标签栏选项，支持 `height / style / labelStyle / iconStyle` |
| `DrawerScreenOptions` | interface | ✅ 稳定 | 屏幕选项                                                   |
| `DrawerOptions`       | interface | ✅ 稳定 | 抽屉选项                                                   |
| `StackScreenProps`    | type      | ✅ 稳定 | 屏幕 Props                                                 |
| `TabScreenProps`      | type      | ✅ 稳定 | 屏幕 Props                                                 |
| `DrawerScreenProps`   | type      | ✅ 稳定 | 屏幕 Props                                                 |
| `StackNavigation`     | type      | ✅ 稳定 | 导航类型                                                   |
| `TabNavigation`       | type      | ✅ 稳定 | 导航类型                                                   |
| `DrawerNavigation`    | type      | ✅ 稳定 | 导航类型                                                   |
| `AppNavigation`       | type      | ✅ 稳定 | 通用导航类型                                               |
| `LinkingConfig`       | interface | ✅ 稳定 | 深度链接配置                                               |
| `PathConfig`          | interface | ✅ 稳定 | 路径配置                                                   |

### 5.6 Utils

| 导出项                  | 类型     | 稳定性  | 备注         |
| ----------------------- | -------- | ------- | ------------ |
| `createNavigationTheme` | function | ✅ 稳定 | 创建导航主题 |

### 5.7 React Navigation 二次导出

| 导出项                   | 来源                       | 稳定性    | 备注               |
| ------------------------ | -------------------------- | --------- | ------------------ |
| `NavigationContainer`    | `@react-navigation/native` | ⚠️ 待观察 | 是否继续二次导出？ |
| `NavigationState`        | `@react-navigation/native` | ⚠️ 待观察 | 类型               |
| `NavigationContainerRef` | `@react-navigation/native` | ⚠️ 待观察 | 类型               |

---

## 6. Overlay 模块 (`@/overlay`)

### 稳定性: ✅ 稳定

Overlay 已按 loading / toast / alert / provider 拆分，对外 API 保持不变。

| 导出项               | 类型      | 稳定性  | 备注                         |
| -------------------- | --------- | ------- | ---------------------------- |
| `AppProvider`        | component | ✅ 稳定 | 统一 Provider                |
| `AppProviderProps`   | type      | ✅ 稳定 | Props 类型                   |
| `AppStatusBar`       | component | ✅ 稳定 | 全局/页面级状态栏组件        |
| `AppStatusBarProps`  | type      | ✅ 稳定 | Props 类型                   |
| `OverlayProvider`    | component | ✅ 稳定 | 已拆分为独立 provider 组合层 |
| `useLoading`         | hook      | ✅ 稳定 | Loading 控制                 |
| `useToast`           | hook      | ✅ 稳定 | Toast 控制                   |
| `useAlert`           | hook      | ✅ 稳定 | Alert 控制                   |
| `LoadingContextType` | type      | ✅ 稳定 | Loading 上下文类型           |
| `LoadingState`       | type      | ✅ 稳定 | Loading 状态类型             |
| `ToastContextType`   | type      | ✅ 稳定 | Toast 上下文类型             |
| `ToastItem`          | type      | ✅ 稳定 | Toast 数据类型               |
| `ToastType`          | type      | ✅ 稳定 | Toast 类型                   |
| `AlertContextType`   | type      | ✅ 稳定 | Alert 上下文类型             |
| `AlertOptions`       | type      | ✅ 稳定 | Alert 配置类型               |

**内部实现** (已完成拆分，不对外暴露):

- `LoadingProvider` - 内部组件
- `ToastProvider` - 内部组件
- `AlertProvider` - 内部组件
- `LoadingModal` - 内部组件
- `ToastItemView` - 内部组件

---

## 待下线或待迁移的导出清单

### 1. 三方库二次导出 (deprecated 兼容导出)

| 导出项        | 当前位置        | 建议操作                                   | 迁移路径                                                       |
| ------------- | --------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `z`           | `core/index.ts` | v0.x 保留 deprecated 兼容导出；v1.0.0 移除 | 用户直接 `import { z } from 'zod'`                             |
| `useQuery`    | `core/index.ts` | v0.x 保留 deprecated 兼容导出；v1.0.0 移除 | 用户直接 `import { useQuery } from '@tanstack/react-query'`    |
| `useMutation` | `core/index.ts` | v0.x 保留 deprecated 兼容导出；v1.0.0 移除 | 用户直接 `import { useMutation } from '@tanstack/react-query'` |

**理由**:

- 避免框架版本与三方库版本绑死
- 减少不必要的抽象层
- 用户可以直接使用原始库的完整功能
- v0.x 期间通过兼容导出降低迁移风险，v1.0.0 再执行移除

### 2. 兼容导出 (已完成迁移)

| 导出项          | 当前位置     | 建议操作   | 说明                          |
| --------------- | ------------ | ---------- | ----------------------------- |
| `useAsyncState` | `core/error` | 保留兼容层 | 主导出已迁移到 `core/hooks`   |
| `UseAsyncState` | `core/error` | 保留兼容层 | 类型定义已迁移到 `core/hooks` |

### 3. 类型重命名 (已存在)

| 导出项         | 根入口名称          | 原始名称       | 原因                                    |
| -------------- | ------------------- | -------------- | --------------------------------------- |
| `ColorPalette` | `ThemeColorPalette` | `ColorPalette` | 避免与 `utils` 中的 `ColorPalette` 冲突 |

---

## 验证要求

根据路线图统一验证要求，每次修改后需执行:

```bash
# 类型检查
pnpm -r typecheck

# 测试
pnpm -r test

# 构建
pnpm --filter @gaozh1024/rn-kit build
```

---

## 后续任务关联

| 任务 | 关联内容                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------- |
| A3   | 三方库二次导出 deprecated 兼容期治理                                                                |
| A3.1 | `z` / `useQuery` / `useMutation` 保持兼容导出并继续标记 deprecated，v1.0.0 前不得无迁移说明直接移除 |
| A4   | 单包边界说明文档                                                                                    |
| B1   | `core` 目录职责重整，迁移 `useAsyncState`                                                           |
| B2   | `overlay` 目录拆分                                                                                  |
| B3   | `navigation` 类型和 Hook 拆分                                                                       |
| C1   | 高风险模块测试补强                                                                                  |
