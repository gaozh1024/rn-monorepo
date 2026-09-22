/**
 * Minimal `expo-modules-core` stand-in for Node-based unit tests. Tests set
 * `nativeModuleRegistry.factory` to control what `requireNativeModule` returns
 * (or throws) per case.
 */
export const nativeModuleRegistry = {
  factory: (_name: string): unknown => {
    throw new Error('No native module stub configured for this test');
  },
};

export function requireNativeModule<T>(name: string): T {
  return nativeModuleRegistry.factory(name) as T;
}
