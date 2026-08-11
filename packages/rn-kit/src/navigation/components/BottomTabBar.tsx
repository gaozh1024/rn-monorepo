import { View, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useThemeColors } from '@/theme';
import { AppText, AppPressable, useMotionConfig } from '@/ui';
import { Presence } from '@/ui/motion';
import type { PresencePreset, PressMotionPreset, PressMotionProps } from '@/ui/motion';
import { DEFAULT_BOTTOM_TAB_BAR_HEIGHT } from '../constants';
import { useBottomTabBarMetrics } from '../hooks/useBottomTabBarMetrics';
import { flattenTabBarStyle, withoutTabBarHeight } from '../utils/tab-bar-style';

/**
 * 自定义底部标签栏组件 Props
 * 继承自 @react-navigation/bottom-tabs 的 BottomTabBarProps
 */
export interface CustomBottomTabBarProps extends BottomTabBarProps, PressMotionProps {
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 激活颜色 */
  activeTintColor?: string;
  /** 未激活颜色 */
  inactiveTintColor?: string;
  /** TabBar 高度（默认 65） */
  height?: number;
  /** 激活背景色 */
  activeBackgroundColor?: string;
  /** 非激活背景色 */
  inactiveBackgroundColor?: string;
  /** 图标容器样式 */
  iconStyle?: ViewStyle;
  /** 标签样式 */
  labelStyle?: TextStyle;
  /** 标签栏样式。高度请使用 height 属性配置，style.height 会被忽略。 */
  style?: StyleProp<ViewStyle>;
  /** 是否显示激活态指示器 */
  showActiveIndicator?: boolean;
  /** 激活态指示器颜色 */
  indicatorColor?: string;
  /** 激活态指示器高度 */
  indicatorHeight?: number;
  /** 激活态指示器显隐动画预设 */
  indicatorMotionPreset?: PresencePreset;
  /** 激活态指示器显隐动画时长 */
  indicatorMotionDuration?: number;
  /** 激活态指示器进入动画时长 */
  indicatorMotionEnterDuration?: number;
  /** 激活态指示器退出动画时长 */
  indicatorMotionExitDuration?: number;
  /** 激活态指示器动画距离 */
  indicatorMotionDistance?: number;
  /** 是否关闭激活态指示器动画 */
  indicatorMotionReduceMotion?: boolean;
}

interface BottomTabBarItemProps {
  activeBackgroundColor?: string;
  activeColor: string;
  accessibilityLabel?: string;
  badge: unknown;
  iconStyle?: ViewStyle;
  iconNode: any;
  inactiveBackgroundColor?: string;
  inactiveColor: string;
  indicatorColor: string;
  indicatorHeight: number;
  indicatorMotionDistance?: number;
  indicatorMotionDuration?: number;
  indicatorMotionEnterDuration?: number;
  indicatorMotionExitDuration?: number;
  indicatorMotionPreset?: PresencePreset;
  indicatorMotionReduceMotion?: boolean;
  isFocused: boolean;
  label: string;
  labelStyle?: TextStyle;
  motionPreset: PressMotionPreset;
  motionDuration?: number;
  motionReduceMotion?: boolean;
  onLongPress: () => void;
  onPress: () => void;
  showLabel: boolean;
  showActiveIndicator: boolean;
  testID?: string;
}

function BottomTabBarItem({
  activeBackgroundColor,
  activeColor,
  accessibilityLabel,
  badge,
  iconStyle,
  iconNode,
  inactiveBackgroundColor,
  inactiveColor,
  indicatorColor,
  indicatorHeight,
  indicatorMotionDistance,
  indicatorMotionDuration,
  indicatorMotionEnterDuration,
  indicatorMotionExitDuration,
  indicatorMotionPreset,
  indicatorMotionReduceMotion,
  isFocused,
  label,
  labelStyle,
  motionPreset,
  motionDuration,
  motionReduceMotion,
  onLongPress,
  onPress,
  showLabel,
  showActiveIndicator,
  testID,
}: BottomTabBarItemProps) {
  const badgeContent = typeof badge === 'number' && badge > 99 ? '99+' : (badge as any);

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      motionPreset={motionPreset}
      motionDuration={motionDuration}
      motionReduceMotion={motionReduceMotion}
      style={[
        styles.tab,
        {
          backgroundColor: isFocused ? activeBackgroundColor : inactiveBackgroundColor,
        },
      ]}
    >
      {showActiveIndicator && (
        <Presence
          visible={isFocused}
          preset={indicatorMotionPreset ?? 'scaleFade'}
          motionDuration={indicatorMotionDuration}
          motionEnterDuration={indicatorMotionEnterDuration}
          motionExitDuration={indicatorMotionExitDuration}
          motionDistance={indicatorMotionDistance}
          motionReduceMotion={indicatorMotionReduceMotion}
        >
          <View
            testID={testID ? `${testID}-indicator` : undefined}
            style={[
              styles.indicator,
              {
                backgroundColor: indicatorColor,
                height: indicatorHeight,
              },
            ]}
          />
        </Presence>
      )}

      <View style={[styles.iconContainer, iconStyle]}>
        {iconNode}
        {badge != null && (
          <View style={[styles.badge, { backgroundColor: activeColor }]}>
            <AppText style={styles.badgeText}>{badgeContent}</AppText>
          </View>
        )}
      </View>
      {showLabel && (
        <AppText
          style={[styles.label, { color: isFocused ? activeColor : inactiveColor }, labelStyle]}
          numberOfLines={1}
        >
          {label}
        </AppText>
      )}
    </AppPressable>
  );
}

/**
 * 自定义底部标签栏组件
 *
 * 自定义样式的底部标签栏，支持徽标、图标、标签等
 *
 * @example
 * ```tsx
 * <TabNavigator
 *   tabBar={props => <BottomTabBar {...props} showLabel={true} activeTintColor="#f38b32" />}
 * >
 *   <TabNavigator.Screen name="Home" component={HomeScreen} />
 *   <TabNavigator.Screen name="Profile" component={ProfileScreen} />
 * </TabNavigator>
 * ```
 */
export function BottomTabBar({
  state,
  descriptors,
  navigation,
  insets,
  showLabel = true,
  activeTintColor,
  inactiveTintColor,
  height = DEFAULT_BOTTOM_TAB_BAR_HEIGHT,
  activeBackgroundColor,
  inactiveBackgroundColor,
  iconStyle,
  labelStyle,
  style,
  motionPreset,
  motionDuration,
  motionReduceMotion,
  showActiveIndicator = false,
  indicatorColor,
  indicatorHeight = 3,
  indicatorMotionPreset,
  indicatorMotionDuration,
  indicatorMotionEnterDuration,
  indicatorMotionExitDuration,
  indicatorMotionDistance,
  indicatorMotionReduceMotion,
}: CustomBottomTabBarProps) {
  const motionConfig = useMotionConfig();
  const colors = useThemeColors();
  const metrics = useBottomTabBarMetrics({ height, safeAreaBottom: insets?.bottom });
  const resolvedMotionPreset = motionPreset ?? motionConfig.defaultPressPreset ?? 'soft';
  const flattenedStyle = flattenTabBarStyle(style);
  const safeStyle = withoutTabBarHeight(flattenedStyle);

  const activeColor = activeTintColor || colors.primary;
  const inactiveColor = inactiveTintColor || colors.textMuted;
  const backgroundColor = flattenedStyle?.backgroundColor || colors.card;
  const borderTopColor = colors.divider;
  const resolvedIndicatorColor = indicatorColor || activeColor;

  return (
    <View
      testID="bottom-tab-bar"
      style={[
        styles.container,
        { borderTopColor },
        { backgroundColor, height: metrics.totalHeight },
        safeStyle,
      ]}
    >
      <View
        testID="bottom-tab-bar-content"
        style={[styles.content, { height: metrics.contentHeight }]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // 获取标签和图标
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const iconName = options.tabBarIcon
            ? (options.tabBarIcon as Function)({
                focused: isFocused,
                color: isFocused ? activeColor : inactiveColor,
                size: 24,
              })
            : null;

          // 徽标
          const badge = options.tabBarBadge;

          return (
            <BottomTabBarItem
              key={route.key}
              testID={(options as any).tabBarTestID}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              motionPreset={resolvedMotionPreset}
              activeBackgroundColor={activeBackgroundColor}
              inactiveBackgroundColor={inactiveBackgroundColor}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              iconNode={iconName}
              iconStyle={iconStyle}
              badge={badge}
              isFocused={isFocused}
              label={label as string}
              labelStyle={labelStyle}
              showLabel={showLabel}
              showActiveIndicator={showActiveIndicator}
              indicatorColor={resolvedIndicatorColor}
              indicatorHeight={indicatorHeight}
              indicatorMotionPreset={indicatorMotionPreset}
              indicatorMotionDuration={indicatorMotionDuration}
              indicatorMotionEnterDuration={indicatorMotionEnterDuration}
              indicatorMotionExitDuration={indicatorMotionExitDuration}
              indicatorMotionDistance={indicatorMotionDistance}
              indicatorMotionReduceMotion={indicatorMotionReduceMotion}
              motionDuration={motionDuration}
              motionReduceMotion={motionReduceMotion}
            />
          );
        })}
      </View>
      {metrics.safeAreaBottom > 0 && (
        <View testID="bottom-tab-bar-safe-area" style={{ height: metrics.safeAreaBottom }} />
      )}
    </View>
  );
}

/** 组件样式 */
const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    borderTopWidth: 0.5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  content: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    width: 24,
    borderRadius: 999,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
});
