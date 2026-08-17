import type { ReactNode } from 'react';
import { Modal, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedStyle } from 'react-native-reanimated';
import { AppPressable, AppView } from '@/ui/primitives';
import { createReanimatedView } from '@/ui/motion/components/ReanimatedView';
import type { SheetMotionProps } from '../motion';
import type { UseSheetMotionReturn } from '../motion/hooks/useSheetMotion';
import { useSheetMotion } from '../motion/hooks/useSheetMotion';

const SHEET_CLOSED_OFFSET = 240;

function getNumericPaddingBottom(style: StyleProp<ViewStyle>) {
  const flattened = StyleSheet.flatten(style);

  if (!flattened) return 0;

  const paddingBottom =
    typeof flattened.paddingBottom === 'number'
      ? flattened.paddingBottom
      : typeof flattened.paddingVertical === 'number'
        ? flattened.paddingVertical
        : typeof flattened.padding === 'number'
          ? flattened.padding
          : 0;

  return paddingBottom;
}

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

interface BottomSheetModalContentProps {
  sheetMotion: UseSheetMotionReturn;
  onRequestClose: () => void;
  overlayColor: string;
  surfaceColor: string;
  children: ReactNode;
  closeOnBackdropPress: boolean;
  maxHeight: number | `${number}%`;
  showHandle: boolean;
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
  backdropTestID: string;
  handleTestID: string;
}

function BottomSheetModalContent({
  sheetMotion,
  onRequestClose,
  overlayColor,
  surfaceColor,
  children,
  closeOnBackdropPress,
  maxHeight,
  showHandle,
  contentClassName,
  contentStyle,
  backdropTestID,
  handleTestID,
}: BottomSheetModalContentProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = getNumericPaddingBottom(contentStyle) + Math.max(insets.bottom, 0);
  const { mounted, progress } = sheetMotion;
  const animatedShadowStyle = useAnimatedStyle(() => {
    const animatedProgress = progress?.value ?? (mounted ? 1 : 0);
    const shadowOpacity = 0.12 * animatedProgress;
    const elevation = 12 * animatedProgress;

    return {
      shadowOpacity,
      elevation,
    };
  }, [mounted, progress]);

  return (
    <Modal
      visible={sheetMotion.mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose}
    >
      <AppView flex style={styles.modalRoot}>
        {createReanimatedView({
          cssInterop: false,
          pointerEvents: 'none',
          style: [
            StyleSheet.absoluteFillObject,
            { backgroundColor: overlayColor },
            sheetMotion.overlayStyle,
          ],
        })}

        {closeOnBackdropPress && (
          <AppPressable
            testID={backdropTestID}
            style={StyleSheet.absoluteFillObject}
            motionPreset="none"
            onPress={onRequestClose}
          />
        )}

        {createReanimatedView(
          {
            cssInterop: false,
            style: [
              styles.sheetShadow,
              {
                maxHeight,
              },
              animatedShadowStyle,
              sheetMotion.sheetStyle,
            ],
          },
          <AppView
            className={contentClassName}
            style={[
              styles.sheetSurface,
              {
                backgroundColor: surfaceColor,
                maxHeight,
              },
              contentStyle,
              { paddingBottom: bottomPadding },
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
        )}
      </AppView>
    </Modal>
  );
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

  if (!sheetMotion.mounted) {
    return null;
  }

  return (
    <BottomSheetModalContent
      sheetMotion={sheetMotion}
      onRequestClose={onRequestClose}
      overlayColor={overlayColor}
      surfaceColor={surfaceColor}
      closeOnBackdropPress={closeOnBackdropPress}
      maxHeight={maxHeight}
      showHandle={showHandle}
      contentClassName={contentClassName}
      contentStyle={contentStyle}
      backdropTestID={backdropTestID}
      handleTestID={handleTestID}
    >
      {children}
    </BottomSheetModalContent>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(156,163,175,0.7)',
  },
  modalRoot: {
    flex: 1,
  },
  sheetShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
