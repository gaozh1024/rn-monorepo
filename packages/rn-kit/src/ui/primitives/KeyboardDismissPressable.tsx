import React from 'react';
import {
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
  type GestureResponderEvent,
} from 'react-native';

interface KeyboardDismissPressableProps {
  children: React.ReactElement;
}

function hasElementApi(target: unknown): target is {
  closest?: (selector: string) => unknown;
  isContentEditable?: boolean;
  tagName?: string;
} {
  return typeof target === 'object' && target !== null;
}

export function isEditableKeyboardDismissTarget(target: unknown) {
  if (Platform.OS !== 'web' || !hasElementApi(target)) {
    return false;
  }

  const tagName = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';

  if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable === true) {
    return true;
  }

  return Boolean(target.closest?.('input, textarea, [contenteditable="true"]'));
}

export function dismissKeyboardFromPress(event?: GestureResponderEvent) {
  if (isEditableKeyboardDismissTarget(event?.target)) {
    return;
  }

  Keyboard.dismiss();
}

/**
 * KeyboardDismissPressable - dismisses the keyboard for outside presses while
 * preserving editable focus on React Native Web.
 */
export function KeyboardDismissPressable({ children }: KeyboardDismissPressableProps) {
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboardFromPress} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  );
}
