import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Icon, type IconName } from '../../display/Icon';
import { AppView } from '../../primitives/AppView';
import { act, create } from 'react-test-renderer';
import { ThemeProvider, createTheme } from '@/theme';

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

describe('Icon', () => {
  it('应该渲染图标', () => {
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Icon testID="icon" name="home" />
      </ThemeProvider>
    );
    expect(getByTestId('icon')).toBeTruthy();
  });

  it('应该支持点击', () => {
    const onPress = vi.fn();
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Icon testID="icon" name="home" onPress={onPress} />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('icon'));
    expect(onPress).toHaveBeenCalled();
  });

  it('应该支持数字尺寸', () => {
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Icon testID="icon" name="home" size={32} />
      </ThemeProvider>
    );
    expect(getByTestId('icon')).toBeTruthy();
  });

  it('应该支持预设尺寸', () => {
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <Icon testID="icon" name="home" size="lg" />
      </ThemeProvider>
    );
    expect(getByTestId('icon')).toBeTruthy();
  });

  it('应该支持基础快捷参数', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Icon name="home" p={4} rounded="full" bg="primary-500" />
        </ThemeProvider>
      );
    });

    const wrapper = renderer!.root.findByType(AppView);

    expect(wrapper.props.p).toBe(4);
    expect(wrapper.props.rounded).toBe('full');
    expect(wrapper.props.bg).toBe('primary-500');
  });

  it('应该兼容 snake_case 图标名称并提示使用 kebab-case', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Icon testID="icon" name="check_circle" />
        </ThemeProvider>
      );
    });

    const materialIcon = renderer!.root.findByType('MaterialIcon');

    expect(materialIcon.props.name).toBe('check-circle');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('check_circle'));

    warn.mockRestore();
  });

  it('应该导出 IconName 类型兼容内置常量和普通 MaterialIcons 名称', () => {
    const builtinName: IconName = 'check-circle';
    const materialName: IconName = 'arrow-forward-ios';

    expect(builtinName).toBe('check-circle');
    expect(materialName).toBe('arrow-forward-ios');
  });
});
