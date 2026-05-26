# Maintainer Governance

This document is for maintainers of `@gaozh1024/rn-observatory`.

The package should now be maintained as the official SDK surface for the `app-observatory` platform. The goal is not to keep adding isolated features, but to keep three mature product lanes stable, unified, and official:

1. `Analytics`
2. `Release / Symbolication`
3. `Crash / Alerts`

## 1. Maintenance principle

Before adding a new SDK feature, ask:

- does it strengthen one of the three platform lanes?
- does it make the official integration path more stable?
- does it reduce drift between SDK, backend, admin, and docs?

If the answer is “no”, it is probably not the current maintenance priority.

## 2. The three official lanes

### Analytics

This lane exists to feed:

- screen stats
- user/device drill-down
- analytics timelines
- version / device / platform distributions

Maintainers should protect:

- `trackScreen()`
- `trackEvent()`
- navigation auto tracking
- anonymous identity conventions
- device info recipes
- analytics naming/schema docs

Primary docs:

- `docs/event-taxonomy.md`
- `docs/analytics-schema.md`
- `docs/analytics-tracking-template.md`
- `docs/device-info-recipes.md`

### Release / Symbolication

This lane exists to feed:

- release health
- issue-to-release attribution
- source map artifact registration
- symbolicated stack traces

Maintainers should protect:

- `release` metadata
- release CLI commands
- source map upload templates
- artifact naming consistency
- symbolication-facing documentation

Primary docs:

- `docs/release-integration.md`
- `docs/github-actions-release-example.md`
- `docs/expo-eas-release-template.md`
- `docs/react-native-cli-release-template.md`

### Crash / Alerts

This lane exists to feed:

- fatal / error issue generation
- alerting
- native crash replay
- crash context correlation

Maintainers should protect:

- global JS error capture
- unhandled rejection capture
- `nativeCrashAdapter`
- pending native crash report shape
- crash adapter recipes

Primary docs:

- `docs/native-crash-adapters.md`
- `docs/native-crash-bridge-template.md`
- `docs/sentry-native-crash-recipe.md`
- `docs/crashlytics-native-crash-recipe.md`

## 3. Source-of-truth rules

### Event taxonomy

Canonical source:

- `src/core/event-taxonomy.ts`

Public runtime contract:

- `src/index.ts`
- `src/core/types.ts`

Mirrored platform surfaces:

- `app-observatory/admin/src/api/constants.ts`
- `app-observatory/contracts/openapi.yaml`

Required maintainer commands:

```bash
pnpm --dir packages/rn-observatory sync:taxonomy
pnpm --dir packages/rn-observatory verify:taxonomy
```

Do not manually edit mirrored taxonomy lists without re-running sync/verify.

### Public API

Treat these as stable product-facing entry points:

- `AppObservatoryProvider`
- `useAppObservatory`
- `createAppObservatoryClient`
- event taxonomy exports
- queue/storage exports
- transport exports
- navigation tracking helper
- release CLI

Any behavioral change to these surfaces should be reflected in:

- README
- Mobile integration guide
- app usage guide
- relevant recipe/template docs

## 4. Release gates for maintainers

Before claiming a release is ready, run:

```bash
pnpm --dir packages/rn-observatory verify:taxonomy
pnpm --dir packages/rn-observatory test
pnpm --dir packages/rn-observatory typecheck
pnpm --dir packages/rn-observatory build
```

If the change touched mirrored platform taxonomy or docs, also verify the backend console side:

```bash
pnpm --dir /Users/gzh/Projects/framework/app-observatory/admin typecheck
pnpm --dir /Users/gzh/Projects/framework/app-observatory/admin build
```

## 5. What counts as a high-priority change

Prioritize changes that:

- reduce SDK/backend/admin drift
- improve official recipes/templates
- stabilize event semantics
- improve release/source-map/symbolication accuracy
- improve crash replay and alert reliability
- improve analytics data quality

De-prioritize changes that:

- add unrelated novelty features
- create one-off app-specific abstractions
- widen public API without a platform-backed need

## 6. Roadmap shape

Near-term maintenance should focus on:

1. keeping taxonomy, docs, and platform contracts aligned
2. keeping templates and recipes production-usable
3. tightening symbolication and release workflow quality
4. keeping analytics payload quality high
5. keeping crash adapter guidance official and current

## 7. Definition of “done” for this package direction

The package direction is healthy only if all three are true:

1. the SDK is stable in behavior
2. the platform contracts are unified
3. the official docs/templates are sufficient for app teams to integrate without guesswork
