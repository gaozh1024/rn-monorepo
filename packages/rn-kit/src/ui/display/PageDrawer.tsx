import React from 'react';
import { BackHandler, Modal, StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useThemeColors } from '@/theme';
import { useMotionConfig, type PressMotionProps, type SheetMotionProps } from '@/ui/motion';
import { createReanimatedView } from '@/ui/motion/components/ReanimatedView';
import { AppPressable, AppScrollView, AppText, AppView } from '@/ui/primitives';
import { useSheetMotion } from '../motion/hooks/useSheetMotion';
import { Icon } from './Icon';

export interface PageDrawerProps extends SheetMotionProps, PressMotionProps {
  visible: boolean;
  onClose?: () => void;
  title?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  placement?: 'left' | 'right';
  width?: number;
  swipeEnabled?: boolean;
  swipeThreshold?: number;
  closeOnBackdropPress?: boolean;
  showCloseButton?: boolean;
  children?: React.ReactNode;
  testID?: string;
  contentTestID?: string;
  backdropTestID?: string;
}

export function PageDrawer({
  visible,
  onClose,
  title,
  header,
  footer,
  placement = 'right',
  width = 320,
  swipeEnabled = true,
  swipeThreshold = 80,
  closeOnBackdropPress = true,
  showCloseButton = true,
  motionPreset,
  motionOpenDuration,
  motionCloseDuration,
  motionDistance = width,
  motionOverlayOpacity = 1,
  motionSwipeThreshold,
  motionVelocityThreshold,
  motionReduceMotion,
  motionDuration,
  children,
  testID,
  contentTestID = 'page-drawer-content',
  backdropTestID = 'page-drawer-backdrop',
}: PageDrawerProps) {
  const motionConfig = useMotionConfig();
  const colors = useThemeColors();
  const resolvedMotionPreset = motionPreset ?? motionConfig.defaultPressPreset ?? 'soft';
  const handleClose = React.useCallback(() => {
    onClose?.();
  }, [onClose]);
  const sheetMotion = useSheetMotion({
    visible,
    placement,
    duration: motionDuration,
    openDuration: motionOpenDuration,
    closeDuration: motionCloseDuration,
    distance: motionDistance,
    overlayOpacity: motionOverlayOpacity,
    closeOnSwipe: swipeEnabled,
    swipeThreshold: motionSwipeThreshold ?? swipeThreshold,
    velocityThreshold: motionVelocityThreshold,
    reduceMotion: motionReduceMotion,
    onRequestClose: handleClose,
  });

  React.useEffect(() => {
    if (!visible) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });

    return () => subscription.remove();
  }, [handleClose, visible]);

  if (!sheetMotion.mounted) return null;

  const drawerContent = (
    <GestureDetector gesture={sheetMotion.gesture}>
      {createReanimatedView(
        { style: sheetMotion.sheetStyle },
        <AppView
          testID={contentTestID}
          className="h-full"
          style={[
            styles.drawer,
            {
              width,
              backgroundColor: colors.card,
              borderLeftWidth: placement === 'right' ? 0.5 : 0,
              borderRightWidth: placement === 'left' ? 0.5 : 0,
              borderLeftColor: colors.border,
              borderRightColor: colors.border,
            },
          ]}
          {...sheetMotion.panHandlers}
        >
          {(header || title || showCloseButton) && (
            <AppView
              row
              items="center"
              between
              className="px-4 py-4"
              style={[styles.header, { borderBottomColor: colors.divider }]}
            >
              <AppView flex>
                {header ||
                  (title ? (
                    <AppText size="lg" weight="semibold">
                      {title}
                    </AppText>
                  ) : null)}
              </AppView>
              {showCloseButton && (
                <AppPressable
                  testID="page-drawer-close"
                  className="p-1"
                  pressedClassName="opacity-70"
                  motionPreset={resolvedMotionPreset}
                  motionDuration={motionDuration}
                  motionReduceMotion={motionReduceMotion}
                  onPress={handleClose}
                >
                  <Icon name="close" size="md" color={colors.textSecondary} />
                </AppPressable>
              )}
            </AppView>
          )}

          <AppScrollView flex className="px-4 py-4">
            {children}
          </AppScrollView>

          {footer && (
            <AppView
              className="px-4 py-4"
              style={[styles.footer, { borderTopColor: colors.divider }]}
            >
              {footer}
            </AppView>
          )}
        </AppView>
      )}
    </GestureDetector>
  );

  return (
    <Modal
      visible={sheetMotion.mounted}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <AppView
        testID={testID}
        flex
        row
        style={{ backgroundColor: 'transparent' }}
        justify={placement === 'right' ? 'end' : 'start'}
      >
        {createReanimatedView({
          pointerEvents: 'none',
          style: [
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0,0,0,0.5)' },
            sheetMotion.overlayStyle,
          ],
        })}

        {placement === 'left' && drawerContent}

        <AppPressable
          testID={backdropTestID}
          className="flex-1"
          onPress={closeOnBackdropPress ? handleClose : undefined}
          motionPreset="none"
          motionReduceMotion
        />

        {placement === 'right' && drawerContent}
      </AppView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawer: {
    height: '100%',
  },
  header: {
    borderBottomWidth: 0.5,
  },
  footer: {
    borderTopWidth: 0.5,
  },
});
