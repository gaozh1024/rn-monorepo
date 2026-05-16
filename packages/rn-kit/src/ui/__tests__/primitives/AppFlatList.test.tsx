import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react-native';
import { act, create } from 'react-test-renderer';
import { FlatList } from 'react-native';
import { AppFlatList, KeyboardDismissPressable } from '@/ui';

function flattenStyle(style: any) {
  if (!style) return {};
  if (Array.isArray(style))
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  return style;
}

describe('AppFlatList', () => {
  const data = [
    { id: '1', title: 'Item 1' },
    { id: '2', title: 'Item 2' },
  ];

  it('应该正确渲染列表项', () => {
    const { getByText } = render(
      <AppFlatList
        data={data}
        renderItem={({ item }) => <div>{item.title}</div>}
        keyExtractor={item => item.id}
      />
    );

    expect(getByText('Item 1')).toBeTruthy();
    expect(getByText('Item 2')).toBeTruthy();
  });

  it('应该应用布局快捷参数', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppFlatList
          testID="list"
          data={data}
          renderItem={({ item }) => <div>{item.title}</div>}
          keyExtractor={item => item.id}
          flex
          p={4}
          pt={6}
          row
          items="center"
          gap={3}
          bg="gray-50"
        />
      );
    });

    const node = renderer!.root.findByType(FlatList);
    const style = flattenStyle(node.props.style);
    const contentStyle = flattenStyle(node.props.contentContainerStyle);

    expect(style.flex).toBe(1);
    expect(style.backgroundColor).toBe('#f9fafb');
    expect(contentStyle.paddingTop).toBe(6);
    expect(contentStyle.paddingLeft).toBe(4);
    expect(contentStyle.paddingRight).toBe(4);
    expect(contentStyle.paddingBottom).toBe(4);
    expect(contentStyle.flexDirection).toBe('row');
    expect(contentStyle.alignItems).toBe('center');
    expect(contentStyle.gap).toBe(3);
  });

  it('开启点击空白收起键盘时应设置 keyboardShouldPersistTaps 并包裹 dismiss 逻辑', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppFlatList
          data={data}
          renderItem={({ item }) => <div>{item.title}</div>}
          keyExtractor={item => item.id}
          dismissKeyboardOnPressOutside
        />
      );
    });

    const flatList = renderer!.root.findByType(FlatList);

    expect(flatList.props.keyboardShouldPersistTaps).toBe('handled');
    expect(renderer!.root.findAllByType(KeyboardDismissPressable)).toHaveLength(1);
  });

  it('应该支持语义化背景', () => {
    const { getByTestId } = render(
      <AppFlatList
        testID="list"
        data={data}
        renderItem={({ item }) => <div>{item.title}</div>}
        keyExtractor={item => item.id}
        surface="background"
      />
    );

    const node = getByTestId('list');
    const style = flattenStyle(node.props.style);

    expect(style.backgroundColor).toBe('#ffffff');
  });
});
