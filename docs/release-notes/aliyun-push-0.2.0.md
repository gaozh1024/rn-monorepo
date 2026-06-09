# @gaozh1024/aliyun-push 0.2.0 Release Notes

`0.2.0` aligns the Aliyun Push package with the Expo SDK 55 framework baseline while keeping Expo SDK 54 compatibility.

## Changes

- Peer dependencies now cover Expo `>=54 <56` and React Native `>=0.81 <0.84`.
- Development dependencies move to Expo SDK 55, React `19.2.0`, and React Native `0.83.6`.
- The Expo config plugin run-once version is updated to `0.2.0`.
- Documentation now describes the SDK 54/55 support window instead of the older SDK 53/54 wording.

## Compatibility

Expo SDK 54 apps can continue using the package without adopting the SDK 55 native dependency line. Expo SDK 55 apps should install dependencies through `npx expo install` and rebuild the development client after changing native push configuration.
