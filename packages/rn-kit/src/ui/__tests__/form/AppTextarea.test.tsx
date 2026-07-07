import { describe, it, expect } from 'vitest';
import React from 'react';
import { StyleSheet } from 'react-native';
import { AppTextarea, type AppTextareaProps } from '../../form/AppTextarea';
import { AppTextarea as FormBarrelAppTextarea } from '../../form';
import { AppTextarea as RootAppTextarea } from '../../../index';
import type { AppTextareaProps as RootAppTextareaProps } from '../../../index';
import { renderWithTheme } from './test-utils';

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  }
  return StyleSheet.flatten(style) ?? {};
}

describe('AppTextarea', () => {
  it('应该从 form barrel 和根入口导出', () => {
    const props: AppTextareaProps = { value: 'hello' };
    const rootProps: RootAppTextareaProps = props;

    expect(FormBarrelAppTextarea).toBe(AppTextarea);
    expect(RootAppTextarea).toBe(AppTextarea);
    expect(rootProps.value).toBe('hello');
  });

  it('默认应该启用 textarea 输入语义', () => {
    const { getByTestId } = renderWithTheme(<AppTextarea testID="textarea" value="" />);

    const input = getByTestId('textarea');
    const containerStyle = flattenStyle(getByTestId('textarea-container').props.style);
    const inputStyle = flattenStyle(input.props.style);

    expect(input.props.multiline).toBe(true);
    expect(input.props.blurOnSubmit).toBe(false);
    expect(input.props.scrollEnabled).toBe(false);
    expect(input.props.textAlignVertical).toBe('top');
    expect(containerStyle).toMatchObject({
      alignItems: 'flex-start',
      minHeight: 96,
    });
    expect(inputStyle).toMatchObject({
      minHeight: 96,
      textAlignVertical: 'top',
    });
  });

  it('应该支持固定视觉高度和样式覆盖', () => {
    const { getByTestId } = renderWithTheme(
      <AppTextarea
        testID="textarea"
        value=""
        minH={58}
        maxH={160}
        variant="surface"
        focusRingWidth={0}
        containerStyle={{ backgroundColor: 'transparent', borderWidth: 0 }}
        inputStyle={{
          fontSize: 17,
          lineHeight: 26,
          paddingHorizontal: 0,
          paddingVertical: 0,
        }}
      />
    );

    const containerStyle = flattenStyle(getByTestId('textarea-container').props.style);
    const inputStyle = flattenStyle(getByTestId('textarea').props.style);

    expect(containerStyle).toMatchObject({
      minHeight: 58,
      maxHeight: 160,
      backgroundColor: 'transparent',
      borderWidth: 0,
    });
    expect(inputStyle).toMatchObject({
      minHeight: 58,
      fontSize: 17,
      lineHeight: 26,
      paddingHorizontal: 0,
      paddingVertical: 0,
    });
  });

  it('不应允许 unsafe runtime props 关闭 textarea 行为', () => {
    const unsafeProps = {
      textarea: false,
      multiline: false,
    } as unknown as AppTextareaProps;

    const { getByTestId } = renderWithTheme(
      <AppTextarea testID="textarea" value="" {...unsafeProps} />
    );

    expect(getByTestId('textarea').props.multiline).toBe(true);
    expect(getByTestId('textarea-container')).toBeTruthy();
  });

  it('应明确 textAlignVertical prop 与 inputStyle 的优先级', () => {
    const { getByTestId } = renderWithTheme(
      <AppTextarea
        testID="textarea"
        value=""
        textAlignVertical="bottom"
        inputStyle={{ textAlignVertical: 'center' }}
      />
    );

    const input = getByTestId('textarea');
    const inputStyle = flattenStyle(input.props.style);

    expect(input.props.textAlignVertical).toBe('bottom');
    expect(inputStyle.textAlignVertical).toBe('center');
  });
});
