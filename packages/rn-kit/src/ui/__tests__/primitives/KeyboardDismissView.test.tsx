import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, create } from 'react-test-renderer';
import { Keyboard, Platform, TouchableWithoutFeedback } from 'react-native';
import { KeyboardDismissView } from '@/ui/primitives';
import { AppText } from '@/ui/primitives';

const originalPlatformOS = Platform.OS;

describe('KeyboardDismissView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Platform as any).OS = originalPlatformOS;
  });

  it('Native 启用时不应注入全屏点击收键盘包装', () => {
    (Platform as any).OS = 'ios';
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <KeyboardDismissView>
          <AppText>内容</AppText>
        </KeyboardDismissView>
      );
    });

    expect(renderer!.root.findAllByType(TouchableWithoutFeedback)).toHaveLength(0);
    expect(Keyboard.dismiss).not.toHaveBeenCalled();
  });

  it('Web 启用时点击空白区域应该收起键盘', () => {
    (Platform as any).OS = 'web';
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <KeyboardDismissView>
          <AppText>内容</AppText>
        </KeyboardDismissView>
      );
    });

    const dismissWrapper = renderer!.root.findByType(TouchableWithoutFeedback);

    act(() => {
      dismissWrapper.props.onPress({ target: { tagName: 'div', closest: vi.fn(() => null) } });
    });

    expect(Keyboard.dismiss).toHaveBeenCalled();
  });

  it('禁用时不应包裹点击收键盘逻辑', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <KeyboardDismissView enabled={false}>
          <AppText>内容</AppText>
        </KeyboardDismissView>
      );
    });

    expect(renderer!.root.findAllByType(TouchableWithoutFeedback)).toHaveLength(0);
  });
});
