#!/usr/bin/env node

import { expo as createExpoBuildPlugin } from '@hot-updater/expo';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }

    result[key] = next;
    index += 1;
  }

  return result;
}

function requireArg(args, key) {
  const value = args[key];
  if (!value) {
    throw new Error(`Missing required argument: --${key}`);
  }
  return value;
}

function toBoolean(value) {
  return value === 'true';
}

async function readFileMeta(filePath) {
  const buffer = await readFile(filePath);
  const sha256 = createHash('sha256').update(buffer).digest('hex');

  return {
    sha256,
    size: buffer.byteLength,
  };
}

function run(command, args, workdir) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workdir,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
    });
  });
}

async function ensureFileExists(filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new Error(`${filePath} is not a file`);
    }
  } catch (error) {
    throw new Error(`Expected file was not generated: ${filePath}`);
  }
}

async function zipDirectory(sourceDir, outputFile) {
  await run('zip', ['-q', '-r', outputFile, '.'], sourceDir);
}

async function removeEmptyParents(startDir, stopDir) {
  let currentDir = startDir;
  const normalizedStopDir = path.resolve(stopDir);

  while (currentDir.startsWith(normalizedStopDir) && currentDir !== normalizedStopDir) {
    try {
      await rm(currentDir);
      currentDir = path.dirname(currentDir);
    } catch {
      break;
    }
  }

  try {
    await rm(normalizedStopDir);
  } catch {}
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const platform = requireArg(args, 'platform');
  const channel = requireArg(args, 'channel');
  const requestedBundleId = args['bundle-id'] ?? null;
  const appVersion = requireArg(args, 'app-version');
  const manifestBaseURL = requireArg(args, 'manifest-base-url');
  const notes = args.notes ?? '';
  const minNativeVersion = args['min-native-version'] ?? appVersion;
  const force = toBoolean(args.force);
  const disabled = toBoolean(args.disabled);
  const outputRoot = path.resolve(args.output ?? 'ota-releases');
  const tempDir = path.join(outputRoot, '.tmp', platform, channel, requestedBundleId ?? 'pending');
  const tempBuildPath = path.join(tempDir, 'build');

  await rm(tempDir, { recursive: true, force: true });
  await removeEmptyParents(path.dirname(tempDir), path.join(outputRoot, '.tmp'));
  await mkdir(tempDir, { recursive: true });

  const relativeBuildPath = path.relative(process.cwd(), tempBuildPath);
  const buildPlugin = createExpoBuildPlugin({
    outDir: relativeBuildPath,
    sourcemap: false,
  })({ cwd: process.cwd() });

  const buildResult = await buildPlugin.build({ platform });
  const sourceBuildPath = buildResult?.buildPath ?? tempBuildPath;
  const bundleIdPath = path.join(sourceBuildPath, 'BUNDLE_ID');
  await ensureFileExists(bundleIdPath);
  const actualBundleId = (await readFile(bundleIdPath, 'utf8')).trim();
  if (!actualBundleId) {
    throw new Error('Failed to resolve actual bundleId from BUNDLE_ID.');
  }

  if (requestedBundleId && requestedBundleId !== actualBundleId) {
    console.warn(
      `[ota:prepare] 忽略手动传入的 bundleId=${requestedBundleId}，将使用构建产物真实 bundleId=${actualBundleId}`,
    );
  }

  const finalBundlePath = path.join(outputRoot, 'bundles', platform, channel, `${actualBundleId}.zip`);
  const manifestPath = path.join(outputRoot, 'manifest', platform, `${channel}.json`);
  const bundleUrl = `${manifestBaseURL.replace(/\/+$/, '').replace(/\/manifest$/, '')}/bundles/${platform}/${channel}/${actualBundleId}.zip`;

  await mkdir(path.dirname(finalBundlePath), { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await zipDirectory(sourceBuildPath, finalBundlePath);

  const meta = await readFileMeta(finalBundlePath);

  const manifest = {
    schemaVersion: 1,
    platform,
    channel,
    updatedAt: new Date().toISOString(),
    release: {
      bundleId: actualBundleId,
      appVersion,
      minNativeVersion,
      force,
      notes,
      url: bundleUrl,
      sha256: meta.sha256,
      size: meta.size,
      disabled,
    },
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rm(tempDir, { recursive: true, force: true });

  console.log(
    JSON.stringify(
      {
        outputRoot,
        bundle: finalBundlePath,
        manifest: manifestPath,
        bundleUrl,
        manifestUrl: `${manifestBaseURL.replace(/\/+$/, '')}/${platform}/${channel}/${appVersion}.json`,
        requestedBundleId,
        actualBundleId,
        bundleObjectKey: `bundles/${platform}/${channel}/${actualBundleId}.zip`,
        manifestObjectKey: `manifest/${platform}/${channel}/${appVersion}.json`,
        builtBy: buildPlugin.name,
        sha256: meta.sha256,
        size: meta.size,
        force,
        disabled,
        appVersion,
        minNativeVersion,
      },
      null,
      2,
    ),
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
