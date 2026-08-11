import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, create } from 'react-test-renderer';
import { useAlert } from '../alert/hooks';

const alertModalMock = vi.hoisted(() => vi.fn(() => null));

vi.mock('../alert/component', () => ({
  AlertModal: alertModalMock,
}));

import { AlertProvider } from '../alert/provider';

function AlertLifecycleTestComponent() {
  const { confirm } = useAlert();
  return (
    <button
      className="probe"
      testID="alert-lifecycle-confirm"
      onPress={() =>
        confirm({
          title: '发现新版本',
          message: '最新版本 v1.0.1',
          cancelText: '稍后',
          confirmText: '立即更新',
        })
      }
    >
      显示更新确认框
    </button>
  );
}

function latestAlertProps() {
  return alertModalMock.mock.calls.at(-1)?.[0];
}

describe('AlertProvider lifecycle', () => {
  it('关闭动画期间应该保留原始文案，退出后再清空', () => {
    alertModalMock.mockClear();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AlertProvider>
          <AlertLifecycleTestComponent />
        </AlertProvider>
      );
    });

    act(() => {
      renderer!.root.findByProps({ testID: 'alert-lifecycle-confirm' }).props.onPress();
    });

    expect(latestAlertProps()).toMatchObject({
      visible: true,
      title: '发现新版本',
      message: '最新版本 v1.0.1',
      cancelText: '稍后',
      confirmText: '立即更新',
      showCancel: true,
    });

    act(() => {
      latestAlertProps()?.onCancel();
    });

    expect(latestAlertProps()).toMatchObject({
      visible: false,
      title: '发现新版本',
      message: '最新版本 v1.0.1',
      cancelText: '稍后',
      confirmText: '立即更新',
      showCancel: true,
    });

    act(() => {
      latestAlertProps()?.onExited();
    });

    expect(latestAlertProps()).toMatchObject({
      visible: false,
      title: undefined,
      message: undefined,
      cancelText: undefined,
      confirmText: undefined,
      showCancel: undefined,
    });
  });
});
