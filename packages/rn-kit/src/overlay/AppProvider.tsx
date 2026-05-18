/**
 * 统一应用 Provider
 *
 * @module overlay/AppProvider
 * @description 整合所有必要的 Provider，简化应用初始化
 */

import React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider, type ThemeConfig } from '@/theme';
import { NavigationProvider, type NavigationProviderProps } from '@/navigation';
import { MotionConfigProvider, type MotionConfig } from '@/ui/motion';
import { AppStatusBar, type AppStatusBarProps } from './AppStatusBar';
import { OverlayProvider } from './provider';
import type { LoggerProviderProps } from './logger/types';
import { LoggerProvider } from './logger/provider';
import { AppErrorBoundary } from './error-boundary/component';
import type { AppErrorBoundaryProps } from './error-boundary/types';
import type { AppHealthReporter } from '@/core/health-reporter';
import { isDevelopment } from '@/utils';

// ============================================================================
// 默认主题配置
// ============================================================================

/** 默认亮色主题 */
const defaultLightTheme: ThemeConfig = {
  colors: {
    primary: '#f38b32',
    secondary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

/** 默认暗色主题 */
const defaultDarkTheme: ThemeConfig = {
  colors: {
    primary: '#f38b32',
    secondary: '#60a5fa',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
};

// ============================================================================
// 组件 Props
// ============================================================================

/**
 * AppProvider Props
 */
export interface AppProviderProps extends Omit<NavigationProviderProps, 'children'> {
  /** 子元素 */
  children: React.ReactNode;
  /**
   * 是否启用导航（默认 true）
   * 如果已在其他地方提供 NavigationContainer，请设为 false
   */
  enableNavigation?: boolean;
  /** 是否启用全局 Overlay（Loading/Toast/Alert，默认 true） */
  enableOverlay?: boolean;
  /** 是否启用主题（默认 true） */
  enableTheme?: boolean;
  /** 是否启用开发日志基础设施（默认开发环境开启） */
  enableLogger?: boolean;
  /** 是否启用 React 错误边界（默认开发环境开启） */
  enableErrorBoundary?: boolean;
  /** 是否启用全局状态栏管理（默认 true） */
  enableStatusBar?: boolean;
  /** 是否启用安全区域（默认 true） */
  enableSafeArea?: boolean;
  /** 是否启用手势根容器（默认 true，Web/Native 手势组件都需要） */
  enableGestureHandlerRootView?: boolean;
  /** 自定义亮色主题 */
  lightTheme?: ThemeConfig;
  /** 自定义暗色主题 */
  darkTheme?: ThemeConfig;
  /** 默认使用暗色模式 */
  defaultDark?: boolean;
  /** 受控暗色模式 */
  isDark?: boolean;
  /** 全局状态栏配置 */
  statusBarProps?: AppStatusBarProps;
  /** 全局动画配置 */
  motion?: MotionConfig;
  /** Logger Provider 配置 */
  loggerProps?: Omit<LoggerProviderProps, 'children'>;
  /** Error Boundary 配置 */
  errorBoundaryProps?: Omit<AppErrorBoundaryProps, 'children'>;
  /** App 健康监控桥接器，用于接收 ErrorBoundary 异常和 logger breadcrumbs */
  healthReporter?: AppHealthReporter;
}

// ============================================================================
// 主组件
// ============================================================================

/**
 * 统一应用 Provider
 *
 * 整合：SafeAreaProvider + ThemeProvider + NavigationProvider + OverlayProvider
 * 提供一键式应用初始化方案
 *
 * @example
 * ```tsx
 * // 基础使用
 * import { AppProvider } from '@gaozh1024/rn-kit';
 * import { RootNavigator } from './navigation';
 *
 * export default function App() {
 *   return (
 *     <AppProvider>
 *       <RootNavigator />
 *     </AppProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 带深度链接
 * import { AppProvider } from '@gaozh1024/rn-kit';
 *
 * export default function App() {
 *   return (
 *     <AppProvider
 *       linking={{
 *         prefixes: ['myapp://', 'https://myapp.com'],
 *         config: {
 *           screens: {
 *             Home: 'home',
 *             Detail: 'detail/:id',
 *           },
 *         },
 *       }}
 *       fallback={<LoadingScreen />}
 *     >
 *       <RootNavigator />
 *     </AppProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 禁用部分功能
 * <AppProvider
 *   enableNavigation={true}
 *   enableOverlay={true}
 *   enableTheme={true}
 *   enableSafeArea={true}
 * >
 *   <YourApp />
 * </AppProvider>
 * ```
 *
 * @example
 * ```tsx
 * // 自定义主题
 * <AppProvider
 *   lightTheme={{
 *     colors: {
 *       primary: '#1890ff',
 *       success: '#52c41a',
 *       // ... 其他颜色
 *     },
 *   }}
 *   darkTheme={{
 *     colors: {
 *       primary: '#40a9ff',
 *       // ... 其他颜色
 *     },
 *   }}
 * >
 *   <App />
 * </AppProvider>
 * ```
 *
 * @example
 * ```tsx
 * // 使用外部 NavigationContainer
 * import { NavigationContainer } from '@react-navigation/native';
 *
 * export default function App() {
 *   return (
 *     <NavigationContainer>
 *       <AppProvider enableNavigation={false}>
 *         <RootNavigator />
 *       </AppProvider>
 *     </NavigationContainer>
 *   );
 * }
 * ```
 */
export function AppProvider({
  children,
  enableNavigation = true,
  enableOverlay = true,
  enableTheme = true,
  enableLogger = isDevelopment(),
  enableErrorBoundary = isDevelopment(),
  enableStatusBar = Platform.OS !== 'web',
  enableSafeArea = true,
  enableGestureHandlerRootView = true,
  lightTheme = defaultLightTheme,
  darkTheme = defaultDarkTheme,
  defaultDark = false,
  isDark,
  statusBarProps,
  motion,
  loggerProps,
  errorBoundaryProps,
  healthReporter,
  ...navigationProps
}: AppProviderProps) {
  // 从外到内套娃（外层包裹内层）
  // 正确的顺序: SafeArea → Theme → Navigation → Overlay
  // Overlay 在最内层，可以访问所有其他 Provider 的上下文
  // SafeArea 在最外层，确保所有内容都在安全区域内

  let content = children;

  // 1. Overlay (Loading/Toast/Alert/Logger) - 最内层
  // 需要访问 Navigation 和 Theme 上下文
  if (enableOverlay) {
    content = (
      <OverlayProvider
        loggerProps={
          enableLogger
            ? { enabled: true, overlayEnabled: true, healthReporter, ...loggerProps }
            : { enabled: false, overlayEnabled: false, healthReporter, ...loggerProps }
        }
        errorBoundaryProps={
          enableErrorBoundary
            ? { enabled: true, healthReporter, ...errorBoundaryProps }
            : { enabled: false, healthReporter, ...errorBoundaryProps }
        }
      >
        {content}
      </OverlayProvider>
    );
  } else {
    if (enableErrorBoundary) {
      content = (
        <AppErrorBoundary enabled healthReporter={healthReporter} {...errorBoundaryProps}>
          {content}
        </AppErrorBoundary>
      );
    }

    if (enableLogger) {
      content = (
        <LoggerProvider enabled overlayEnabled healthReporter={healthReporter} {...loggerProps}>
          {content}
        </LoggerProvider>
      );
    }
  }

  // 2. Navigation - 需要 Theme 上下文来创建导航主题
  if (enableNavigation) {
    content = <NavigationProvider {...navigationProps}>{content}</NavigationProvider>;
  }

  // 3. Theme - 需要被 SafeArea 包裹
  if (enableTheme) {
    content = (
      <ThemeProvider light={lightTheme} dark={darkTheme} defaultDark={defaultDark} isDark={isDark}>
        <>
          {enableStatusBar && <AppStatusBar testID="status-bar" {...statusBarProps} />}
          {content}
        </>
      </ThemeProvider>
    );
  }

  // Motion - 供 Overlay / UI / Navigation 内统一消费
  if (motion) {
    content = <MotionConfigProvider {...motion}>{content}</MotionConfigProvider>;
  }

  // 4. SafeArea - 外层
  if (enableSafeArea) {
    content = <SafeAreaProvider initialMetrics={initialWindowMetrics}>{content}</SafeAreaProvider>;
  }

  // 5. Gesture root - 最外层，保证 Drawer/Sheet 等手势在 Web/Native 都有根容器
  if (enableGestureHandlerRootView) {
    content = <GestureHandlerRootView style={{ flex: 1 }}>{content}</GestureHandlerRootView>;
  }

  return <>{content}</>;
}
