import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { AlertModal } from '../alert/component';
import { flattenStyle } from '@/ui/__tests__/style-utils';

describe('AlertModal', () => {
  it('应该使用内部动画而不是 Modal 默认动画', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AlertModal
          visible
          title="提示"
          message="内容"
          showCancel
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );
    });

    const modal = renderer!.root.find(
      node => typeof node.type === 'string' && node.type === 'Modal'
    );
    expect(modal.props.animationType).toBe('none');
  });

  it('应该提供稳定的双按钮可见布局', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AlertModal visible title="提示" showCancel onConfirm={vi.fn()} onCancel={vi.fn()} />
      );
    });

    const buttons = renderer!.root.findAllByType(TouchableOpacity);

    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(flattenStyle(button.props.style)).toMatchObject({
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
      });
    }

    expect(flattenStyle(buttons[0].props.style).marginRight).toBe(12);
    expect(flattenStyle(buttons[1].props.style).backgroundColor).toBeTruthy();
  });
});
