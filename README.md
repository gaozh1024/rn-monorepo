# 🐆 Panther Expo Framework

> 快速开发 React Native 应用的前端框架

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## ✨ 特性

- 🎨 **主题系统** - 自动生成色阶，支持明暗主题切换
- 🔌 **API 工厂** - 声明式 API 配置，Zod 类型安全
- 🧩 **原子组件** - 灵活的 UI 组件系统（View、Text、Button、Input 等）
- 📋 **表单组件** - Checkbox、Radio、Switch、Select、DatePicker
- 🪝 **实用 Hooks** - useToggle、useDebounce、useThrottle、useKeyboard、useInfinite 等
- 🧭 **导航组件** - Stack、Tab、Drawer 导航器，支持主题集成
- 🛡️ **错误处理** - 统一的错误分类和处理
- 📝 **TypeScript** - 完整的类型支持
- 🎙️ **语音转文字** - 可独立发布的阿里云实时语音识别能力包
- 🖼️ **图片/相册选择** - 可独立发布的相册选择与裁剪能力包
- 🔔 **移动推送** - 可独立发布的阿里云移动推送能力包
- ♨️ **OTA 热更新** - 可独立发布的热更新运行时与发布脚本能力包
- 🧪 **测试覆盖** - 全面的单元测试

## 📦 安装

```bash
npm install @gaozh1024/rn-kit
# 或
pnpm add @gaozh1024/rn-kit
# 或
yarn add @gaozh1024/rn-kit
```

### 前置依赖

```bash
npm install react react-native
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated
npx expo install @expo/vector-icons
npx expo install expo-linear-gradient
npm install react-native-svg
```

### ⚠️ 样式配置（必看）

本框架使用 **Tailwind CSS** 类名实现样式，需要配置 **NativeWind**。详见 [Tailwind 配置指南](./packages/rn-kit/TAILWIND_SETUP.md)。

如果你在 app 中发现 `AppView`、`AppButton`、`AppHeader` 没有样式，通常不是 `ThemeProvider` 问题，而是：

- app 没有配置 `nativewind/babel`
- `tailwind.config.js` 的 `content` 没有包含框架产物
- `safelist` 没有覆盖框架内部动态生成的工具类

## 🚀 快速开始

```tsx
import {
  ThemeProvider,
  createTheme,
  AppView,
  AppText,
  AppButton,
  useToggle,
  createAPI,
} from '@gaozh1024/rn-kit';

const theme = createTheme({
  colors: {
    primary: '#f38b32',
  },
});

const api = createAPI({
  baseURL: 'https://api.example.com',
  endpoints: {
    getUser: {
      method: 'GET',
      path: '/users/:id',
    },
  },
});

function App() {
  const [visible, { toggle }] = useToggle(false);

  return (
    <ThemeProvider light={theme}>
      <AppView flex p={4}>
        <AppText size="xl">Hello Panther!</AppText>
        <AppButton onPress={() => api.getUser({ id: '1' })}>获取用户</AppButton>
      </AppView>
    </ThemeProvider>
  );
}
```

## 📄 文档

- [移动端软件开发架构说明](./docs/01-入门指南/移动端软件开发架构说明.md) - 项目初始化、架构分层与框架使用总览
- [框架文档](./packages/rn-kit/README.md) - `@gaozh1024/rn-kit` 详细使用文档
- [语音包文档](./packages/aliyun-speech/README.md) - `@gaozh1024/aliyun-speech` 使用说明
- [相册包文档](./packages/photo-picker/README.md) - `@gaozh1024/photo-picker` 使用说明
- [推送包文档](./packages/aliyun-push/README.md) - `@gaozh1024/aliyun-push` 使用说明
- [热更新包文档](./packages/hot-updater/README.md) - `@gaozh1024/hot-updater` 使用说明
- [公共 API 清单](./docs/02-架构设计/公共API清单.md) - 稳定 API 与类型入口
- [文档索引](./docs/README.md) - 所有文档的入口
- [初始化指南](./SETUP.md)
- [发布指南](./PUBLISH.md)
- [Ignore 配置指南](./IGNORE_GUIDE.md)

## 🛠️ 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm -r build

# 运行测试
pnpm -r test

# 开发模式
pnpm --filter @gaozh1024/rn-kit dev
```

## 🧪 测试

```bash
# 运行所有测试
pnpm -r test

# 查看覆盖率
pnpm -r test:coverage
```

## 📁 项目结构

```
monorepo-rn/
├── packages/
│   ├── rn-kit/              # 统一框架包 (@gaozh1024/rn-kit)
│   ├── aliyun-speech/      # 阿里云语音转文字包 (@gaozh1024/aliyun-speech)
│   ├── photo-picker/       # 相册选择包 (@gaozh1024/photo-picker)
│   ├── aliyun-push/        # 阿里云移动推送包 (@gaozh1024/aliyun-push)
│   └── hot-updater/        # OTA 热更新包 (@gaozh1024/hot-updater)
├── docs/               # 文档
└── README.md           # 本文件
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT
