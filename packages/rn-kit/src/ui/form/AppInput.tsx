import { forwardRef, useMemo, useState, type ReactNode } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  Platform,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { AppPressable, AppView, AppText } from '@/ui/primitives';
import { useThemeColors } from '@/theme';
import { type CommonLayoutProps, type LayoutSurface } from '../utils/layout-shortcuts';
import { useOptionalTheme } from '@/theme';
import { resolveNamedColor, resolveSurfaceColor } from '../utils/theme-color';
import { Icon } from '../display/Icon';

/**
 * AppInput 组件属性接口
 */
export type AppInputVariant = 'outline' | 'filled' | 'soft' | 'surface';
export type AppInputSize = 'sm' | 'md' | 'lg';
export type AppInputVisualPreset = 'default' | 'soft-login' | 'surface';

export interface AppInputProps
  extends
    Omit<TextInputProps, 'editable'>,
    Pick<
      CommonLayoutProps,
      | 'flex'
      | 'm'
      | 'mx'
      | 'my'
      | 'mt'
      | 'mb'
      | 'ml'
      | 'mr'
      | 'w'
      | 'h'
      | 'minW'
      | 'minH'
      | 'maxW'
      | 'maxH'
      | 'rounded'
    > {
  /** 标签文本 */
  label?: string;
  /** 错误信息 */
  error?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 左侧图标 */
  leftIcon?: ReactNode;
  /** 右侧图标 */
  rightIcon?: ReactNode;
  /** 是否启用密码明文/密文切换（默认 false） */
  passwordToggle?: boolean;
  /** 启用密码切换时，初始是否明文展示（默认 false） */
  passwordVisibleDefault?: boolean;
  /** 密码切换图标配置（hidden=密文闭眼，visible=明文睁眼） */
  passwordToggleIcons?: {
    hidden?: ReactNode;
    visible?: ReactNode;
  };
  /** 密码可见状态切换回调 */
  onPasswordVisibleChange?: (visible: boolean) => void;
  /** 自定义样式 */
  className?: string;
  /** 背景颜色 */
  bg?: string;
  /** 语义化背景 */
  surface?: LayoutSurface;
  /** 输入容器样式 */
  containerStyle?: StyleProp<ViewStyle>;
  /** 输入框文本样式 */
  inputStyle?: StyleProp<TextStyle>;
  /** 聚焦时输入容器样式 */
  focusedContainerStyle?: StyleProp<ViewStyle>;
  /** 聚焦描边/光晕颜色 */
  focusRingColor?: string;
  /** 聚焦描边宽度 */
  focusRingWidth?: number;
  /** 聚焦背景色 */
  focusBackgroundColor?: string;
  /** 输入框视觉变体 */
  variant?: AppInputVariant;
  /** 输入框尺寸 */
  inputSize?: AppInputSize;
  /** 常用视觉预设 */
  visualPreset?: AppInputVisualPreset;
}

const CONTAINER_STYLE_KEYS = new Set<keyof ViewStyle>([
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'alignSelf',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'backgroundColor',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
]);

const webInputFocusReset =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none',
        outlineWidth: 0,
      } as unknown as TextStyle)
    : undefined;

const inputSizeStyles = {
  sm: { height: 40, paddingX: 10, fontSize: 14, paddingY: 8 },
  md: { height: 48, paddingX: 12, fontSize: 16, paddingY: 12 },
  lg: { height: 56, paddingX: 16, fontSize: 16, paddingY: 14 },
} as const satisfies Record<
  AppInputSize,
  { height: number; paddingX: number; fontSize: number; paddingY: number }
>;

const visualPresetDefaults = {
  default: {
    inputSize: 'md',
    rounded: 'lg',
    variant: 'outline',
  },
  'soft-login': {
    inputSize: 'lg',
    rounded: 'xl',
    variant: 'surface',
  },
  surface: {
    inputSize: 'md',
    rounded: 'xl',
    variant: 'surface',
  },
} as const satisfies Record<
  AppInputVisualPreset,
  {
    inputSize: AppInputSize;
    rounded: NonNullable<CommonLayoutProps['rounded']>;
    variant: AppInputVariant;
  }
>;

function splitInputStyles(style?: StyleProp<TextStyle>) {
  const flattened = StyleSheet.flatten(style) ?? {};
  const nextContainerStyle: ViewStyle = {};
  const nextInputStyle: TextStyle = {};

  Object.entries(flattened).forEach(([key, value]) => {
    if (value === undefined) return;

    if (CONTAINER_STYLE_KEYS.has(key as keyof ViewStyle)) {
      (nextContainerStyle as Record<string, unknown>)[key] = value;
      return;
    }

    (nextInputStyle as Record<string, unknown>)[key] = value;
  });

  return {
    containerStyle: nextContainerStyle,
    inputStyle: nextInputStyle,
  };
}

/**
 * AppInput - 输入框组件，支持浅色/深色主题
 */
export const AppInput = forwardRef<TextInput, AppInputProps>(
  (
    {
      flex,
      m,
      mx,
      my,
      mt,
      mb,
      ml,
      mr,
      w,
      h,
      minW,
      minH,
      maxW,
      maxH,
      rounded,
      label,
      error,
      disabled = false,
      leftIcon,
      rightIcon,
      passwordToggle = false,
      passwordVisibleDefault = false,
      passwordToggleIcons,
      onPasswordVisibleChange,
      className,
      bg,
      surface,
      style,
      containerStyle,
      inputStyle,
      focusedContainerStyle,
      focusRingColor,
      focusRingWidth,
      focusBackgroundColor,
      variant,
      inputSize,
      visualPreset = 'default',
      secureTextEntry,
      placeholderTextColor,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const colors = useThemeColors();
    const { theme, isDark } = useOptionalTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(passwordVisibleDefault);
    const resolvedStyles = useMemo(() => splitInputStyles(style), [style]);
    const preset = visualPresetDefaults[visualPreset];
    const resolvedVariant = variant ?? preset.variant;
    const resolvedInputSize = inputSize ?? preset.inputSize;
    const sizeStyle = inputSizeStyles[resolvedInputSize];
    const resolvedBgColor =
      resolveSurfaceColor(surface, theme, isDark) ?? resolveNamedColor(bg, theme, isDark);
    const resolvedFocusRingColor =
      resolveNamedColor(focusRingColor, theme, isDark) ?? focusRingColor ?? colors.primary;
    const resolvedFocusBackgroundColor =
      resolveNamedColor(focusBackgroundColor, theme, isDark) ?? focusBackgroundColor;
    const outlineColor =
      theme.colors.outline?.[500] ?? theme.colors.border?.[500] ?? (isDark ? '#4b5563' : '#d1d5db');
    const outlineVariantColor =
      theme.colors.outlineVariant?.[500] ??
      theme.colors.border?.[500] ??
      (isDark ? '#374151' : '#e5e7eb');
    const surfaceLowestColor =
      theme.colors.surfaceContainerLowest?.[500] ??
      theme.colors.card?.[500] ??
      (isDark ? '#1f2937' : '#ffffff');
    const surfaceLowColor =
      theme.colors.surfaceContainerLow?.[500] ?? (isDark ? '#111827' : '#f8fafc');
    const softBackgroundColor = isDark
      ? theme.colors.primary?.[950] || '#111827'
      : theme.colors.primary?.[50] || '#fff7ed';

    const errorColor = '#ef4444';

    // 边框颜色
    const getBorderColor = () => {
      if (error) return errorColor;
      if (isFocused) return resolvedFocusRingColor;
      if (resolvedVariant === 'outline') return outlineColor;
      return 'transparent';
    };

    const variantStyle: ViewStyle =
      resolvedVariant === 'filled'
        ? {
            backgroundColor: surfaceLowColor,
            borderColor: 'transparent',
          }
        : resolvedVariant === 'soft'
          ? {
              backgroundColor: softBackgroundColor,
              borderColor: 'transparent',
            }
          : resolvedVariant === 'surface'
            ? {
                backgroundColor: surfaceLowestColor,
                borderColor: 'transparent',
                borderWidth: 0,
                ...(isDark
                  ? {}
                  : {
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.06,
                      shadowRadius: 10,
                      elevation: 1,
                    }),
              }
            : {
                backgroundColor: colors.card,
              };
    const focusStyle: ViewStyle | undefined =
      isFocused && !error
        ? {
            borderColor: resolvedFocusRingColor,
            borderWidth: focusRingWidth ?? (resolvedVariant === 'surface' ? 0 : 1),
            backgroundColor: resolvedFocusBackgroundColor,
            shadowColor: resolvedFocusRingColor,
            shadowOpacity: focusRingWidth === 0 ? 0 : 0.12,
            shadowRadius: focusRingWidth === 0 ? 0 : 8,
            shadowOffset: { width: 0, height: 0 },
          }
        : undefined;
    const resolvedPlaceholderTextColor =
      placeholderTextColor ??
      (visualPreset === 'soft-login' ? outlineVariantColor : colors.textMuted);

    const shouldRenderPasswordToggle = passwordToggle;
    const computedSecureTextEntry = shouldRenderPasswordToggle
      ? !isPasswordVisible
      : secureTextEntry;
    const defaultPasswordIcon = shouldRenderPasswordToggle ? (
      <Icon
        name={isPasswordVisible ? 'visibility' : 'visibility-off'}
        size={20}
        color="gray-500"
        testID={props.testID ? `${props.testID}-password-toggle-icon` : undefined}
      />
    ) : null;
    const passwordToggleIcon = isPasswordVisible
      ? (passwordToggleIcons?.visible ?? defaultPasswordIcon)
      : (passwordToggleIcons?.hidden ?? defaultPasswordIcon);

    return (
      <AppView
        flex={flex}
        m={m}
        mx={mx}
        my={my}
        mt={mt}
        mb={mb}
        ml={ml}
        mr={mr}
        w={w}
        gap={4}
        className={className}
      >
        {label && (
          <AppText size="sm" weight="medium" style={{ color: colors.textSecondary }}>
            {label}
          </AppText>
        )}
        <AppView
          testID={props.testID ? `${props.testID}-container` : undefined}
          row
          items="center"
          px={sizeStyle.paddingX}
          h={h ?? sizeStyle.height}
          minW={minW}
          minH={minH}
          maxW={maxW}
          maxH={maxH}
          rounded={rounded ?? preset.rounded}
          style={[
            styles.inputContainer,
            variantStyle,
            resolvedBgColor ? { backgroundColor: resolvedBgColor } : undefined,
            resolvedStyles.containerStyle,
            containerStyle,
            {
              borderColor: getBorderColor(),
              opacity: disabled ? 0.6 : 1,
            },
            focusStyle,
            isFocused ? focusedContainerStyle : undefined,
            error ? { borderColor: errorColor } : undefined,
          ]}
        >
          {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            className=""
            style={[
              styles.input,
              webInputFocusReset,
              {
                color: colors.text,
                fontSize: sizeStyle.fontSize,
                paddingTop: sizeStyle.paddingY,
                paddingBottom: sizeStyle.paddingY,
              },
              resolvedStyles.inputStyle,
              inputStyle,
            ]}
            placeholderTextColor={resolvedPlaceholderTextColor}
            editable={!disabled}
            secureTextEntry={computedSecureTextEntry}
            onFocus={e => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={e => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {shouldRenderPasswordToggle ? (
            <AppPressable
              testID={props.testID ? `${props.testID}-password-toggle` : undefined}
              accessibilityRole="button"
              accessibilityLabel={isPasswordVisible ? '显示明文密码' : '显示密文密码'}
              onPress={() => {
                const nextVisible = !isPasswordVisible;
                setIsPasswordVisible(nextVisible);
                onPasswordVisibleChange?.(nextVisible);
              }}
              disabled={disabled}
              style={styles.passwordToggle}
              hitSlop={8}
            >
              {passwordToggleIcon}
            </AppPressable>
          ) : (
            rightIcon && <View style={styles.icon}>{rightIcon}</View>
          )}
        </AppView>
        {error && (
          <AppText size="xs" style={{ color: errorColor }}>
            {error}
          </AppText>
        )}
      </AppView>
    );
  }
);

AppInput.displayName = 'AppInput';
export const AppTextInput = AppInput;
AppTextInput.displayName = 'AppTextInput';

const styles = StyleSheet.create({
  inputContainer: {
    borderWidth: 0.5,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 0,
    paddingRight: 0,
    margin: 0,
    fontSize: 16,
  },
  icon: {
    marginHorizontal: 4,
  },
  passwordToggle: {
    marginLeft: 8,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
