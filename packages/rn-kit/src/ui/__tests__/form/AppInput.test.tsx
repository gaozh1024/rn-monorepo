import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { act, create } from 'react-test-renderer';
import { AppInput, AppTextInput } from '../../form/AppInput';
import { renderWithTheme } from './test-utils';

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  }
  return StyleSheet.flatten(style) ?? {};
}

describe('AppInput', () => {
  const findInputContainer = (renderer: ReturnType<typeof create>) =>
    renderer.root.findAllByProps({ testID: 'input-container' })[0];

  it('应该兼容导出 AppTextInput', () => {
    const { getByTestId } = renderWithTheme(<AppTextInput testID="text-input" value="" />);

    expect(getByTestId('text-input')).toBeTruthy();
  });

  it('应该渲染标签、错误信息和禁用态', () => {
    const { getByText, getByTestId } = renderWithTheme(
      <AppInput testID="input" label="用户名" error="请输入用户名" disabled />
    );

    expect(getByText('用户名')).toBeTruthy();
    expect(getByText('请输入用户名')).toBeTruthy();
    expect(getByTestId('input').props.editable).toBe(false);
  });

  it('应该透传输入、聚焦和失焦事件', () => {
    const onChangeText = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const { getByTestId } = renderWithTheme(
      <AppInput
        testID="input"
        value=""
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );

    const input = getByTestId('input');

    fireEvent.changeText(input, 'panther');
    act(() => {
      input.props.onFocus?.({ nativeEvent: {} });
      input.props.onBlur?.({ nativeEvent: {} });
    });

    expect(onChangeText).toHaveBeenCalledWith('panther');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('style 中的高度等尺寸样式应该作用到输入容器', () => {
    const { getByTestId } = renderWithTheme(
      <AppInput testID="input" value="" style={{ height: 56 }} />
    );

    const input = getByTestId('input');
    const inputStyle = flattenStyle(input.props.style);

    expect(inputStyle.height).toBeUndefined();
    expect(getByTestId('input-container')).toBeTruthy();
  });

  it('应该支持输入容器基础快捷参数', () => {
    const { getByTestId } = renderWithTheme(
      <AppInput testID="input" value="" h={52} rounded="full" bg="primary-500" />
    );

    const style = flattenStyle(getByTestId('input-container').props.style);

    expect(style).toMatchObject({
      height: 52,
      borderRadius: 9999,
      backgroundColor: '#f38b32',
    });
  });

  it('点击输入容器时应该主动聚焦内部 TextInput', () => {
    const focus = vi.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppInput
          testID="input"
          value=""
          bg="transparent"
          containerStyle={{ borderWidth: 0 }}
          style={{ height: 48, fontSize: 20 }}
        />,
        {
          createNodeMock: element => (element.type === 'TextInput' ? { focus } : null),
        } as any
      );
    });

    act(() => {
      findInputContainer(renderer!).props.onPress?.({ nativeEvent: {} });
    });

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('禁用状态下点击输入容器不应该聚焦内部 TextInput', () => {
    const focus = vi.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(<AppInput testID="input" value="" disabled />, {
        createNodeMock: element => (element.type === 'TextInput' ? { focus } : null),
      } as any);
    });

    act(() => {
      findInputContainer(renderer!).props.onPress?.({ nativeEvent: {} });
    });

    expect(focus).not.toHaveBeenCalled();
  });

  it('内置布局不依赖 className 注入', () => {
    const { getByTestId } = renderWithTheme(<AppInput testID="input" value="" />);

    const container = getByTestId('input-container');
    const containerStyle = flattenStyle(container.props.style);
    const inputStyle = flattenStyle(getByTestId('input').props.style);

    expect(container.props.className).toBeFalsy();
    expect(containerStyle).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 12,
    });
    expect(inputStyle).toMatchObject({
      flex: 1,
      paddingTop: 12,
      paddingBottom: 12,
      fontSize: 16,
    });
  });

  it('应该支持 focus API 覆盖聚焦容器样式', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppInput
          testID="input"
          value=""
          focusRingColor="#38bdf8"
          focusRingWidth={2}
          focusBackgroundColor="#f0f9ff"
          focusedContainerStyle={{ shadowRadius: 14 }}
        />
      );
    });

    const containerBeforeFocus = findInputContainer(renderer!);
    const beforeFocusStyle = flattenStyle(containerBeforeFocus?.props.style);

    act(() => {
      renderer!.root.findByType('TextInput').props.onFocus?.({ nativeEvent: {} });
    });

    const container = findInputContainer(renderer!);
    const containerStyle = flattenStyle(container?.props.style);

    expect(beforeFocusStyle.borderWidth).toBe(2);
    expect(containerStyle).toMatchObject({
      borderColor: '#38bdf8',
      borderWidth: 2,
      backgroundColor: '#f0f9ff',
      shadowColor: '#38bdf8',
      shadowRadius: 14,
    });
  });

  it('focus 状态不应通过 borderWidth 触发布局跳动', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(<AppInput testID="input" value="" focusRingWidth={2} />);
    });

    const getContainerStyle = () => {
      const container = findInputContainer(renderer!);

      return flattenStyle(container?.props.style);
    };

    expect(getContainerStyle().borderWidth).toBe(2);

    act(() => {
      renderer!.root.findByType('TextInput').props.onFocus?.({ nativeEvent: {} });
    });

    expect(getContainerStyle().borderWidth).toBe(2);
  });

  it('错误态应该在 focus 和 focusedContainerStyle 之后覆盖边框颜色', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppInput
          testID="input"
          value=""
          error="请输入内容"
          focusRingColor="#38bdf8"
          focusedContainerStyle={{ borderColor: '#22c55e' }}
        />
      );
    });

    act(() => {
      renderer!.root.findByType('TextInput').props.onFocus?.({ nativeEvent: {} });
    });

    const container = findInputContainer(renderer!);
    const containerStyle = flattenStyle(container?.props.style);

    expect(containerStyle.borderColor).toBe('#ef4444');
  });

  it('应该支持显式 textarea 模式并内置多行输入默认行为', () => {
    const { getByTestId } = renderWithTheme(<AppInput testID="input" value="" textarea />);

    const input = getByTestId('input');
    const containerStyle = flattenStyle(getByTestId('input-container').props.style);
    const inputStyle = flattenStyle(input.props.style);

    expect(input.props.multiline).toBe(true);
    expect(input.props.blurOnSubmit).toBe(false);
    expect(input.props.scrollEnabled).toBe(false);
    expect(input.props.textAlignVertical).toBe('top');
    expect(containerStyle).toMatchObject({
      alignItems: 'flex-start',
      minHeight: 96,
    });
    expect(containerStyle.height).toBeUndefined();
    expect(inputStyle).toMatchObject({
      minHeight: 72,
      textAlignVertical: 'top',
    });
  });

  it('只传 multiline 时应保持旧的单行容器模型', () => {
    const { getByTestId } = renderWithTheme(<AppInput testID="input" value="" multiline />);

    const input = getByTestId('input');
    const containerStyle = flattenStyle(getByTestId('input-container').props.style);

    expect(input.props.multiline).toBe(true);
    expect(input.props.blurOnSubmit).toBeUndefined();
    expect(containerStyle).toMatchObject({
      alignItems: 'center',
      height: 48,
    });
  });

  it('textarea 模式应允许覆盖提交、滚动和垂直对齐行为', () => {
    const { getByTestId } = renderWithTheme(
      <AppInput
        testID="input"
        value=""
        textarea
        blurOnSubmit
        scrollEnabled
        textAlignVertical="bottom"
        inputStyle={{ textAlignVertical: 'center' }}
      />
    );

    const input = getByTestId('input');
    const inputStyle = flattenStyle(input.props.style);

    expect(input.props.multiline).toBe(true);
    expect(input.props.blurOnSubmit).toBe(true);
    expect(input.props.scrollEnabled).toBe(true);
    expect(input.props.textAlignVertical).toBe('bottom');
    expect(inputStyle.textAlignVertical).toBe('center');
  });

  it('textarea 模式应允许容器和输入样式覆盖默认视觉', () => {
    const { getByTestId } = renderWithTheme(
      <AppInput
        testID="input"
        value=""
        textarea
        minH={58}
        focusRingWidth={2}
        containerStyle={{ borderWidth: 0 }}
        inputStyle={{ fontSize: 17, lineHeight: 26, paddingVertical: 0 }}
      />
    );

    const containerStyle = flattenStyle(getByTestId('input-container').props.style);
    const inputStyle = flattenStyle(getByTestId('input').props.style);

    expect(containerStyle).toMatchObject({
      minHeight: 58,
      borderWidth: 0,
    });
    expect(inputStyle).toMatchObject({
      minHeight: 58,
      fontSize: 17,
      lineHeight: 26,
      paddingVertical: 0,
    });
  });

  it('应该支持 soft-login 视觉预设', () => {
    const { getByTestId } = renderWithTheme(
      <AppInput testID="input" value="" visualPreset="soft-login" placeholder="手机号" />
    );

    const containerStyle = flattenStyle(getByTestId('input-container').props.style);
    const inputStyle = flattenStyle(getByTestId('input').props.style);

    expect(containerStyle).toMatchObject({
      height: 56,
      borderRadius: 16,
      borderWidth: 0,
      backgroundColor: '#ffffff',
      shadowColor: '#000000',
    });
    expect(inputStyle).toMatchObject({
      fontSize: 16,
      paddingTop: 14,
      paddingBottom: 14,
    });
    expect(getByTestId('input').props.placeholderTextColor).toBe('#d1d5db');
  });

  it('默认不显示密码切换图标', () => {
    const { queryByTestId } = renderWithTheme(
      <AppInput testID="password-input" value="" secureTextEntry />
    );

    expect(queryByTestId('password-input-password-toggle')).toBeNull();
  });

  it('启用 passwordToggle 后应显示右侧切换图标，并可切换密文/明文', () => {
    const onPasswordVisibleChange = vi.fn();
    const { getByTestId } = renderWithTheme(
      <AppInput
        testID="password-input"
        value=""
        secureTextEntry
        passwordToggle
        onPasswordVisibleChange={onPasswordVisibleChange}
      />
    );

    const input = getByTestId('password-input');
    const toggle = getByTestId('password-input-password-toggle');

    expect(input.props.secureTextEntry).toBe(true);
    expect(getByTestId('password-input-password-toggle-icon')).toBeTruthy();

    fireEvent.press(toggle);
    expect(getByTestId('password-input').props.secureTextEntry).toBe(false);
    expect(onPasswordVisibleChange).toHaveBeenCalledWith(true);

    fireEvent.press(toggle);
    expect(getByTestId('password-input').props.secureTextEntry).toBe(true);
    expect(onPasswordVisibleChange).toHaveBeenLastCalledWith(false);
  });

  it('应支持自定义密码切换图标', () => {
    const { getByTestId } = renderWithTheme(
      <AppInput
        testID="password-input"
        value=""
        secureTextEntry
        passwordToggle
        passwordToggleIcons={{
          hidden: <Text testID="icon-hidden">🙈</Text>,
          visible: <Text testID="icon-visible">👁️</Text>,
        }}
      />
    );

    const toggle = getByTestId('password-input-password-toggle');

    expect(getByTestId('icon-hidden')).toBeTruthy();
    fireEvent.press(toggle);
    expect(getByTestId('icon-visible')).toBeTruthy();
  });
});
