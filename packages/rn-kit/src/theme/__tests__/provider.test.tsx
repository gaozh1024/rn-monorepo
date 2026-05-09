import { describe, it, expect } from 'vitest';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../provider';

const lightTheme = { colors: { primary: '#f38b32' } };
const darkTheme = { colors: { primary: '#1a1a1a' } };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider light={lightTheme} dark={darkTheme}>
    {children}
  </ThemeProvider>
);

describe('ThemeProvider', () => {
  it('应该提供主题上下文', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBeDefined();
    expect(result.current.isDark).toBe(false);
    expect(result.current.toggleTheme).toBeDefined();
  });

  it('切换主题应该工作', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    // 初始应该是亮色主题
    expect(result.current.isDark).toBe(false);

    // 切换主题
    act(() => {
      result.current.toggleTheme();
    });

    // 等待状态更新后应该是暗色主题
    await waitFor(() => {
      expect(result.current.isDark).toBe(true);
    });
  });

  it('父级使用相同主题配置重新渲染时应该保持 useTheme 返回对象引用稳定', () => {
    const { result, rerender } = renderHook(() => useTheme(), { wrapper });
    const firstThemeApi = result.current;

    rerender();

    expect(result.current).toBe(firstThemeApi);
  });

  it('应该支持受控暗色模式', () => {
    const controlledWrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider
        light={{ colors: { primary: '#f38b32' } }}
        dark={{ colors: { primary: '#1a1a1a' } }}
        isDark
      >
        {children}
      </ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper: controlledWrapper });
    expect(result.current.isDark).toBe(true);
    expect(result.current.theme.colors.primary?.[500]).toBeDefined();
  });

  it('应该在ThemeProvider外抛出错误', () => {
    // 不提供wrapper，直接使用useTheme
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within ThemeProvider');
  });
});
