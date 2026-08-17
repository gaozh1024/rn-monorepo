import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/ui/motion';
import { createReanimatedView } from '@/ui/motion/components/ReanimatedView';

const DEFAULT_ACTION_WIDTH = 76;
const DEFAULT_THRESHOLD = 48;
const DEFAULT_OVERSHOOT = 12;
const DEFAULT_TIMING_DURATION = 160;
const DEFAULT_SPRING_CONFIG = {
  damping: 22,
  mass: 1,
  stiffness: 220,
};

export interface SwipeActionRowAction {
  key: string;
  label?: string;
  icon?: ReactNode;
  width?: number;
  backgroundColor?: string;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onPress: () => void | Promise<void>;
}

export interface SwipeActionRowProps {
  children: ReactNode;
  actions: SwipeActionRowAction[];
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  actionWidth?: number;
  threshold?: number;
  overshoot?: number;
  closeOnActionPress?: boolean;
  closeOnPress?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  actionContainerStyle?: StyleProp<ViewStyle>;
  actionTextStyle?: StyleProp<TextStyle>;
  testID?: string;
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function resolveActionWidth(action: SwipeActionRowAction, fallbackWidth: number) {
  return action.width ?? fallbackWidth;
}

export function SwipeActionRow({
  children,
  actions,
  disabled = false,
  open,
  defaultOpen = false,
  actionWidth = DEFAULT_ACTION_WIDTH,
  threshold = DEFAULT_THRESHOLD,
  overshoot = DEFAULT_OVERSHOOT,
  closeOnActionPress = true,
  closeOnPress = false,
  onOpen,
  onClose,
  onPress,
  style,
  contentStyle,
  actionContainerStyle,
  actionTextStyle,
  testID,
}: SwipeActionRowProps) {
  const { shouldAnimate } = useReducedMotion();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? Boolean(open) : internalOpen;
  const actionTotalWidth = useMemo(
    () => actions.reduce((total, action) => total + resolveActionWidth(action, actionWidth), 0),
    [actionWidth, actions]
  );
  const canSwipe = !disabled && actionTotalWidth > 0 && actions.length > 0;
  const translateX = useSharedValue(isOpen ? -actionTotalWidth : 0);
  const gestureStartX = useSharedValue(0);

  const animateTo = useCallback(
    (value: number) => {
      if (!shouldAnimate) {
        translateX.value = value;
        return;
      }

      translateX.value = withSpring(value, DEFAULT_SPRING_CONFIG);
    },
    [shouldAnimate, translateX]
  );

  const setOpenState = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      if (nextOpen) {
        onOpen?.();
      } else {
        onClose?.();
      }
      animateTo(nextOpen ? -actionTotalWidth : 0);
    },
    [actionTotalWidth, animateTo, isControlled, onClose, onOpen]
  );

  const close = useCallback(() => {
    setOpenState(false);
  }, [setOpenState]);

  const openRow = useCallback(() => {
    if (canSwipe) setOpenState(true);
  }, [canSwipe, setOpenState]);

  useEffect(() => {
    const target = isOpen && canSwipe ? -actionTotalWidth : 0;
    if (!shouldAnimate) {
      translateX.value = target;
      return;
    }
    translateX.value = withTiming(target, { duration: DEFAULT_TIMING_DURATION });
  }, [actionTotalWidth, canSwipe, isOpen, shouldAnimate, translateX]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(canSwipe)
        .activeOffsetX([-8, 8])
        .onUpdate(event => {
          const min = -actionTotalWidth - (shouldAnimate ? overshoot : 0);
          translateX.value = clamp(gestureStartX.value + event.translationX, min, 0);
        })
        .onEnd(event => {
          const shouldOpen = Math.abs(translateX.value) > threshold || event.velocityX < -420;
          if (shouldOpen) {
            runOnJS(openRow)();
          } else {
            runOnJS(close)();
          }
        })
        .onFinalize(() => {
          gestureStartX.value = translateX.value;
        }),
    [
      actionTotalWidth,
      canSwipe,
      close,
      gestureStartX,
      openRow,
      overshoot,
      shouldAnimate,
      threshold,
      translateX,
    ]
  );

  useEffect(() => {
    gestureStartX.value = isOpen && canSwipe ? -actionTotalWidth : 0;
  }, [actionTotalWidth, canSwipe, gestureStartX, isOpen]);

  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: translateX.value }],
    }),
    [translateX]
  );

  const handleContentPress = useCallback(() => {
    if (Math.abs(translateX.value) > 1) {
      close();
      return;
    }

    if (isOpen && closeOnPress) {
      close();
      return;
    }
    onPress?.();
  }, [close, closeOnPress, isOpen, onPress, translateX]);

  const handleActionPress = useCallback(
    async (action: SwipeActionRowAction) => {
      if (action.disabled || action.loading) return;
      await action.onPress();
      if (closeOnActionPress) {
        close();
      }
    },
    [close, closeOnActionPress]
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      <View
        pointerEvents={canSwipe ? 'auto' : 'none'}
        style={[
          styles.actions,
          {
            width: actionTotalWidth,
          },
          actionContainerStyle,
        ]}
        testID={testID ? `${testID}-actions` : undefined}
      >
        {actions.map(action => {
          const width = resolveActionWidth(action, actionWidth);
          const actionDisabled = action.disabled || action.loading;

          return (
            <Pressable
              key={action.key}
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              accessibilityRole={action.accessibilityRole ?? 'button'}
              disabled={actionDisabled}
              onPress={() => {
                void handleActionPress(action);
              }}
              style={[
                styles.action,
                {
                  width,
                  backgroundColor: action.backgroundColor ?? '#ef4444',
                  opacity: actionDisabled ? 0.56 : 1,
                },
                action.style,
              ]}
              testID={testID ? `${testID}-action-${action.key}` : undefined}
            >
              {action.loading ? (
                <ActivityIndicator color={action.color ?? '#ffffff'} size="small" />
              ) : (
                action.icon
              )}
              {action.label ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.actionLabel,
                    { color: action.color ?? '#ffffff' },
                    actionTextStyle,
                    action.textStyle,
                  ]}
                >
                  {action.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <GestureDetector gesture={gesture}>
        {createReanimatedView(
          { style: [styles.content, animatedStyle, contentStyle] },
          <Pressable
            disabled={!onPress && !(isOpen && closeOnPress)}
            onPress={handleContentPress}
            testID={testID ? `${testID}-content` : undefined}
          >
            {children}
          </Pressable>
        )}
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  actions: {
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  content: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    width: '100%',
  },
  root: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
});
