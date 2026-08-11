/**
 * Alert 弹窗组件
 * @module overlay/alert/component
 */

import { PresenceSurface } from '@/ui/motion/components/PresenceSurface';
import { Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { AppView, AppText } from '@/ui';
import { useThemeColors } from '@/theme';
import { useMotionConfig, usePresenceMotion } from '@/ui/motion';
import type { AlertOptions } from './types';

type AlertModalProps = AlertOptions & {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onExited?: () => void;
};

/**
 * Alert 弹窗组件
 */
export function AlertModal({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  showCancel,
  motionPreset,
  motionDuration,
  motionEnterDuration,
  motionExitDuration,
  motionDistance,
  motionReduceMotion,
  onConfirm,
  onCancel,
  onExited,
}: AlertModalProps) {
  const motionConfig = useMotionConfig();
  const colors = useThemeColors();
  const presence = usePresenceMotion({
    visible,
    preset: motionPreset ?? motionConfig.defaultPresencePreset ?? 'dialog',
    duration: motionDuration,
    enterDuration: motionEnterDuration,
    exitDuration: motionExitDuration,
    distance: motionDistance,
    reduceMotion: motionReduceMotion,
    unmountOnExit: true,
    onExited,
  });

  if (!presence.mounted) return null;

  return (
    <Modal transparent visible={presence.mounted} animationType="none">
      <AppView style={styles.container}>
        <PresenceSurface style={[styles.overlay, presence.overlayAnimatedStyle]} />
        <PresenceSurface
          style={[
            styles.alertBox,
            { backgroundColor: colors.surfaceContainerLowest },
            presence.animatedStyle,
          ]}
        >
          {title && (
            <AppText
              className="text-center"
              style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 8 }}
            >
              {title}
            </AppText>
          )}
          {message && (
            <AppText
              className="text-center"
              style={{
                fontSize: 14,
                lineHeight: 21,
                color: colors.textSecondary,
                marginBottom: 20,
              }}
            >
              {message}
            </AppText>
          )}
          <AppView row style={styles.buttonRow}>
            {showCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.72}
                style={[
                  styles.button,
                  styles.buttonFlex,
                  styles.cancelButton,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.divider,
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <AppText style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
                  {cancelText || '取消'}
                </AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.85}
              style={[styles.button, styles.buttonFlex, { backgroundColor: colors.primary }]}
            >
              <AppText style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                {confirmText || '确定'}
              </AppText>
            </TouchableOpacity>
          </AppView>
        </PresenceSurface>
      </AppView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  alertBox: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    margin: 32,
    width: 320,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFlex: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  cancelButton: {
    marginRight: 12,
  },
});
