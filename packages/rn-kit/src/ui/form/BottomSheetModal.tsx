import type { ReactNode } from 'react';
import { Modal, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { AppPressable, AppView } from '@/ui/primitives';
import type { SheetMotionProps } from '../motion';
import { useSheetMotion } from '../motion/hooks/useSheetMotion';

const SHEET_CLOSED_OFFSET = 240;

export interface BottomSheetModalProps extends SheetMotionProps {
  visible: boolean;
  onRequestClose: () => void;
  overlayColor: string;
  surfaceColor: string;
  children: ReactNode;
  closeOnBackdropPress?: boolean;
  maxHeight?: number | `${number}%`;
  showHandle?: boolean;
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
  swipeToClose?: boolean;
  backdropTestID?: string;
  handleTestID?: string;
}

export function BottomSheetModal({
  visible,
  onRequestClose,
  overlayColor,
  surfaceColor,
  children,
  closeOnBackdropPress = false,
  maxHeight = '70%',
  showHandle = true,
  contentClassName,
  contentStyle,
  swipeToClose = true,
  backdropTestID = 'bottom-sheet-backdrop',
  handleTestID = 'bottom-sheet-handle',
  motionDistance = SHEET_CLOSED_OFFSET,
  motionDuration,
  motionOpenDuration,
  motionCloseDuration,
  motionOverlayOpacity = 1,
  motionSwipeThreshold,
  motionVelocityThreshold,
  motionReduceMotion,
}: BottomSheetModalProps) {
  const sheetMotion = useSheetMotion({
    visible,
    placement: 'bottom',
    duration: motionDuration,
    openDuration: motionOpenDuration,
    closeDuration: motionCloseDuration,
    distance: motionDistance,
    overlayOpacity: motionOverlayOpacity,
    closeOnSwipe: swipeToClose,
    swipeThreshold: motionSwipeThreshold,
    velocityThreshold: motionVelocityThreshold,
    reduceMotion: motionReduceMotion,
    onRequestClose,
  });

  const animatedShadowStyle = useAnimatedStyle(() => {
    const progress = sheetMotion.progress?.value ?? (sheetMotion.mounted ? 1 : 0);
    const shadowOpacity = 0.12 * progress;
    const elevation = 12 * progress;

    return {
      shadowOpacity,
      elevation,
    };
  }, [sheetMotion.mounted, sheetMotion.progress]);

  return (
    <Modal
      visible={sheetMotion.mounted}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
    >
      <AppView flex justify="end">
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: overlayColor },
            sheetMotion.overlayStyle,
          ]}
        />

        {closeOnBackdropPress && (
          <AppPressable testID={backdropTestID} className="flex-1" onPress={onRequestClose} />
        )}

        <Animated.View
          className={contentClassName}
          style={[
            styles.sheetShadow,
            {
              maxHeight,
            },
            animatedShadowStyle,
            sheetMotion.sheetStyle,
          ]}
        >
          <AppView
            style={[
              styles.sheetSurface,
              {
                backgroundColor: surfaceColor,
                maxHeight,
              },
              contentStyle,
            ]}
          >
            {showHandle && (
              <GestureDetector gesture={sheetMotion.gesture}>
                <AppView
                  testID={handleTestID}
                  center
                  className="pt-2 pb-1"
                  {...sheetMotion.panHandlers}
                >
                  <AppView style={styles.handle} />
                </AppView>
              </GestureDetector>
            )}
            {children}
          </AppView>
        </Animated.View>
      </AppView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(156,163,175,0.7)',
  },
  sheetShadow: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetSurface: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
});
