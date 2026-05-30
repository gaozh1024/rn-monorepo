# rn-kit 0.5.6 Publish Checklist

Date: 2026-05-30

## Package

- Package: `@gaozh1024/rn-kit`
- Version: `0.5.6`
- Access: public

## Release Scope

- Switch streaming requests to Expo's `expo/fetch` by default
- Keep `fetcher` injection for custom transports and tests
- Add `readApiSSEStream` `onMessage(event, data, message)` callback
- Default missing SSE event names to `message`
- Support CRLF SSE frame boundaries
- Add Expo starter `stream-sse.ts` recipe
- Update streaming docs, AI artifacts, changelog, and release notes

## Completed Verification

- [x] `pnpm ai:check`
- [x] `pnpm --dir packages/rn-kit typecheck`
- [x] `pnpm --dir packages/rn-kit test`
- [x] `pnpm --dir packages/rn-kit build`
- [x] `pnpm --dir templates/expo-starter lint`
- [x] `npm_config_cache=/tmp/rn-kit-npm-cache npm pack --dry-run`

## Notes

- Full rn-kit test result: `102` test files passed, `482` tests passed.
- The test run still prints the pre-existing `Managed block markers are broken in AGENTS.md` message.
- The test run still prints a pre-existing React `act(...)` warning in `AppInput.test.tsx`.
- `npm pack --dry-run` produced `gaozh1024-rn-kit-0.5.6.tgz`.
- Dry-run package size: `949.9 kB`.
- Dry-run unpacked size: `4.6 MB`.
- Dry-run file count: `21`.

## Publish Command

```bash
pnpm --dir packages/rn-kit publish --access public
```

If publishing through Changesets instead, confirm only intended packages are versioned, then run:

```bash
pnpm changeset status
pnpm release
```
