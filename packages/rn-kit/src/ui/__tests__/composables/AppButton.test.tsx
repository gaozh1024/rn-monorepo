import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Keyboard, StyleSheet, Text } from 'react-native';
import { AppButton } from '../../actions/AppButton';
import { AppPressable } from '../../primitives/AppPressable';
import { AppView } from '../../primitives/AppView';
import { act, create } from 'react-test-renderer';

function flattenStyle(style: any): Record<string, any> {
  if (typeof style === 'function') {
    return flattenStyle(style({ pressed: false, hovered: false, focused: false }));
  }

  if (Array.isArray(style)) {
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  }

  return StyleSheet.flatten(style) ?? {};
}

describe('AppButton', () => {
  it('应该显示文本', () => {
    const { getByText } = render(<AppButton>Click me</AppButton>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('应该响应onPress', () => {
    const onPress = vi.fn();
    const { getByText } = render(<AppButton onPress={onPress}>Click</AppButton>);
    fireEvent.press(getByText('Click'));
    expect(onPress).toHaveBeenCalled();
  });

  it('应该在disabled时不响应', () => {
    const onPress = vi.fn();
    const { getByText } = render(
      <AppButton onPress={onPress} disabled>
        Click
      </AppButton>
    );
    fireEvent.press(getByText('Click'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('应该显示加载指示器', () => {
    const { queryByText } = render(<AppButton loading>Click</AppButton>);
    expect(queryByText('Click')).toBeNull();
  });

  it('outline变体应该有边框样式', () => {
    const { getByText } = render(<AppButton variant="outline">Outline</AppButton>);
    let button: any = getByText('Outline');
    while (button?.props && !('borderWidth' in (button.props.style || {}))) {
      button = button.parent;
    }

    expect(button.props.style).toMatchObject({
      borderWidth: 0.5,
      backgroundColor: 'transparent',
    });
  });

  it('应该支持 surface 和 soft 变体', () => {
    let surfaceRenderer: ReturnType<typeof create>;
    let softRenderer: ReturnType<typeof create>;

    act(() => {
      surfaceRenderer = create(<AppButton variant="surface">Surface</AppButton>);
      softRenderer = create(<AppButton variant="soft">Soft</AppButton>);
    });

    const surfaceStyle = flattenStyle(surfaceRenderer!.root.findByType(AppPressable).props.style);
    const softStyle = flattenStyle(softRenderer!.root.findByType(AppPressable).props.style);

    expect(surfaceStyle).toMatchObject({
      backgroundColor: '#ffffff',
      borderWidth: 0,
      shadowColor: '#000000',
    });
    expect(softStyle.backgroundColor).toBe('#fef3eb');
  });

  it('应该支持精细样式入口和状态样式', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppButton
          style={{ height: 56, borderRadius: 16 }}
          textStyle={{ fontSize: 18, lineHeight: 24, fontWeight: '700' }}
          pressedStyle={{ transform: [{ scale: 0.98 }] }}
          disabledStyle={{ backgroundColor: '#eeeeee' }}
          disabled
        >
          Styled
        </AppButton>
      );
    });

    const button = renderer!.root.findByType(AppPressable);
    const buttonStyle = flattenStyle(button.props.style);

    expect(buttonStyle).toMatchObject({
      height: 56,
      borderRadius: 16,
      backgroundColor: '#eeeeee',
      opacity: 0.5,
    });
    expect(flattenStyle(button.findByType(Text).props.style)).toMatchObject({
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
    });
  });

  it('应该支持图标插槽和自定义内容渲染', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppButton
          leftIcon={<Text testID="left-icon">L</Text>}
          rightIcon={<Text testID="right-icon">R</Text>}
          iconGap={12}
        >
          Login
        </AppButton>
      );
    });

    const content = renderer!.root.findByType(AppView);

    expect(content.props.gap).toBe(12);
    expect(renderer!.root.findByProps({ testID: 'left-icon' })).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: 'right-icon' })).toBeTruthy();

    let customRenderer: ReturnType<typeof create>;

    act(() => {
      customRenderer = create(
        <AppButton renderContent={() => <Text testID="custom-content">Custom</Text>}>
          Ignored
        </AppButton>
      );
    });

    expect(customRenderer!.root.findByProps({ testID: 'custom-content' })).toBeTruthy();
  });

  it('应该支持 success 语义色', () => {
    const { getByText } = render(
      <AppButton color="success" variant="outline">
        Success
      </AppButton>
    );
    let button: any = getByText('Success');
    while (button?.props && !('borderWidth' in (button.props.style || {}))) {
      button = button.parent;
    }

    expect(button.props.style).toMatchObject({
      borderWidth: 0.5,
      borderColor: '#22c55e',
    });
  });

  it('默认点击前应该先收起键盘', () => {
    const callOrder: string[] = [];
    (Keyboard.dismiss as any).mockImplementation(() => callOrder.push('dismiss'));
    const onPress = vi.fn(() => callOrder.push('press'));

    const { getByText } = render(<AppButton onPress={onPress}>Submit</AppButton>);
    fireEvent.press(getByText('Submit'));

    expect(Keyboard.dismiss).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
    expect(callOrder).toEqual(['dismiss', 'press']);
  });

  it('可以关闭点击前自动收起键盘', () => {
    const onPress = vi.fn();

    const { getByText } = render(
      <AppButton onPress={onPress} dismissKeyboardOnPress={false}>
        Submit
      </AppButton>
    );
    fireEvent.press(getByText('Submit'));

    expect(Keyboard.dismiss).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
  });

  it('应该支持按钮外层基础快捷参数', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppButton w={180} h={44} rounded="full" mt={12}>
          Shortcut
        </AppButton>
      );
    });

    const button = renderer!.root.findByType(AppPressable);

    expect(button.props.w).toBe(180);
    expect(button.props.h).toBe(44);
    expect(button.props.mt).toBe(12);
    expect(button.props.rounded).toBe('full');
  });

  it('应该用内联快捷参数提供 Web 关键布局和尺寸', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(<AppButton size="lg">Web Button</AppButton>);
    });

    const button = renderer!.root.findByType(AppPressable);

    expect(button.props.row).toBe(true);
    expect(button.props.items).toBe('center');
    expect(button.props.justify).toBe('center');
    expect(button.props.px).toBe(24);
    expect(button.props.py).toBe(16);
  });
});
