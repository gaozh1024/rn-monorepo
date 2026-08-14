import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { Text } from 'react-native';
import { SwipeActionRow } from '../SwipeActionRow';

describe('SwipeActionRow', () => {
  it('renders content and actions', () => {
    const onPress = vi.fn();
    const { getByText, getByTestId } = render(
      <SwipeActionRow
        testID="row"
        actions={[
          {
            key: 'delete',
            label: 'Delete',
            onPress,
          },
        ]}
      >
        <Text>Row content</Text>
      </SwipeActionRow>
    );

    expect(getByText('Row content')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
    expect(getByTestId('row-action-delete')).toBeTruthy();
  });

  it('calls action onPress', () => {
    const onPress = vi.fn();
    const { getAllByTestId } = render(
      <SwipeActionRow
        testID="row"
        actions={[
          {
            key: 'delete',
            label: 'Delete',
            onPress,
          },
        ]}
      >
        <Text>Row content</Text>
      </SwipeActionRow>
    );

    getAllByTestId('row-action-delete')[0].props.onClick();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call disabled action', () => {
    const onPress = vi.fn();
    const { getAllByTestId: getDisabledActionByTestId } = render(
      <SwipeActionRow
        testID="row"
        actions={[
          {
            key: 'delete',
            label: 'Delete',
            disabled: true,
            onPress,
          },
        ]}
      >
        <Text>Row content</Text>
      </SwipeActionRow>
    );

    getDisabledActionByTestId('row-action-delete')[0].props.onClick();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('supports content press', () => {
    const onPress = vi.fn();
    const { getByTestId: getContentByTestId } = render(
      <SwipeActionRow
        testID="row"
        onPress={onPress}
        actions={[
          {
            key: 'delete',
            label: 'Delete',
            onPress: vi.fn(),
          },
        ]}
      >
        <Text>Row content</Text>
      </SwipeActionRow>
    );

    fireEvent.press(getContentByTestId('row-content'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('closes instead of pressing content while open', () => {
    const onClose = vi.fn();
    const onPress = vi.fn();

    let tree: ReturnType<typeof create> | null = null;
    act(() => {
      tree = create(
        <SwipeActionRow
          testID="row"
          open
          closeOnPress
          onClose={onClose}
          onPress={onPress}
          actions={[
            {
              key: 'delete',
              label: 'Delete',
              onPress: vi.fn(),
            },
          ]}
        >
          <Text>Row content</Text>
        </SwipeActionRow>
      );
    });

    const contentPressable = tree!.root.findByProps({ testID: 'row-content' });

    act(() => {
      contentPressable.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes controlled open callbacks through action close', async () => {
    const onClose = vi.fn();
    const { getAllByTestId } = render(
      <SwipeActionRow
        testID="row"
        open
        onClose={onClose}
        actions={[
          {
            key: 'delete',
            label: 'Delete',
            onPress: vi.fn(),
          },
        ]}
      >
        <Text>Row content</Text>
      </SwipeActionRow>
    );

    getAllByTestId('row-action-delete')[0].props.onClick();
    await Promise.resolve();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
