import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { StackNavigationOptions } from '@react-navigation/stack';

/**
 * 屏幕选项类型
 * @module navigation/types/screens
 */

/**
 * 屏幕选项配置 - 堆栈
 *
 * 直接复用 React Navigation 的官方类型，确保动画与转场配置可以完整透传。
 */
export type StackScreenOptions = StackNavigationOptions;

/**
 * 屏幕选项配置 - 标签
 */
export interface TabScreenOptions {
  /** 标签标题 */
  title?: string;
  /** 标签栏标签 */
  tabBarLabel?: string | ((props: { focused: boolean; color: string }) => React.ReactNode);
  /** 标签栏图标 */
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  /** 是否显示标签栏 */
  tabBarVisible?: boolean;
  /** 是否支持滑动切换 */
  swipeEnabled?: boolean;
}

/**
 * 标签栏配置
 */
export interface TabBarOptions {
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 是否显示激活态横条指示器 */
  showActiveIndicator?: boolean;
  /** 激活状态颜色 */
  activeTintColor?: string;
  /** 非激活状态颜色 */
  inactiveTintColor?: string;
  /** 激活背景色 */
  activeBackgroundColor?: string;
  /** 非激活背景色 */
  inactiveBackgroundColor?: string;
  /** 键盘弹出时是否隐藏 */
  hideOnKeyboard?: boolean;
  /** 标签位置 */
  labelPosition?: 'below-icon' | 'beside-icon';
  /** 标签样式 */
  labelStyle?: TextStyle;
  /** 图标样式 */
  iconStyle?: ViewStyle;
  /** 激活态指示器颜色 */
  indicatorColor?: string;
  /** 激活态指示器高度 */
  indicatorHeight?: number;
  /** 标签栏样式。高度请使用 height 配置，style.height 会被 BottomTabBar 忽略。 */
  style?: StyleProp<ViewStyle>;
  /** 标签栏高度（不含底部安全区，默认 65） */
  height?: number;
}

/**
 * 屏幕选项配置 - 抽屉
 */
export interface DrawerScreenOptions {
  /** 标题 */
  title?: string;
  /** 是否显示头部 */
  headerShown?: boolean;
  /** 抽屉标签 */
  drawerLabel?: string | ((props: { focused: boolean; color: string }) => React.ReactNode);
  /** 抽屉图标 */
  drawerIcon?: (props: { focused: boolean; size: number; color: string }) => React.ReactNode;
  /** 激活状态颜色 */
  drawerActiveTintColor?: string;
  /** 非激活状态颜色 */
  drawerInactiveTintColor?: string;
  /** 激活背景色 */
  drawerActiveBackgroundColor?: string;
  /** 非激活背景色 */
  drawerInactiveBackgroundColor?: string;
}

/**
 * 抽屉配置
 */
export interface DrawerOptions {
  /** 抽屉类型 */
  drawerType?: 'front' | 'back' | 'slide' | 'permanent';
  /** 抽屉宽度 */
  drawerWidth?: number;
  /** 遮罩层颜色 */
  overlayColor?: string;
  /** 是否支持边缘滑动打开 */
  edgeWidth?: number;
  /** 最小滑动距离 */
  minSwipeDistance?: number;
  /** 隐藏状态下是否响应手势 */
  gestureHandlerProps?: object;
}
