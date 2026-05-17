import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const packageTargets = [
  { id: 'rn-kit', dir: 'packages/rn-kit' },
  { id: 'rn-health', dir: 'packages/rn-health' },
  { id: 'aliyun-speech', dir: 'packages/aliyun-speech' },
  { id: 'photo-album-picker', dir: 'packages/photo-album-picker' },
  { id: 'aliyun-push', dir: 'packages/aliyun-push' },
  { id: 'hot-updater', dir: 'packages/hot-updater' },
  { id: 'expo-starter', dir: 'templates/expo-starter' },
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function projectTypesForPackage(pkg, role) {
  if (role === 'template') return ['template'];
  const peerDeps = Object.keys(pkg.peerDependencies || {});
  const deps = Object.keys(pkg.dependencies || {});
  const hasExpo = peerDeps.includes('expo') || deps.includes('expo');
  const hasReactNative = peerDeps.includes('react-native') || deps.includes('react-native');

  if (hasExpo && hasReactNative) return ['expo', 'react-native'];
  if (hasReactNative) return ['react-native'];
  return ['node'];
}

function entrypointsForPackage(pkg) {
  const exportsField = pkg.exports || {};
  const keys = Object.keys(exportsField);

  if (keys.length === 0) {
    return [{ path: '.', kind: 'runtime', recommended: true }];
  }

  return keys.map(key => ({
    path: key,
    kind: key.includes('plugin') ? 'plugin' : 'runtime',
    recommended: key === '.',
  }));
}

function recommendedUsageForPackage(target, override) {
  const usage = {
    minimumSetup: override.requiredProjectSetup || [],
  };

  if (target.id === 'rn-kit') {
    usage.primaryProvider = 'AppProvider';
    usage.canonicalTemplate = 'templates/expo-starter';
  }

  if (target.id !== 'expo-starter' && target.id !== 'rn-kit') {
    usage.canonicalTemplate = 'templates/expo-starter';
  }

  return usage;
}

function docsForTarget(target) {
  const docs = ['README.md', 'AI_USAGE.md'];

  if (target.id === 'rn-kit') {
    docs.push('TAILWIND_SETUP.md');
  }

  if (target.id === 'hot-updater') {
    docs.push('docs/integration.md', 'docs/manifest-spec.md');
  }

  return docs;
}

function buildManifest(target) {
  const pkg = readJson(path.join(target.dir, 'package.json'));
  const override = readJson(path.join('ai/overrides', `${target.id}.json`));

  return {
    schemaVersion: 1,
    packageName: pkg.name,
    version: pkg.version,
    role: override.role,
    summary: override.summary,
    entrypoints: entrypointsForPackage(pkg),
    installation: {
      packageManagerCommand:
        override.role === 'template' ? `npx create-expo-app@latest my-app --template ${pkg.name}` : `pnpm add ${pkg.name}`,
      projectTypes: projectTypesForPackage(pkg, override.role),
      peerDependencies: pkg.peerDependencies || {},
    },
    recommendedUsage: recommendedUsageForPackage(target, override),
    stableApis: override.stableApis || [],
    compatibilityNotes: override.compatibilityNotes || [],
    antiPatterns: override.antiPatterns || [],
    canonicalExamples: override.canonicalExamples || [],
    docs: docsForTarget(target),
  };
}

function renderAiUsage(target) {
  const pkg = readJson(path.join(target.dir, 'package.json'));
  const override = readJson(path.join('ai/overrides', `${target.id}.json`));
  const manifest = buildManifest(target);

  const lines = [
    `# ${pkg.name} AI Usage`,
    '',
    '## What It Is',
    override.summary,
    '',
    '## When To Use',
    ...toBullets(override.whenToUse),
    '',
    '## When Not To Use',
    ...toBullets(override.whenNotToUse),
    '',
    '## Recommended Entry',
    ...toBullets(override.recommendedEntry),
    '',
    '## Install Prerequisites',
    ...toBullets(renderInstallFacts(pkg)),
    '',
    '## Required Project Setup',
    ...toBullets(override.requiredProjectSetup),
    '',
    '## Minimal Working Example',
    ...toBullets(
      (override.canonicalExamples || []).slice(0, 2).map(example => `${example.name}: ${example.path}`),
    ),
    '',
    '## Canonical Patterns',
    ...toBullets(
      manifest.stableApis.map(api => `Prefer the stable public API \`${api}\` when it matches the use case.`),
    ),
    '',
    '## Anti-Patterns',
    ...toBullets(override.antiPatterns),
    '',
    '## Common Failure Cases',
    ...toBullets(override.commonFailureCases),
    '',
    '## Compatibility Baseline',
    ...toBullets(override.compatibilityNotes),
    '',
    '## See Also',
    ...toBullets(manifest.docs),
    '',
  ];

  return lines.join('\n');
}

function renderLlmsTxt(targets) {
  const packageLines = targets.map(target => {
    const pkg = readJson(path.join(target.dir, 'package.json'));
    const override = readJson(path.join('ai/overrides', `${target.id}.json`));
    return `- ${pkg.name}: ${override.summary}`;
  });

  return [
    'Project: Panther Expo Framework Monorepo',
    '',
    'Primary packages:',
    ...packageLines,
    '',
    'Default guidance:',
    '- Prefer AppProvider over bare ThemeProvider in Panther-based apps.',
    '- In Expo projects, install native dependencies with expo install before trusting plain npm resolution.',
    '- Treat NativeWind and Tailwind configuration as mandatory for rn-kit UI styling.',
    '- Prefer stable public APIs and canonical examples over guessing from internal files.',
    '- Use @gaozh1024/expo-starter as the canonical app integration reference.',
    '',
    'Canonical references:',
    '- packages/rn-kit/AI_USAGE.md',
    '- docs/02-架构设计/公共API清单.md',
    '- templates/expo-starter/AI_USAGE.md',
    '',
  ].join('\n');
}

function toBullets(items) {
  if (!items || items.length === 0) return ['- None'];
  return items.map(item => `- ${item}`);
}

function renderInstallFacts(pkg) {
  const facts = [`Install command: ${pkg.name ? `pnpm add ${pkg.name}` : 'See package README.'}`];
  const peerDeps = Object.keys(pkg.peerDependencies || {});

  if (peerDeps.length > 0) {
    facts.push(`Peer dependencies: ${peerDeps.join(', ')}`);
  }

  return facts;
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeOrCheck(relativePath, content, checkMode, mismatches) {
  const absolutePath = path.join(repoRoot, relativePath);
  const current = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null;

  if (checkMode) {
    if (current !== content) mismatches.push(relativePath);
    return;
  }

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

export function generateArtifacts({ check = false } = {}) {
  const mismatches = [];

  writeOrCheck('llms.txt', renderLlmsTxt(packageTargets), check, mismatches);

  for (const target of packageTargets) {
    writeOrCheck(path.join(target.dir, 'AI_USAGE.md'), renderAiUsage(target), check, mismatches);
    writeOrCheck(path.join(target.dir, 'ai-manifest.json'), stableStringify(buildManifest(target)), check, mismatches);
  }

  return mismatches;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedPath === __filename) {
  const checkMode = process.argv.includes('--check');
  const mismatches = generateArtifacts({ check: checkMode });

  if (checkMode) {
    if (mismatches.length > 0) {
      console.error('AI artifacts are out of date:');
      for (const mismatch of mismatches) console.error(`- ${mismatch}`);
      process.exit(1);
    }

    console.log('AI artifacts are up to date.');
  } else {
    console.log('Generated AI artifacts.');
  }
}
