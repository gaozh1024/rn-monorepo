/**
 * 导航模块
 *
 * @module navigation
 * @description 基于 React Navigation 的导航解决方案
 *
 * 本模块提供完整的导航功能，包括：
 * - 导航提供者（NavigationProvider）
 * - 堆栈导航器（StackNavigator）
 * - 标签导航器（TabNavigator）
 * - 抽屉导航器（DrawerNavigator）
 * - 导航 Hooks（useStackNavigation、useRoute 等）
 * - 导航组件（AppHeader、BottomTabBar、DrawerContent）
 * - 工具函数（createNavigationTheme）
 *
 * @example
 * ```tsx
 * // App.tsx
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
 * // navigation/index.tsx
 * import { StackNavigator, NavigationProvider } from '@gaozh1024/rn-kit';
 * import { HomeScreen, DetailScreen } from './screens';
 *
 * export function RootNavigator() {
 *   return (
 *     <StackNavigator initialRouteName="Home">
 *       <StackNavigator.Screen name="Home" component={HomeScreen} />
 *       <StackNavigator.Screen name="Detail" component={DetailScreen} />
 *     </StackNavigator>
 *   );
 * }
 * ```
 */

// ============================================================================
// Provider
// ============================================================================

export { NavigationProvider } from './provider';
export type { NavigationProviderProps } from './provider';

// ============================================================================
// Navigators
// ============================================================================

export { DEFAULT_BOTTOM_TAB_BAR_HEIGHT } from './constants';

export {
  // 导航器组件
  StackNavigator,
  TabNavigator,
  DrawerNavigator,
  // 辅助函数
  createStackScreens,
  createTabScreens,
  createDrawerScreens,
} from './navigators';

export type {
  // 导航器 Props
  StackNavigatorProps,
  TabNavigatorProps,
  DrawerNavigatorProps,
  // React Navigation 原始类型
  NativeStackScreenProps,
  BottomTabScreenProps,
  NativeDrawerScreenProps,
} from './navigators';

// ============================================================================
// Components
// ============================================================================

export { AppHeader } from './components/AppHeader';
export type { AppHeaderProps } from './components/AppHeader';

export { BottomTabBar } from './components/BottomTabBar';
export type { CustomBottomTabBarProps } from './components/BottomTabBar';

export { DrawerContent } from './components/DrawerContent';
export type { DrawerContentProps, DrawerItem } from './components/DrawerContent';

// ============================================================================
// Hooks
// ============================================================================

export {
  // 导航 Hooks
  useNavigation,
  useStackNavigation,
  useTabNavigation,
  useDrawerNavigation,
  // 路由 Hooks
  useRoute,
  useNavigationState,
  useBackHandler,
  useBottomTabBarMetrics,
  // React Navigation 官方 Hooks
  useIsFocused,
  useFocusEffect,
  useScrollToTop,
  // 类型导出
  type NativeStackNavigationProp,
  type BottomTabNavigationProp,
  type DrawerNavigationProp,
  type RouteProp,
  type NavigationProp,
  type BottomTabBarMetrics,
  type UseBottomTabBarMetricsOptions,
} from './hooks';

// ============================================================================
// Types
// ============================================================================

export type {
  // 参数列表
  StackParamList,
  TabParamList,
  DrawerParamList,
  ParamListBase,
  // 路由配置
  RouteConfig,
  StackRouteConfig,
  TabRouteConfig,
  DrawerRouteConfig,
  // 屏幕选项
  StackScreenOptions,
  TabScreenOptions,
  TabBarOptions,
  DrawerScreenOptions,
  DrawerOptions,
  // 屏幕 Props
  StackScreenProps,
  TabScreenProps,
  DrawerScreenProps,
  // 导航类型
  StackNavigation,
  TabNavigation,
  DrawerNavigation,
  AppNavigation,
  // 深度链接
  LinkingConfig,
  PathConfig,
} from './types';

// ============================================================================
// Utils
// ============================================================================

export { createNavigationTheme } from './utils/navigation-theme';

// ============================================================================
// Re-exports from @react-navigation/native
// ============================================================================

export {
  // 导航器工具
  NavigationContainer,
  // 类型
  type NavigationState,
  type NavigationContainerRef,
} from '@react-navigation/native';
