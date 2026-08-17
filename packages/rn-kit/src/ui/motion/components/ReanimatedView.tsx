import React from 'react';
import Animated from 'react-native-reanimated';

type ReanimatedViewProps = React.ComponentProps<typeof Animated.View>;

export function createReanimatedView(props: ReanimatedViewProps, ...children: React.ReactNode[]) {
  return React.createElement(Animated.View, props, ...children);
}
