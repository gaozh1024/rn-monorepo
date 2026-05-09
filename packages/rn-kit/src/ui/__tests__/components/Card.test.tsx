import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Card } from '../../display/Card';
import { AppText } from '../../primitives';

function flattenStyle(style: any) {
  if (!style) return {};
  if (Array.isArray(style))
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  return style;
}

const lightTheme = {
  colors: {
    primary: '#f38b32',
    card: '#ffffff',
    text: '#171717',
    border: '#e5e5e5',
  },
};

const darkTheme = {
  colors: {
    primary: '#f38b32',
    card: '#111827',
    text: '#f5f5f5',
    border: '#374151',
  },
};

describe('Card', () => {
  it('切换主题后卡片背景应自动更新', () => {
    const { getByTestId, rerender } = render(
      <ThemeProvider light={lightTheme} dark={darkTheme} isDark={false}>
        <Card testID="card">
          <AppText>内容</AppText>
        </Card>
      </ThemeProvider>
    );

    const lightCard = getByTestId('card');
    expect(lightCard.props.style[0].backgroundColor).toBe('#ffffff');
    const lightBorderColor = lightCard.props.style[0].borderColor;

    rerender(
      <ThemeProvider light={lightTheme} dark={darkTheme} isDark>
        <Card testID="card">
          <AppText>内容</AppText>
        </Card>
      </ThemeProvider>
    );

    const darkCard = getByTestId('card');
    expect(darkCard.props.style[0].backgroundColor).toBe('#111827');
    expect(darkCard.props.style[0].borderColor).not.toBe(lightBorderColor);
  });

  it('应该支持间距快捷属性', () => {
    const { getByTestId } = render(
      <Card testID="card" p={4} px={2} py={3} pt={5} gap={2} rounded="xl" flex>
        <AppText>内容</AppText>
      </Card>
    );

    const card = getByTestId('card');
    const style = flattenStyle(card.props.style);
    expect(style.paddingTop).toBe(5);
    expect(style.paddingBottom).toBe(3);
    expect(style.paddingLeft).toBe(2);
    expect(style.paddingRight).toBe(2);
    expect(style.gap).toBe(2);
    expect(style.borderRadius).toBe(16);
    expect(style.flex).toBe(1);
  });

  it('应该保持默认 elevated 风格行为', () => {
    const { getByTestId } = render(
      <Card testID="card">
        <AppText>内容</AppText>
      </Card>
    );

    const card = getByTestId('card');
    const style = flattenStyle(card.props.style);
    expect(card.props.className).toContain('shadow-sm');
    expect(style.borderWidth).toBe(0.5);
  });

  it('variant="flat" 应该关闭阴影和边框', () => {
    const { getByTestId } = render(
      <Card testID="card" variant="flat">
        <AppText>内容</AppText>
      </Card>
    );

    const card = getByTestId('card');
    const style = flattenStyle(card.props.style);
    expect(card.props.className).not.toContain('shadow-sm');
    expect(style.borderWidth).toBeUndefined();
    expect(style.borderColor).toBeUndefined();
  });

  it('variant="outlined" 应该关闭阴影但保留边框', () => {
    const { getByTestId } = render(
      <Card testID="card" variant="outlined">
        <AppText>内容</AppText>
      </Card>
    );

    const card = getByTestId('card');
    const style = flattenStyle(card.props.style);
    expect(card.props.className).not.toContain('shadow-sm');
    expect(style.borderWidth).toBe(0.5);
  });

  it('variant="elevated" 应该启用阴影和边框', () => {
    const { getByTestId } = render(
      <Card testID="card" variant="elevated">
        <AppText>内容</AppText>
      </Card>
    );

    const card = getByTestId('card');
    const style = flattenStyle(card.props.style);
    expect(card.props.className).toContain('shadow-sm');
    expect(style.borderWidth).toBe(0.5);
  });

  it('noShadow/noBorder 应该在 disable 方向覆盖 variant 默认值', () => {
    const { getByTestId } = render(
      <Card testID="card" variant="elevated" noShadow noBorder>
        <AppText>内容</AppText>
      </Card>
    );

    const card = getByTestId('card');
    const style = flattenStyle(card.props.style);
    expect(card.props.className).not.toContain('shadow-sm');
    expect(style.borderWidth).toBeUndefined();
  });
});
