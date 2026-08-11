import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { act, create } from 'react-test-renderer';
import { Picker } from '../../form/Picker';
import { renderWithTheme, theme } from './test-utils';
import { ThemeProvider } from '@/theme';
import { BottomSheetModal } from '../../form/BottomSheetModal';
import { flattenStyle, resolveInteractiveStyle } from '../style-utils';

const useSheetMotionMock = vi.hoisted(() => vi.fn());

vi.mock('../../motion/hooks/useSheetMotion', () => ({
  useSheetMotion: useSheetMotionMock,
}));

const createScrollEvent = (offsetY: number) =>
  ({
    nativeEvent: {
      contentOffset: {
        y: offsetY,
      },
    },
  }) as any;

describe('Picker', () => {
  beforeEach(() => {
    useSheetMotionMock.mockReset();
    useSheetMotionMock.mockImplementation((options: any) => ({
      mounted: options.visible,
      progress: { interpolate: vi.fn() },
      overlayStyle: {},
      sheetStyle: {},
      panHandlers: undefined,
      open: vi.fn(),
      close: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderWheelPicker = (
    options = [
      { label: '第一项', value: 'first' },
      { label: '第二项', value: 'second' },
      { label: '第三项', value: 'third' },
    ],
    defaultTempValue: string[] = ['first']
  ) => {
    const onTempChange = vi.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Picker
            columns={[
              {
                key: 'wheel',
                options,
              },
            ]}
            defaultTempValue={defaultTempValue}
            onTempChange={onTempChange}
            rowHeight={40}
          />
        </ThemeProvider>
      );
    });

    const getTextPressable = (text: string) => {
      const nodes = renderer!.root.findAllByProps({ children: text });
      for (const candidate of nodes) {
        let node: any = candidate;
        while (node?.props && !node.props.onPress) {
          node = node.parent;
        }
        if (node?.props?.onPress) return node;
      }
      throw new Error(`No pressable ancestor found for ${text}`);
    };

    act(() => {
      getTextPressable('请选择').props.onPress();
    });
    onTempChange.mockClear();

    const getScrollView = () => renderer!.root.findByType(ScrollView);

    return {
      getRenderer: () => renderer!,
      getScrollView,
      onTempChange,
    };
  };

  it('应该支持通用多列选择', () => {
    const onChange = vi.fn();
    const { getByText } = renderWithTheme(
      <Picker
        placeholder="请选择地区"
        onChange={onChange}
        columns={[
          {
            key: 'province',
            title: '省',
            options: [
              { label: '广东省', value: 'gd' },
              { label: '浙江省', value: 'zj' },
            ],
          },
          {
            key: 'city',
            title: '市',
            options: [
              { label: '深圳市', value: 'sz' },
              { label: '杭州市', value: 'hz' },
            ],
          },
          {
            key: 'district',
            title: '区',
            options: [
              { label: '南山区', value: 'ns' },
              { label: '西湖区', value: 'xh' },
            ],
          },
        ]}
      />
    );

    fireEvent.press(getByText('请选择地区'));
    fireEvent.press(getByText('浙江省'));
    fireEvent.press(getByText('杭州市'));
    fireEvent.press(getByText('西湖区'));
    fireEvent.press(getByText('确定'));

    expect(onChange).toHaveBeenCalledWith(['zj', 'hz', 'xh']);
  });

  it('应该为底部弹层启用点击遮罩关闭', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Picker
            placeholder="打开地区选择"
            columns={[
              {
                key: 'province',
                options: [{ label: '广东省', value: 'gd' }],
              },
            ]}
          />
        </ThemeProvider>
      );
    });

    const bottomSheet = renderer!.root.findByType(BottomSheetModal);
    expect(bottomSheet.props.closeOnBackdropPress).toBe(true);
  });

  it('应该透传自定义底部弹层动画配置', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Picker
            placeholder="打开地区选择"
            motionDuration={240}
            motionOpenDuration={320}
            motionCloseDuration={180}
            motionDistance={360}
            motionOverlayOpacity={0.8}
            motionSwipeThreshold={88}
            motionVelocityThreshold={1.4}
            motionReduceMotion
            columns={[
              {
                key: 'province',
                options: [{ label: '广东省', value: 'gd' }],
              },
            ]}
          />
        </ThemeProvider>
      );
    });

    const bottomSheet = renderer!.root.findByType(BottomSheetModal);
    expect(bottomSheet.props).toMatchObject({
      motionDuration: 240,
      motionOpenDuration: 320,
      motionCloseDuration: 180,
      motionDistance: 360,
      motionOverlayOpacity: 0.8,
      motionSwipeThreshold: 88,
      motionVelocityThreshold: 1.4,
      motionReduceMotion: true,
    });
  });

  it('应该支持触发器基础快捷参数', () => {
    const { getByText } = renderWithTheme(
      <Picker
        placeholder="打开地区选择"
        h={50}
        rounded="full"
        bg="primary-500"
        columns={[
          {
            key: 'province',
            options: [{ label: '广东省', value: 'gd' }],
          },
        ]}
      />
    );

    let trigger: any = getByText('打开地区选择');
    while (trigger?.props && !trigger.props.onPress) {
      trigger = trigger.parent;
    }

    expect(resolveInteractiveStyle(trigger.props.style)).toMatchObject({
      height: 50,
      borderRadius: 9999,
      backgroundColor: '#f38b32',
    });
  });

  it('触发器自定义显示文本应该使用稳定的原生文本布局', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Picker
            value={['daily']}
            renderDisplayText={() => '每天'}
            h={48}
            rounded="lg"
            bg="#F3F4F6"
            columns={[
              {
                key: 'value',
                options: [{ label: '每天', value: 'daily' }],
              },
            ]}
          />
        </ThemeProvider>
      );
    });

    const triggerText = renderer!.root
      .findAllByType(Text)
      .find(node => node.props.children === '每天');

    expect(flattenStyle(triggerText?.props.style)).toMatchObject({
      color: '#1f2937',
      flex: 1,
      flexShrink: 1,
      lineHeight: 20,
      minWidth: 0,
    });
  });

  it('应该支持覆盖触发器文本样式', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Picker
            value={['daily']}
            triggerTextStyle={{ color: '#123456', lineHeight: 22 }}
            columns={[
              {
                key: 'value',
                options: [{ label: '每天', value: 'daily' }],
              },
            ]}
          />
        </ThemeProvider>
      );
    });

    const triggerText = renderer!.root
      .findAllByType(Text)
      .find(node => node.props.children === '每天');

    expect(flattenStyle(triggerText?.props.style)).toMatchObject({
      color: '#123456',
      flex: 1,
      flexShrink: 1,
      lineHeight: 22,
      minWidth: 0,
    });
  });

  it('选中行高亮背景应该绘制在滚轮文字下方', () => {
    const { getRenderer, getScrollView } = renderWheelPicker();
    const scrollView = getScrollView();
    const siblings = scrollView.parent?.children ?? [];
    const selectionOverlay = getRenderer()
      .root.findAllByProps({ testID: 'picker-selection-overlay-wheel' })
      .find(node => node.parent === scrollView.parent);

    expect(selectionOverlay).toBeDefined();
    expect(siblings.indexOf(selectionOverlay!)).toBeLessThan(siblings.indexOf(scrollView));
  });

  it('惯性结束事件缺失时仍应该在滚动静止后吸附', () => {
    vi.useFakeTimers();
    const { getScrollView, onTempChange } = renderWheelPicker();

    act(() => {
      getScrollView().props.onScrollBeginDrag();
      getScrollView().props.onScrollEndDrag(createScrollEvent(80));
    });

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(onTempChange).toHaveBeenCalledTimes(1);
    expect(onTempChange).toHaveBeenLastCalledWith(['third']);
  });

  it('非惯性拖拽结束后应该延迟吸附到最近选项', () => {
    vi.useFakeTimers();
    const { getScrollView, onTempChange } = renderWheelPicker();

    act(() => {
      getScrollView().props.onScrollEndDrag(createScrollEvent(40));
    });
    expect(onTempChange).not.toHaveBeenCalled();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(onTempChange).toHaveBeenCalledTimes(1);
    expect(onTempChange).toHaveBeenLastCalledWith(['second']);
  });

  it('连续滚动应该使用每次滚动的最新静止位置', () => {
    vi.useFakeTimers();
    const { getScrollView, onTempChange } = renderWheelPicker();

    act(() => {
      getScrollView().props.onScrollEndDrag(createScrollEvent(80));
      vi.runOnlyPendingTimers();
    });

    act(() => {
      getScrollView().props.onScrollEndDrag(createScrollEvent(40));
      vi.runOnlyPendingTimers();
    });

    expect(onTempChange).toHaveBeenCalledTimes(2);
    expect(onTempChange).toHaveBeenNthCalledWith(1, ['third']);
    expect(onTempChange).toHaveBeenNthCalledWith(2, ['second']);
  });

  it('滚动静止检测应该使用 onScroll 记录的最新 offset', () => {
    vi.useFakeTimers();
    const { getScrollView, onTempChange } = renderWheelPicker();

    act(() => {
      getScrollView().props.onScrollEndDrag(createScrollEvent(40));
      getScrollView().props.onScroll(createScrollEvent(80));
    });

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(onTempChange).toHaveBeenCalledTimes(1);
    expect(onTempChange).toHaveBeenLastCalledWith(['third']);
  });

  it('受控临时值确认时应该使用最后一次滚动选择', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const onTempChange = vi.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Picker
            placeholder="请选择"
            value={['first']}
            tempValue={['first']}
            onChange={onChange}
            onTempChange={onTempChange}
            rowHeight={40}
            columns={[
              {
                key: 'wheel',
                options: [
                  { label: '第一项', value: 'first' },
                  { label: '第二项', value: 'second' },
                  { label: '第三项', value: 'third' },
                ],
              },
            ]}
          />
        </ThemeProvider>
      );
    });

    const getTextPressable = (text: string) => {
      const nodes = renderer!.root.findAllByProps({ children: text });
      for (const candidate of nodes) {
        let node: any = candidate;
        while (node?.props && !node.props.onPress) {
          node = node.parent;
        }
        if (node?.props?.onPress) return node;
      }
      throw new Error(`No pressable ancestor found for ${text}`);
    };

    act(() => {
      getTextPressable('第一项').props.onPress();
    });
    const scrollView = renderer!.root.findByType(ScrollView);

    act(() => {
      scrollView.props.onScrollEndDrag(createScrollEvent(80));
      vi.runOnlyPendingTimers();
    });

    act(() => {
      getTextPressable('确定').props.onPress();
    });

    expect(onTempChange).toHaveBeenLastCalledWith(['third']);
    expect(onChange).toHaveBeenLastCalledWith(['third']);
  });

  it('滚动停在禁用项时仍应该选择最近的可用项', () => {
    vi.useFakeTimers();
    const { getScrollView, onTempChange } = renderWheelPicker(
      [
        { label: '可用前项', value: 'prev' },
        { label: '禁用项', value: 'disabled', disabled: true },
        { label: '可用后项', value: 'next' },
      ],
      ['next']
    );

    act(() => {
      getScrollView().props.onScrollEndDrag(createScrollEvent(40));
      vi.runOnlyPendingTimers();
    });

    expect(onTempChange).toHaveBeenCalledTimes(1);
    expect(onTempChange).toHaveBeenLastCalledWith(['prev']);
  });
});
