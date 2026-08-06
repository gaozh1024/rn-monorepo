import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SettingsList } from '../../display/SettingsList';
import { AppView } from '../../primitives';
import { renderWithTheme } from '../form/test-utils';
import { flattenStyle } from '../style-utils';

describe('SettingsList', () => {
  const items = [
    {
      key: 'invite',
      title: '邀请好友',
      icon: 'card-giftcard',
      onPress: vi.fn(),
    },
    {
      key: 'language',
      title: '语言设置',
      icon: 'language',
      value: '简体中文',
      onPress: vi.fn(),
    },
  ] as const;

  it('应该渲染标题、图标、右侧值和分隔线', () => {
    const { getByText, getByTestId, queryByTestId } = renderWithTheme(
      <SettingsList title="账户设置" items={items} />
    );

    expect(getByText('账户设置')).toBeTruthy();
    expect(getByText('邀请好友')).toBeTruthy();
    expect(getByText('简体中文')).toBeTruthy();
    expect(getByTestId('settings-list-divider-invite')).toBeTruthy();
    expect(queryByTestId('settings-list-divider-language')).toBeNull();
    expect(getByTestId('settings-list-chevron-invite')).toBeTruthy();
  });

  it('应该支持整行点击和默认右侧箭头', () => {
    const onPress = vi.fn();
    const { getByTestId } = renderWithTheme(
      <SettingsList items={[{ key: 'privacy', title: '隐私设置', icon: 'security', onPress }]} />
    );

    fireEvent.press(getByTestId('settings-list-item-privacy'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(getByTestId('settings-list-chevron-privacy')).toBeTruthy();
  });

  it('right 应该覆盖 value，并默认隐藏右侧箭头', () => {
    const { getByText, queryByText, getByTestId, queryByTestId } = renderWithTheme(
      <SettingsList
        items={[
          {
            key: 'notification',
            title: '通知',
            value: '已开启',
            right: <AppView testID="notification-switch" />,
            onPress: vi.fn(),
          },
        ]}
      />
    );

    expect(queryByText('已开启')).toBeNull();
    expect(getByTestId('settings-list-item-notification')).toBeTruthy();
    expect(getByTestId('notification-switch')).toBeTruthy();
    expect(getByText('通知')).toBeTruthy();
    expect(queryByTestId('settings-list-chevron-notification')).toBeNull();
  });

  it('destructive 项默认不显示箭头，并支持禁用态', () => {
    const onPress = vi.fn();
    const { getByTestId } = renderWithTheme(
      <SettingsList
        items={[
          {
            key: 'delete',
            title: '删除账户',
            destructive: true,
            disabled: true,
            onPress,
          },
        ]}
      />
    );

    const row = getByTestId('settings-list-item-delete');
    expect(row.props.disabled).toBe(true);
    expect(flattenStyle(row.props.style).opacity).toBe(0.5);

    fireEvent.press(row);
    expect(onPress).not.toHaveBeenCalled();
  });
});
