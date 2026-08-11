/**
 * 标签导航器组件
 *
 * @module navigation/navigators/TabNavigator
 * @description 基于 @react-navigation/bottom-tabs 的标签导航器封装
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '../components/BottomTabBar';
import { useBottomTabBarMetrics } from '../hooks/useBottomTabBarMetrics';
import type { TabParamList, TabNavigatorProps, TabRouteConfig } from '../types';
import { flattenTabBarStyle, withoutTabBarHeight } from '../utils/tab-bar-style';

const NativeTab = createBottomTabNavigator<TabParamList>();

/** 默认屏幕选项 */
const defaultScreenOptions = {
  headerShown: false,
  tabBarShowLabel: true,
};

/**
 * 标签导航器组件
 *
 * 封装 React Navigation 的 Bottom Tab Navigator
 *
 * @example
 * ```tsx
 * // JSX 方式
 * <TabNavigator
 *   initialRouteName="Home"
 *   tabBarOptions={{ activeTintColor: '#f38b32' }}
 * >
 *   <TabNavigator.Screen
 *     name="Home"
 *     component={HomeScreen}
 *     options={{
 *       tabBarLabel: '首页',
 *       tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} />
 *     }}
 *   />
 *   <TabNavigator.Screen
 *     name="Profile"
 *     component={ProfileScreen}
 *     options={{ tabBarLabel: '我的' }}
 *   />
 * </TabNavigator>
 * ```
 */
export function TabNavigator({
  initialRouteName,
  tabBarOptions,
  tabBar,
  screenOptions,
  children,
}: TabNavigatorProps) {
  const tabBarMetrics = useBottomTabBarMetrics({ height: tabBarOptions?.height });

  // 合并标签栏选项到屏幕选项
  const mergedScreenOptions = React.useMemo(() => {
    const options: any = { ...defaultScreenOptions, ...screenOptions };

    if (tabBarOptions) {
      if (tabBarOptions.showLabel !== undefined) {
        options.tabBarShowLabel = tabBarOptions.showLabel;
      }
      if (tabBarOptions.activeTintColor) {
        options.tabBarActiveTintColor = tabBarOptions.activeTintColor;
      }
      if (tabBarOptions.inactiveTintColor) {
        options.tabBarInactiveTintColor = tabBarOptions.inactiveTintColor;
      }
      if (tabBarOptions.activeBackgroundColor) {
        options.tabBarActiveBackgroundColor = tabBarOptions.activeBackgroundColor;
      }
      if (tabBarOptions.inactiveBackgroundColor) {
        options.tabBarInactiveBackgroundColor = tabBarOptions.inactiveBackgroundColor;
      }
      if (tabBarOptions.hideOnKeyboard !== undefined) {
        options.tabBarHideOnKeyboard = tabBarOptions.hideOnKeyboard;
      }
      if (tabBarOptions.labelPosition) {
        options.tabBarLabelPosition = tabBarOptions.labelPosition;
      }
      if (tabBarOptions.labelStyle) {
        options.tabBarLabelStyle = tabBarOptions.labelStyle;
      }
      if (tabBarOptions.style) {
        options.tabBarStyle = withoutTabBarHeight(flattenTabBarStyle(tabBarOptions.style));
      }
    }

    if (!tabBar) {
      const resolvedTabBarStyle = withoutTabBarHeight(flattenTabBarStyle(options.tabBarStyle));
      options.tabBarStyle = {
        ...(resolvedTabBarStyle ?? {}),
        height: tabBarMetrics.totalHeight,
      };
    }

    return options;
  }, [tabBar, tabBarMetrics.totalHeight, tabBarOptions, screenOptions]);

  const resolvedTabBar = React.useMemo(() => {
    if (tabBar) return tabBar;

    return (props: Parameters<typeof BottomTabBar>[0]) => (
      <BottomTabBar
        {...props}
        showLabel={tabBarOptions?.showLabel}
        showActiveIndicator={tabBarOptions?.showActiveIndicator}
        activeTintColor={tabBarOptions?.activeTintColor}
        inactiveTintColor={tabBarOptions?.inactiveTintColor}
        activeBackgroundColor={tabBarOptions?.activeBackgroundColor}
        inactiveBackgroundColor={tabBarOptions?.inactiveBackgroundColor}
        iconStyle={tabBarOptions?.iconStyle}
        indicatorColor={tabBarOptions?.indicatorColor}
        indicatorHeight={tabBarOptions?.indicatorHeight}
        labelStyle={tabBarOptions?.labelStyle}
        style={tabBarOptions?.style}
        height={tabBarOptions?.height}
      />
    );
  }, [
    tabBar,
    tabBarOptions?.showLabel,
    tabBarOptions?.showActiveIndicator,
    tabBarOptions?.activeTintColor,
    tabBarOptions?.inactiveTintColor,
    tabBarOptions?.activeBackgroundColor,
    tabBarOptions?.inactiveBackgroundColor,
    tabBarOptions?.iconStyle,
    tabBarOptions?.indicatorColor,
    tabBarOptions?.indicatorHeight,
    tabBarOptions?.labelStyle,
    tabBarOptions?.style,
    tabBarOptions?.height,
  ]);

  return (
    <NativeTab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={mergedScreenOptions}
      tabBar={resolvedTabBar}
    >
      {children}
    </NativeTab.Navigator>
  );
}

/**
 * 标签屏幕组件
 * 直接使用原生 Screen 以确保 React Navigation v7 兼容性
 */
TabNavigator.Screen = NativeTab.Screen;

/**
 * 基于配置创建标签屏幕
 *
 * @example
 * ```tsx
 * const tabConfig: TabRouteConfig[] = [
 *   {
 *     name: 'Home',
 *     component: HomeScreen,
 *     options: { tabBarLabel: '首页', tabBarIcon: HomeIcon }
 *   },
 *   {
 *     name: 'Profile',
 *     component: ProfileScreen,
 *     options: { tabBarLabel: '我的' }
 *   },
 * ];
 *
 * <TabNavigator>
 *   {createTabScreens(tabConfig)}
 * </TabNavigator>
 * ```
 */
export function createTabScreens(routes: TabRouteConfig[]): React.ReactNode[] {
  return routes.map(route => (
    <TabNavigator.Screen
      key={route.name}
      name={route.name as keyof TabParamList}
      component={route.component}
      options={route.options}
      initialParams={route.initialParams}
    />
  ));
}
