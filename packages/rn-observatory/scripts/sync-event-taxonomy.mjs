#!/usr/bin/env node

import { access, readFile, writeFile } from 'node:fs/promises';
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
const hasAppObservatory = await fileExists(adminConstantsFile) && await fileExists(openApiFile);

if (!hasAppObservatory) {
  console.error(
    `Cannot synchronize event taxonomy because ${appObservatoryRoot} is not available.`
  );
  console.error('Clone or mount the app-observatory repository next to rn-monorepo, then rerun this command.');
  process.exit(1);
}

const adminConstantsSource = await readFile(adminConstantsFile, 'utf8');
const openApiSource = await readFile(openApiFile, 'utf8');

const lifecycle = extractStringArray(taxonomySource, 'appObservatoryLifecycleEventTypes');
const errors = extractStringArray(taxonomySource, 'appObservatoryErrorEventTypes');
const analytics = extractStringArray(taxonomySource, 'appObservatoryAnalyticsEventTypes');
const custom = extractStringArray(taxonomySource, 'appObservatoryCustomEventTypes');
const canonical = [...lifecycle, ...errors, ...analytics, ...custom];

const nextAdminConstants = replaceAdminConstants(adminConstantsSource, canonical);
const nextOpenApi = replaceOpenApiEnum(openApiSource, canonical);

await writeFile(adminConstantsFile, nextAdminConstants);
await writeFile(openApiFile, nextOpenApi);

console.log('event taxonomy synchronized');
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

  return [...match.groups.body.matchAll(/'([^']+)'/g)].map(item => item[1]);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function replaceAdminConstants(source, values) {
  const blockPattern =
    /export const appHealthEventTypes = \[(?<body>[\s\S]*?)\] as const;/m;
  const match = source.match(blockPattern);
  if (!match?.groups?.body) {
    throw new Error('Unable to find appHealthEventTypes in admin constants');
  }

  const nextBlock = `export const appHealthEventTypes = [\n${values
    .map(value => `  '${value}',`)
    .join('\n')}\n] as const;`;

  return source.replace(blockPattern, nextBlock);
}

function replaceOpenApiEnum(source, values) {
  const blockPattern =
    /(HealthEvent:\n(?:.*\n)*?\s+type:\n\s+type:\s+string\n)\s+enum:\n(?:\s+- .*\n)+/m;
  const match = source.match(blockPattern);
  if (!match) {
    throw new Error('Unable to find HealthEvent.type enum in OpenAPI');
  }

  const enumBlock = `${match[1]}          enum:\n${values
    .map(value => `            - ${value}`)
    .join('\n')}\n`;

  return source.replace(blockPattern, enumBlock);
}
