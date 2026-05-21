import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Checkbox } from '../../form/Checkbox';
import { ThemeProvider, createTheme } from '@/theme';
import { resolveInteractiveStyle } from '../style-utils';

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

describe('Checkbox', () => {
  const originalPlatformOS = Platform.OS;

  function flattenStyle(style: any): Record<string, any> {
    if (!style) return {};
    if (Array.isArray(style)) {
      return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
    }
    return StyleSheet.flatten(style) ?? {};
  }

  it('应该渲染未选中状态', () => {
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Checkbox testID="checkbox" checked={false} onChange={() => {}} />
      </ThemeProvider>
    );
    expect(getByTestId('checkbox')).toBeTruthy();
  });

  it('应该切换选中状态', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Checkbox testID="checkbox" checked={false} onChange={onChange} />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('应该禁用交互', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Checkbox testID="checkbox" checked={false} onChange={onChange} disabled />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('应该渲染标签', () => {
    const { getByText } = render(
      <ThemeProvider light={theme}>
        <Checkbox checked={false} onChange={() => {}}>
          同意协议
        </Checkbox>
      </ThemeProvider>
    );
    expect(getByText('同意协议')).toBeTruthy();
  });

  it('应该支持基础快捷参数', () => {
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Checkbox testID="checkbox" checked={false} p={4} w={120} rounded="lg" bg="primary-500" />
      </ThemeProvider>
    );

    const flattened = resolveInteractiveStyle(getByTestId('checkbox').props.style);

    expect(flattened).toMatchObject({
      paddingTop: 4,
      paddingRight: 4,
      paddingBottom: 4,
      paddingLeft: 4,
      width: 120,
      borderRadius: 12,
      backgroundColor: '#f38b32',
    });
  });

  it('Web + animated=true 时应渲染带 transition 的图标容器', () => {
    (Platform as any).OS = 'web';

    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Checkbox testID="checkbox" checked />
      </ThemeProvider>
    );

    const icon = getByTestId('checkbox-icon');

    expect(flattenStyle(icon.props.style)).toMatchObject({
      opacity: 1,
      transitionProperty: 'opacity, transform',
      transitionDuration: '180ms',
    });

    (Platform as any).OS = originalPlatformOS;
  });
});
