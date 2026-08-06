import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/theme';
import { AppPressable, AppText, AppView } from '@/ui/primitives';
import type { PressMotionProps } from '@/ui/motion';
import {
  resolveRoundedStyle,
  type CommonLayoutProps,
  type LayoutRounded,
} from '../utils/layout-shortcuts';
import { Icon, type IconName } from './Icon';

export interface SettingsListItem {
  key: string;
  title: string;
  description?: string;
  icon?: IconName | ReactNode;
  iconColor?: string;
  iconBackgroundColor?: string;
  value?: string;
  right?: ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export interface SettingsListProps
  extends
    Pick<CommonLayoutProps, 'm' | 'mx' | 'my' | 'mt' | 'mb' | 'ml' | 'mr' | 'w' | 'minW' | 'maxW'>,
    PressMotionProps {
  title?: string;
  items: readonly SettingsListItem[];
  rounded?: LayoutRounded;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  listStyle?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
  dividerStyle?: StyleProp<ViewStyle>;
}

interface SettingsListRowProps {
  item: SettingsListItem;
  itemStyle?: StyleProp<ViewStyle>;
  motionDuration?: number;
  motionPreset?: PressMotionProps['motionPreset'];
  motionReduceMotion?: boolean;
}

function SettingsListRow({
  item,
  itemStyle,
  motionDuration,
  motionPreset,
  motionReduceMotion,
}: SettingsListRowProps) {
  const colors = useThemeColors();
  const isInteractive = !!item.onPress;
  const shouldShowChevron =
    item.showChevron ?? (item.right === undefined && isInteractive && !item.destructive);
  const titleColor = item.destructive ? colors.error : colors.text;
  const iconColor = item.iconColor ?? (item.destructive ? colors.error : colors.iconMuted);
  const rowStyle = [styles.row, { opacity: item.disabled ? 0.5 : 1 }, itemStyle, item.style];
  const rowContent = (
    <>
      {item.icon ? (
        <AppView
          center
          style={[
            styles.iconContainer,
            { backgroundColor: item.iconBackgroundColor ?? colors.surfaceContainerLow },
          ]}
        >
          {typeof item.icon === 'string' ? (
            <Icon name={item.icon} size={20} color={iconColor} />
          ) : (
            item.icon
          )}
        </AppView>
      ) : null}

      <AppView flex style={styles.content}>
        <AppText numberOfLines={1} weight="medium" style={[styles.title, { color: titleColor }]}>
          {item.title}
        </AppText>
        {item.description ? (
          <AppText
            numberOfLines={1}
            size="sm"
            style={[styles.description, { color: colors.textMuted }]}
          >
            {item.description}
          </AppText>
        ) : null}
      </AppView>

      {item.right ??
        (item.value ? (
          <AppText numberOfLines={1} size="sm" style={[styles.value, { color: colors.textMuted }]}>
            {item.value}
          </AppText>
        ) : null)}

      {shouldShowChevron ? (
        <Icon
          testID={`settings-list-chevron-${item.key}`}
          name="arrow-forward-ios"
          size={16}
          color={colors.iconMuted}
          style={styles.chevron}
        />
      ) : null}
    </>
  );

  if (!isInteractive) {
    return (
      <AppView testID={`settings-list-item-${item.key}`} row items="center" style={rowStyle}>
        {rowContent}
      </AppView>
    );
  }

  return (
    <AppPressable
      testID={`settings-list-item-${item.key}`}
      accessibilityRole="button"
      disabled={item.disabled}
      row
      items="center"
      onPress={item.onPress}
      style={rowStyle}
      motionPreset={motionPreset}
      motionDuration={motionDuration}
      motionReduceMotion={motionReduceMotion}
    >
      {rowContent}
    </AppPressable>
  );
}

/**
 * SettingsList - grouped, pressable settings rows for account and preference screens.
 */
export function SettingsList({
  title,
  items,
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
  titleStyle,
  listStyle,
  itemStyle,
  dividerStyle,
  motionPreset,
  motionDuration,
  motionReduceMotion,
}: SettingsListProps) {
  const colors = useThemeColors();

  return (
    <AppView
      m={m}
      mx={mx}
      my={my}
      mt={mt}
      mb={mb}
      ml={ml}
      mr={mr}
      w={w}
      minW={minW}
      maxW={maxW}
      style={style}
    >
      {title ? (
        <AppText
          size="sm"
          weight="medium"
          style={[styles.sectionTitle, { color: colors.textSecondary }, titleStyle]}
        >
          {title}
        </AppText>
      ) : null}

      <AppView
        testID="settings-list"
        style={[
          styles.list,
          {
            backgroundColor: colors.card,
            borderColor: colors.divider,
          },
          resolveRoundedStyle(rounded),
          listStyle,
        ]}
      >
        {items.map((item, index) => (
          <AppView key={item.key}>
            <SettingsListRow
              item={item}
              itemStyle={itemStyle}
              motionPreset={motionPreset}
              motionDuration={motionDuration}
              motionReduceMotion={motionReduceMotion}
            />
            {index < items.length - 1 ? (
              <AppView
                testID={`settings-list-divider-${item.key}`}
                style={[styles.divider, { backgroundColor: colors.divider }, dividerStyle]}
              />
            ) : null}
          </AppView>
        ))}
      </AppView>
    </AppView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 8,
  },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 12,
  },
  content: {
    minWidth: 0,
  },
  title: {
    lineHeight: 20,
  },
  description: {
    marginTop: 2,
    lineHeight: 18,
  },
  value: {
    flexShrink: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
  chevron: {
    marginLeft: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
    marginRight: 16,
  },
});
