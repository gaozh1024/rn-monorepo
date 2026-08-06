import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/theme';
import { useMotionConfig, type PressMotionProps } from '@/ui/motion';
import { AppPressable, AppText, AppView } from '@/ui/primitives';
import {
  resolveRoundedStyle,
  resolveSizingStyle,
  resolveSpacingStyle,
  type CommonLayoutProps,
  type LayoutRounded,
} from '../utils/layout-shortcuts';
import { Icon, type IconName } from './Icon';

export type QuickActionGridColumns = 2 | 3 | 4;

export interface QuickActionItem {
  key: string;
  label: string;
  icon: IconName | ReactNode;
  iconColor?: string;
  iconBackgroundColor?: string;
  badge?: string | number;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  iconContainerStyle?: StyleProp<ViewStyle>;
}

export interface QuickActionGridProps
  extends
    Pick<CommonLayoutProps, 'm' | 'mx' | 'my' | 'mt' | 'mb' | 'ml' | 'mr' | 'w' | 'minW' | 'maxW'>,
    PressMotionProps {
  items: readonly QuickActionItem[];
  columns?: QuickActionGridColumns;
  rounded?: LayoutRounded;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  iconContainerStyle?: StyleProp<ViewStyle>;
}

function getItemWidth(columns: QuickActionGridColumns) {
  return `${100 / columns}%` as const;
}

interface QuickActionGridItemProps {
  item: QuickActionItem;
  width: ReturnType<typeof getItemWidth>;
  itemStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  iconContainerStyle?: StyleProp<ViewStyle>;
  motionPreset?: PressMotionProps['motionPreset'];
  motionDuration?: number;
  motionReduceMotion?: boolean;
}

function QuickActionGridItem({
  item,
  width,
  itemStyle,
  labelStyle,
  iconContainerStyle,
  motionPreset,
  motionDuration,
  motionReduceMotion,
}: QuickActionGridItemProps) {
  const colors = useThemeColors();
  const isInteractive = !!item.onPress;
  const actionStyle = [
    styles.item,
    { width, opacity: item.disabled ? 0.5 : 1 },
    itemStyle,
    item.style,
  ];
  const iconColor = item.iconColor ?? colors.iconMuted;
  const iconBackgroundColor = item.iconBackgroundColor ?? colors.surfaceContainerLow;
  const content = (
    <>
      <AppView
        center
        style={[
          styles.iconContainer,
          { backgroundColor: iconBackgroundColor },
          iconContainerStyle,
          item.iconContainerStyle,
        ]}
      >
        {typeof item.icon === 'string' ? (
          <Icon
            testID={`quick-action-grid-icon-${item.key}`}
            name={item.icon}
            size={22}
            color={iconColor}
          />
        ) : (
          item.icon
        )}

        {item.badge !== undefined ? (
          <AppView
            center
            testID={`quick-action-grid-badge-${item.key}`}
            style={[styles.badge, { backgroundColor: colors.error }]}
          >
            <AppText size="xs" weight="bold" style={[styles.badgeText, { color: '#fff' }]}>
              {String(item.badge)}
            </AppText>
          </AppView>
        ) : null}
      </AppView>

      <AppText
        numberOfLines={1}
        size="xs"
        weight="medium"
        style={[styles.label, { color: colors.text }, labelStyle, item.labelStyle]}
      >
        {item.label}
      </AppText>
    </>
  );

  if (!isInteractive) {
    return (
      <AppView
        center
        testID={`quick-action-grid-item-${item.key}`}
        style={actionStyle}
        accessibilityLabel={item.accessibilityLabel ?? item.label}
      >
        {content}
      </AppView>
    );
  }

  return (
    <AppPressable
      center
      testID={`quick-action-grid-item-${item.key}`}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel ?? item.label}
      disabled={item.disabled}
      onPress={item.onPress}
      style={actionStyle}
      motionPreset={motionPreset}
      motionDuration={motionDuration}
      motionReduceMotion={motionReduceMotion}
    >
      {content}
    </AppPressable>
  );
}

/**
 * QuickActionGrid - compact icon shortcuts for profile, dashboard and settings screens.
 */
export function QuickActionGrid({
  items,
  columns = 4,
  rounded = 'xl',
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  w,
  minW,
  maxW,
  style,
  itemStyle,
  labelStyle,
  iconContainerStyle,
  motionPreset,
  motionDuration,
  motionReduceMotion,
}: QuickActionGridProps) {
  const colors = useThemeColors();
  const motionConfig = useMotionConfig();
  const width = getItemWidth(columns);
  const resolvedMotionPreset = motionPreset ?? motionConfig.defaultPressPreset ?? 'soft';

  return (
    <AppView
      testID="quick-action-grid"
      row
      wrap
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.divider,
        },
        resolveRoundedStyle(rounded),
        resolveSpacingStyle({ m, mx, my, mt, mb, ml, mr }),
        resolveSizingStyle({ w, minW, maxW }),
        style,
      ]}
    >
      {items.map(item => (
        <QuickActionGridItem
          key={item.key}
          item={item}
          width={width}
          itemStyle={itemStyle}
          labelStyle={labelStyle}
          iconContainerStyle={iconContainerStyle}
          motionPreset={resolvedMotionPreset}
          motionDuration={motionDuration}
          motionReduceMotion={motionReduceMotion}
        />
      ))}
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  item: {
    minHeight: 66,
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    position: 'absolute',
    top: -3,
    right: -3,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  label: {
    lineHeight: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});
