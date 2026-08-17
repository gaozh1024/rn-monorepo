import React from 'react';
import Animated from 'react-native-reanimated';
import { createReanimatedView } from './ReanimatedView';

type PresenceSurfaceProps = React.ComponentProps<typeof Animated.View>;

export function PresenceSurface(props: PresenceSurfaceProps) {
  return createReanimatedView(props);
}
