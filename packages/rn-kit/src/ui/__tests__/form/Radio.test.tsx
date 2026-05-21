import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Radio } from '../../form/Radio';
import { ThemeProvider, createTheme } from '@/theme';
import { resolveInteractiveStyle } from '../style-utils';

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

describe('Radio', () => {
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
        <Radio testID="radio" checked={false} />
      </ThemeProvider>
    );
    expect(getByTestId('radio')).toBeTruthy();
  });

  it('应该触发点击事件', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Radio testID="radio" checked={false} onChange={onChange} />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('radio'));
    expect(onChange).toHaveBeenCalled();
  });

  it('应该渲染标签', () => {
    const { getByText } = render(
      <ThemeProvider light={theme}>
        <Radio checked={false}>选项A</Radio>
      </ThemeProvider>
    );
    expect(getByText('选项A')).toBeTruthy();
  });

  it('应该支持基础快捷参数', () => {
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Radio testID="radio" checked={false} px={6} rounded="full" bg="primary-500" />
      </ThemeProvider>
    );

    const flattened = resolveInteractiveStyle(getByTestId('radio').props.style);

    expect(flattened).toMatchObject({
      paddingLeft: 6,
      paddingRight: 6,
      borderRadius: 9999,
      backgroundColor: '#f38b32',
    });
  });

  it('Web + animated=true 时应渲染带 transition 的内圆', () => {
    (Platform as any).OS = 'web';

    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Radio testID="radio" checked />
      </ThemeProvider>
    );

    const root = getByTestId('radio');
    const candidates = root.findAll((node: any) => {
      const style = flattenStyle(node.props?.style);
      return style.transitionProperty === 'opacity, transform';
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(flattenStyle(candidates[0].props.style)).toMatchObject({
      opacity: 1,
      transitionDuration: '180ms',
    });

    (Platform as any).OS = originalPlatformOS;
  });
});
