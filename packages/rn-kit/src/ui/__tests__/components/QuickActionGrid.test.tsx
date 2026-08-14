import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { QuickActionGrid } from '../../display/QuickActionGrid';
import { AppView } from '../../primitives';
import { renderWithTheme, theme } from '../form/test-utils';
import { flattenStyle } from '../style-utils';

describe('QuickActionGrid', () => {
  const items = [
    {
      key: 'notice',
      label: '通知',
      icon: 'notifications-none',
      iconColor: '#6683A5',
      iconBackgroundColor: '#F1F5F9',
      onPress: vi.fn(),
    },
    {
      key: 'security',
      label: '安全',
      icon: 'security',
      iconColor: '#5C9C78',
      iconBackgroundColor: '#EFF8F2',
    },
    {
      key: 'theme',
      label: '主题',
      icon: 'palette',
      badge: 2,
    },
    {
      key: 'feedback',
      label: '反馈',
      icon: 'feedback',
    },
  ] as const;

  it('应该渲染快捷入口、图标、文字和角标', () => {
    const { getByText, getByTestId } = renderWithTheme(<QuickActionGrid items={items} />);

    expect(getByTestId('quick-action-grid')).toBeTruthy();
    expect(getByText('通知')).toBeTruthy();
    expect(getByText('安全')).toBeTruthy();
    expect(getByText('主题')).toBeTruthy();
    expect(getByText('反馈')).toBeTruthy();
    expect(getByTestId('quick-action-grid-icon-notice')).toBeTruthy();
    expect(getByTestId('quick-action-grid-badge-theme')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('motion 关闭时应该使用四列等宽布局', () => {
    const { getByTestId } = renderWithTheme(<QuickActionGrid items={items} motionPreset="none" />);

    const firstItemStyle = flattenStyle(getByTestId('quick-action-grid-item-notice').props.style);
    expect(firstItemStyle.width).toBe('25%');
  });

  it('应该支持配置列数和圆角', () => {
    const { getByTestId } = renderWithTheme(
      <QuickActionGrid items={items.slice(0, 3)} columns={3} rounded="2xl" motionPreset="none" />
    );

    const gridStyle = flattenStyle(getByTestId('quick-action-grid').props.style);
    const firstItemStyle = flattenStyle(getByTestId('quick-action-grid-item-notice').props.style);
    expect(gridStyle.borderRadius).toBe(24);
    expect(firstItemStyle.width).toBe('33.333333333333336%');
  });

  it('默认 motion 模式下不应该在内层按钮重复列宽', () => {
    const interactiveItems = items.map(item => ({
      ...item,
      onPress: vi.fn(),
    }));
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <QuickActionGrid items={interactiveItems} />
        </ThemeProvider>
      );
    });

    const animatedWrapper = renderer!.root.findAllByType('Animated.View')[0];
    const pressable = renderer!.root.findAllByType('Pressable')[0];

    expect(flattenStyle(animatedWrapper.props.style).width).toBe('25%');
    expect(flattenStyle(pressable.props.style).width).toBeUndefined();
  });

  it('应该支持整块点击', () => {
    const onPress = vi.fn();
    const { getByTestId } = renderWithTheme(
      <QuickActionGrid
        items={[{ key: 'notice', label: '通知', icon: 'notifications-none', onPress }]}
      />
    );

    fireEvent.press(getByTestId('quick-action-grid-item-notice'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled 项不应该触发点击，并显示禁用透明度', () => {
    const onPress = vi.fn();
    const { getByTestId } = renderWithTheme(
      <QuickActionGrid
        items={[{ key: 'feedback', label: '反馈', icon: 'feedback', disabled: true, onPress }]}
      />
    );

    const item = getByTestId('quick-action-grid-item-feedback');
    expect(item.props.disabled).toBe(true);
    expect(flattenStyle(item.props.style).opacity).toBe(0.5);

    fireEvent.press(item);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('应该支持自定义图标节点', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(
      <QuickActionGrid
        items={[
          {
            key: 'custom',
            label: '自定义',
            icon: <AppView testID="custom-icon" />,
          },
        ]}
      />
    );

    expect(getByTestId('custom-icon')).toBeTruthy();
    expect(queryByTestId('quick-action-grid-icon-custom')).toBeNull();
  });
});
