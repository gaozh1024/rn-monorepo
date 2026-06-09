# Changelog

## 0.2.0

- Add Expo SDK 55 compatibility while preserving React Native 0.81 / Expo SDK 54 project support.
- Move the package development baseline to React 19.2 and React Native 0.83.
- Update `@hot-updater/expo` and peer compatibility to the current SDK 55-compatible line.

## 0.1.1

- Honor `release.disabled` in OTA manifests so paused releases are treated as no update.
- Default missing `release.force` values to non-force updates.
- Allow launch update checks to retry after returned or thrown startup check failures.
- Add Vitest regression coverage for manifest decisions and launch retry behavior.
- Align release script documentation, AI metadata, and native integration guidance with the current runtime behavior.

## 0.1.0

- Initial release for migrating the internal hot updater package into the framework monorepo.
- Includes OTA manifest helpers, runtime/provider wrappers, default fallback UI, and local release scripts.
