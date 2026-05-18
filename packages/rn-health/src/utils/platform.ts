import { Platform } from 'react-native';
import type { AppHealthDeviceInfo } from '../core/types';

export function getDeviceInfo(): AppHealthDeviceInfo {
  const platform = ['ios', 'android', 'web', 'windows', 'macos'].includes(String(Platform.OS))
    ? (Platform.OS as AppHealthDeviceInfo['platform'])
    : 'unknown';

  return {
    platform,
    osVersion: Platform.Version ? String(Platform.Version) : undefined,
  };
}
