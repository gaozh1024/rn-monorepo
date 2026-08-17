import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import Animated from 'react-native-reanimated';
import { createReanimatedView } from '../../motion/components/ReanimatedView';

describe('createReanimatedView', () => {
  it('应该直接使用 Reanimated.View，避免 NativeWind 包装普通 View', () => {
    vi.mocked(Animated.createAnimatedComponent).mockClear();

    const element = createReanimatedView({ testID: 'animated-surface' });

    expect(element.type).toBe(Animated.View);
    expect(element.props.testID).toBe('animated-surface');
    expect(Animated.createAnimatedComponent).not.toHaveBeenCalled();
  });
});
