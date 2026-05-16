import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { act, create } from 'react-test-renderer';
import { FlatList } from 'react-native';
import { AppList } from '../../display/AppList';
import { AppPressable, AppText, KeyboardDismissPressable } from '../../primitives';
import { ThemeProvider, createTheme } from '@/theme';

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

function flattenStyle(style: any) {
  if (!style) return {};
  if (Array.isArray(style))
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  return style;
}

describe('AppList', () => {
  const mockData = [
    { id: '1', title: 'Item 1' },
    { id: '2', title: 'Item 2' },
    { id: '3', title: 'Item 3' },
  ];

  it('应该渲染列表项', () => {
    const { getByText } = render(
      <ThemeProvider light={theme}>
        <AppList
          data={mockData}
          renderItem={({ item }) => <AppText>{item.title}</AppText>}
          keyExtractor={item => item.id}
        />
      </ThemeProvider>
    );

    expect(getByText('Item 1')).toBeTruthy();
    expect(getByText('Item 2')).toBeTruthy();
    expect(getByText('Item 3')).toBeTruthy();
  });

  it('应该渲染空状态', () => {
    const { getByText } = render(
      <ThemeProvider light={theme}>
        <AppList data={[]} renderItem={() => null} emptyTitle="暂无数据" />
      </ThemeProvider>
    );

    expect(getByText('暂无数据')).toBeTruthy();
  });

  it('应该显示加载状态', () => {
    const { getAllByTestId } = render(
      <ThemeProvider light={theme}>
        <AppList data={[]} renderItem={() => null} loading skeletonCount={3} />
      </ThemeProvider>
    );

    // 骨架屏项
    expect(getAllByTestId('skeleton').length).toBe(3);
  });

  it('应该支持自定义错误文案', () => {
    const onRetry = vi.fn();
    const { getByText } = render(
      <ThemeProvider light={theme}>
        <AppList
          data={[]}
          renderItem={() => null}
          error={new Error('')}
          onRetry={onRetry}
          errorTitle="加载异常"
          errorDescription="请稍后重试"
          retryText="再试一次"
        />
      </ThemeProvider>
    );

    expect(getByText('加载异常')).toBeTruthy();
    expect(getByText('请稍后重试')).toBeTruthy();
    fireEvent.press(getByText('再试一次'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('错误重试按钮应该用内联快捷参数提供点击区域', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <AppList data={[]} renderItem={() => null} error={new Error('')} onRetry={vi.fn()} />
        </ThemeProvider>
      );
    });

    const retryButton = renderer!.root.findByType(AppPressable);

    expect(retryButton.props.mt).toBe(24);
    expect(retryButton.props.px).toBe(16);
    expect(retryButton.props.py).toBe(8);
    expect(retryButton.props.rounded).toBe('lg');
  });

  it('应该支持将组件类型作为 ListFooterComponent 传入', () => {
    const Footer = () => <AppText>底部组件</AppText>;

    const { getByText } = render(
      <ThemeProvider light={theme}>
        <AppList
          data={mockData}
          renderItem={({ item }) => <AppText>{item.title}</AppText>}
          keyExtractor={item => item.id}
          ListFooterComponent={Footer}
        />
      </ThemeProvider>
    );

    expect(getByText('底部组件')).toBeTruthy();
  });

  it('numColumns 动态切换时应该可以正常重渲染', () => {
    const { rerender, getByText } = render(
      <ThemeProvider light={theme}>
        <AppList
          data={mockData}
          renderItem={({ item }) => <AppText>{item.title}</AppText>}
          keyExtractor={item => item.id}
          numColumns={1}
        />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider light={theme}>
        <AppList
          data={mockData}
          renderItem={({ item }) => <AppText>{item.title}</AppText>}
          keyExtractor={item => item.id}
          numColumns={2}
        />
      </ThemeProvider>
    );

    expect(getByText('Item 1')).toBeTruthy();
    expect(getByText('Item 2')).toBeTruthy();
  });

  it('应该支持基础快捷参数与点击空白收起键盘', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <AppList
            data={mockData}
            renderItem={({ item }) => <AppText>{item.title}</AppText>}
            keyExtractor={item => item.id}
            flex
            p={4}
            gap={3}
            row
            items="center"
            bg="primary-500"
            dismissKeyboardOnPressOutside
          />
        </ThemeProvider>
      );
    });

    const list = renderer!.root.findByType(FlatList);
    const style = flattenStyle(list.props.style);
    const contentStyle = flattenStyle(list.props.contentContainerStyle);

    expect(style.flex).toBe(1);
    expect(style.backgroundColor).toBe('#f38b32');
    expect(contentStyle.paddingTop).toBe(4);
    expect(contentStyle.paddingRight).toBe(4);
    expect(contentStyle.flexDirection).toBe('row');
    expect(contentStyle.alignItems).toBe('center');
    expect(contentStyle.gap).toBe(3);
    expect(list.props.keyboardShouldPersistTaps).toBe('handled');
    expect(renderer!.root.findAllByType(KeyboardDismissPressable)).toHaveLength(1);
  });
});
