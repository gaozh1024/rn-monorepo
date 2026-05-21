import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
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
    input.props.onFocus?.({ nativeEvent: {} });
    input.props.onBlur?.({ nativeEvent: {} });

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
