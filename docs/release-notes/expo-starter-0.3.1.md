# @gaozh1024/expo-starter 0.3.1 Release Notes

`0.3.1` publishes the default script and release helper additions that landed after `0.3.0` was already released.

## What Changed

- Add default scripts for env switching, `expo run`, Android release builds, Web exports, OTA manifest helpers, and rn-observatory sourcemap publishing.
- Include template-safe `.env.local.dev`, `.env.local.server`, and `.env.production` placeholder files.
- Include `@gaozh1024/hot-updater ^0.2.0` so the default `ota:*` scripts work after template install.
- Add template release helper scripts under `scripts/`.
- Document the new scripts in the template README and AI artifacts.

## Notes

The env files contain placeholder public values only. Replace `EXPO_PUBLIC_API_BASE_URL` before using staging or production release scripts.
