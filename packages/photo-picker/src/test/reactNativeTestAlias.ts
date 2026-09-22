/**
 * Minimal `react-native` stand-in for Node-based unit tests. Tests mutate
 * `Platform.OS` directly to exercise the per-platform branches. The union
 * matches react-native's PlatformOSType so assignments type-check against the
 * real typings.
 */
export type PlatformOSTestValue = 'ios' | 'android' | 'windows' | 'macos' | 'web';

export const Platform = { OS: 'android' as PlatformOSTestValue };
