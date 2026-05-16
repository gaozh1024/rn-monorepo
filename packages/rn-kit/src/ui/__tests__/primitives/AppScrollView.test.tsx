import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react-native';
import { act, create } from 'react-test-renderer';

import { AppScrollView, KeyboardDismissPressable } from '@/ui';

function flattenStyle(style: any) {
  if (!style) return {};
  if (Array.isArray(style))
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  return style;
}

describe('AppScrollView', () => {
  it('应该正确渲染滚动内容', () => {
    const { getByTestId } = render(
      <AppScrollView testID="scroll" className="bg-gray-50">
        <div testID="child">content</div>
      </AppScrollView>
    );

    expect(getByTestId('scroll')).toBeTruthy();
    expect(getByTestId('child')).toBeTruthy();
  });

  it('应该应用布局类名', () => {
    const { getByTestId } = render(
      <AppScrollView testID="scroll" flex p={4} pt={6} row items="center" gap={3} bg="gray-50">
        <div>content</div>
      </AppScrollView>
    );

    const node = getByTestId('scroll');
    const style = flattenStyle(node.props.style);
    const contentStyle = flattenStyle(node.props.contentContainerStyle);
    expect(style.flex).toBe(1);
    expect(style.backgroundColor).toBe('#f9fafb');
    expect(contentStyle.paddingTop).toBe(6);
    expect(contentStyle.paddingLeft).toBe(4);
    expect(contentStyle.paddingRight).toBe(4);
    expect(contentStyle.paddingBottom).toBe(4);
    expect(contentStyle.flexDirection).toBe('row');
    expect(contentStyle.alignItems).toBe('center');
    expect(contentStyle.gap).toBe(3);
  });

  it('开启点击空白收起键盘时应设置 keyboardShouldPersistTaps 并包裹 dismiss 逻辑', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppScrollView dismissKeyboardOnPressOutside>
          <div>content</div>
        </AppScrollView>
      );
    });

    const scrollView = renderer!.root.findByType('ScrollView');

    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(renderer!.root.findAllByType(KeyboardDismissPressable)).toHaveLength(1);
  });

  it('应该支持语义化背景', () => {
    const { getByTestId } = render(
      <AppScrollView testID="scroll" surface="background">
        <div>content</div>
      </AppScrollView>
    );

    const node = getByTestId('scroll');
    expect(node.props.style[0].backgroundColor).toBe('#ffffff');
  });
});
