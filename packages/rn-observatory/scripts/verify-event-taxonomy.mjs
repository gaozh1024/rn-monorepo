#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageDir, '..', '..');
const appObservatoryRoot = path.resolve(repoRoot, '..', 'app-observatory');

const taxonomyFile = path.join(packageDir, 'src/core/event-taxonomy.ts');
const adminConstantsFile = path.join(appObservatoryRoot, 'admin/src/api/constants.ts');
const openApiFile = path.join(appObservatoryRoot, 'contracts/openapi.yaml');

const taxonomySource = await readFile(taxonomyFile, 'utf8');
const adminConstantsSource = await readFile(adminConstantsFile, 'utf8');
const openApiSource = await readFile(openApiFile, 'utf8');

const lifecycle = extractStringArray(taxonomySource, 'appObservatoryLifecycleEventTypes');
const errors = extractStringArray(taxonomySource, 'appObservatoryErrorEventTypes');
const analytics = extractStringArray(taxonomySource, 'appObservatoryAnalyticsEventTypes');
const custom = extractStringArray(taxonomySource, 'appObservatoryCustomEventTypes');
const canonical = [...lifecycle, ...errors, ...analytics, ...custom];

const admin = extractStringArray(adminConstantsSource, 'appHealthEventTypes');
const openApi = extractYamlEnum(openApiSource);

assertEqualList('admin constants', canonical, admin);
assertEqualList('OpenAPI HealthEvent.type enum', canonical, openApi);

console.log('event taxonomy verified');
console.log(`canonical: ${canonical.join(', ')}`);

function extractStringArray(source, constName) {
  const pattern = new RegExp(
    `export const ${constName} = \\[(?<body>[\\s\\S]*?)\\] as const;`,
    'm'
  );
  const match = source.match(pattern);
  if (!match?.groups?.body) {
    throw new Error(`Unable to find array for ${constName}`);
  }

  return [...match.groups.body.matchAll(/'([^']+)'/g)].map(matchItem => matchItem[1]);
}

function extractYamlEnum(source) {
  const blockMatch = source.match(
    /HealthEvent:\n(?:.*\n)*?\s+type:\n\s+type:\s+string\n\s+enum:\n(?<body>(?:\s+- .*\n)+)/m
  );
  if (!blockMatch?.groups?.body) {
    throw new Error('Unable to find HealthEvent.type enum in OpenAPI');
  }

  return blockMatch.groups.body
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^- /, ''));
}

function assertEqualList(label, expected, actual) {
  if (expected.length !== actual.length || expected.some((value, index) => actual[index] !== value)) {
    throw new Error(
      `${label} mismatch.\nexpected: ${expected.join(', ')}\nactual:   ${actual.join(', ')}`
    );
  }
}
