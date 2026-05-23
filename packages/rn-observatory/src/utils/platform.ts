import { Platform } from 'react-native';
import type { AppObservatoryDeviceInfo } from '../core/types';

export function getDeviceInfo(): AppObservatoryDeviceInfo {
  const platform = ['ios', 'android', 'web', 'windows', 'macos'].includes(String(Platform.OS))
    ? (Platform.OS as AppObservatoryDeviceInfo['platform'])
    : 'unknown';

  return {
    platform,
    osVersion: Platform.Version ? String(Platform.Version) : undefined,
  };
}
