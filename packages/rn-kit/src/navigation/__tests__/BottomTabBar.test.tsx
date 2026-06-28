import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { ThemeProvider, createTheme } from '@/theme';
import { BottomTabBar } from '../components/BottomTabBar';
import { DEFAULT_BOTTOM_TAB_BAR_HEIGHT } from '../constants';

vi.mock('@/ui/motion', async () => {
  const actual = await vi.importActual<any>('@/ui/motion');
  return {
    ...actual,
    Presence: ({ visible, children }: any) => (visible ? <>{children}</> : null),
  };
});

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 10,
    left: 0,
    right: 0,
  }),
}));

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

function createProps(index = 0) {
  const navigate = vi.fn();
  const emit = vi.fn(() => ({ defaultPrevented: false }));

  return {
    state: {
      index,
      routes: [
        { key: 'home-key', name: 'Home' },
        { key: 'profile-key', name: 'Profile' },
      ],
    },
    descriptors: {
      'home-key': {
        options: {
          title: '首页',
          tabBarTestID: 'home-tab',
          tabBarIcon: ({ color }: { color: string }) => (
            <View testID="home-icon" style={{ backgroundColor: color }} />
          ),
        },
      },
      'profile-key': {
        options: {
          title: '我的',
          tabBarTestID: 'profile-tab',
          tabBarBadge: 120,
          tabBarIcon: ({ color }: { color: string }) => (
            <View testID="profile-icon" style={{ backgroundColor: color }} />
          ),
        },
      },
    },
    navigation: {
      emit,
      navigate,
    },
  } as any;
}

function flattenStyle(style: any) {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  }
  return StyleSheet.flatten(style) ?? {};
}

function hasAncestorTestId(node: any, testID: string) {
  let current = node?.parent;
  while (current) {
    if (current.props?.testID === testID || current.props?.['data-testid'] === testID) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

describe('BottomTabBar', () => {
  it('默认不应该渲染激活态指示器', () => {
    const props = createProps(0);
    const { queryByTestId } = render(
      <ThemeProvider light={theme}>
        <BottomTabBar {...props} />
      </ThemeProvider>
    );

    expect(queryByTestId('home-tab-indicator')).toBeNull();
    expect(queryByTestId('profile-tab-indicator')).toBeNull();
  });

  it('显式开启后应该渲染激活态指示器并在切换时更新', () => {
    const props = createProps(0);
    const { queryByTestId, rerender } = render(
      <ThemeProvider light={theme}>
        <BottomTabBar {...props} showActiveIndicator />
      </ThemeProvider>
    );

    expect(queryByTestId('home-tab-indicator')).toBeTruthy();
    expect(queryByTestId('profile-tab-indicator')).toBeNull();

    rerender(
      <ThemeProvider light={theme}>
        <BottomTabBar {...createProps(1)} showActiveIndicator />
      </ThemeProvider>
    );

    expect(queryByTestId('home-tab-indicator')).toBeNull();
    expect(queryByTestId('profile-tab-indicator')).toBeTruthy();
  });

  it('应该支持隐藏激活态指示器', () => {
    const { queryByTestId } = render(
      <ThemeProvider light={theme}>
        <BottomTabBar {...createProps(0)} showActiveIndicator={false} />
      </ThemeProvider>
    );

    expect(queryByTestId('home-tab-indicator')).toBeNull();
    expect(queryByTestId('profile-tab-indicator')).toBeNull();
  });

  it('点击未激活 tab 时应该触发导航，并显示徽标上限文案', () => {
    const props = createProps(0);
    const { getByTestId, getByText } = render(
      <ThemeProvider light={theme}>
        <BottomTabBar {...props} />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('profile-tab'));

    expect(props.navigation.emit).toHaveBeenCalled();
    expect(props.navigation.navigate).toHaveBeenCalledWith('Profile');
    expect(getByText('99+')).toBeTruthy();
  });

  it('应该将底部安全区作为独立 spacer，并保持内容行高度不变', () => {
    const { getAllByTestId } = render(
      <ThemeProvider light={theme}>
        <BottomTabBar {...createProps()} height={82} />
      </ThemeProvider>
    );

    const containerStyle = flattenStyle(getAllByTestId('bottom-tab-bar')[0].props.style);
    const contentStyle = flattenStyle(getAllByTestId('bottom-tab-bar-content')[0].props.style);
    const safeAreaStyle = flattenStyle(getAllByTestId('bottom-tab-bar-safe-area')[0].props.style);

    expect(containerStyle.height).toBe(92);
    expect(containerStyle.flexDirection).toBe('column');
    expect(contentStyle.height).toBe(82);
    expect(contentStyle.flexDirection).toBe('row');
    expect(safeAreaStyle.height).toBe(10);

    expect(hasAncestorTestId(getAllByTestId('home-tab')[0], 'bottom-tab-bar-content')).toBe(true);
    expect(hasAncestorTestId(getAllByTestId('profile-tab')[0], 'bottom-tab-bar-content')).toBe(
      true
    );
  });

  it('默认高度应该使用框架常量并计入底部安全区', () => {
    const { getAllByTestId } = render(
      <ThemeProvider light={theme}>
        <BottomTabBar {...createProps()} />
      </ThemeProvider>
    );

    const containerStyle = flattenStyle(getAllByTestId('bottom-tab-bar')[0].props.style);
    const contentStyle = flattenStyle(getAllByTestId('bottom-tab-bar-content')[0].props.style);

    expect(contentStyle.height).toBe(DEFAULT_BOTTOM_TAB_BAR_HEIGHT);
    expect(containerStyle.height).toBe(DEFAULT_BOTTOM_TAB_BAR_HEIGHT + 10);
  });

  it('style.height 不应该覆盖由 height 属性和安全区计算出的总高度', () => {
    const { getAllByTestId } = render(
      <ThemeProvider light={theme}>
        <BottomTabBar
          {...createProps()}
          height={82}
          style={{ height: 1, backgroundColor: '#ffffff' }}
        />
      </ThemeProvider>
    );

    const containerStyle = flattenStyle(getAllByTestId('bottom-tab-bar')[0].props.style);

    expect(containerStyle.height).toBe(92);
    expect(containerStyle.backgroundColor).toBe('#ffffff');
  });
});
