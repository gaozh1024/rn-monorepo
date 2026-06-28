import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export function flattenTabBarStyle(style?: StyleProp<ViewStyle>): ViewStyle | undefined {
  return StyleSheet.flatten(style) ?? undefined;
}

export function withoutTabBarHeight(style?: ViewStyle): ViewStyle | undefined {
  if (!style) {
    return undefined;
  }

  const { height: _height, ...rest } = style;
  return rest;
}
