import React from 'react';
import { Alert, Platform } from 'react-native';
import { HotUpdater } from '@hot-updater/react-native';
import { hotUpdaterLogger } from './logger';
import { fetchJsonManifest, resolveUpdateDecisionFromManifest } from './manifest';
import { resolveHotUpdaterTexts } from './texts';
import { DefaultHotUpdaterFallback } from './ui';
import type {
  CreateHotUpdaterOptions,
  CreateOssHotUpdaterOptions,
  HotUpdaterManualResult,
  HotUpdaterLaunchState,
  ManualPromptContext,
  ManualPromptOptions,
  PrepareHotUpdaterLaunchOptions,
  PrepareHotUpdaterLaunchResult,
  HotUpdaterPlatform,
  HotUpdaterSummary,
  ManifestProviderContext,
  WrapAppOptions,
} from './types';

function getPlatform(): HotUpdaterPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

function resolveAppVersion(appVersion?: string) {
  if (appVersion) return appVersion;

  const detectedVersion = HotUpdater.getAppVersion();
  if (detectedVersion) return detectedVersion;

  throw new Error(
    'Failed to resolve appVersion. Pass appVersion explicitly or ensure the native app version is available.'
  );
}

function promptWithDefaultAlert(context: ManualPromptContext) {
  const { result, titles, actions } = context;

  if (result.status === 'up-to-date') {
    Alert.alert(titles.upToDateTitle, titles.upToDateMessage ?? result.message);
    return Promise.resolve();
  }

  if (result.status === 'error') {
    Alert.alert(titles.errorTitle, result.message);
    return Promise.resolve();
  }

  if (!result.shouldReload) {
    Alert.alert(titles.downloadedTitle, result.message);
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    Alert.alert(titles.downloadedTitle, result.message, [
      {
        text: titles.restartLaterText,
        style: 'cancel',
        onPress: () => resolve(),
      },
      {
        text: titles.restartNowText,
        onPress: () => {
          void actions.reload().finally(resolve);
        },
      },
    ]);
  });
}

function notifyLaunchState(
  callback: PrepareHotUpdaterLaunchOptions['onStateChange'],
  state: HotUpdaterLaunchState
) {
  callback?.(state);
}

function hotUpdaterLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  payload?: unknown
) {
  hotUpdaterLogger(level, `[HotUpdater] ${message}`, payload);
}

function getDefaultChannelSafely(fallback: string) {
  try {
    return HotUpdater.getDefaultChannel();
  } catch {
    return fallback;
  }
}

function isChannelSwitchedSafely() {
  try {
    return HotUpdater.isChannelSwitched();
  } catch {
    return false;
  }
}

function getBundleDiagnostics(defaultChannel: string) {
  return {
    platform: getPlatform(),
    appVersion: HotUpdater.getAppVersion(),
    bundleId: HotUpdater.getBundleId(),
    minBundleId: HotUpdater.getMinBundleId(),
    currentChannel: (() => {
      try {
        return HotUpdater.getChannel();
      } catch {
        return defaultChannel;
      }
    })(),
    defaultChannel: getDefaultChannelSafely(defaultChannel),
    isChannelSwitched: isChannelSwitchedSafely(),
  };
}

export function createHotUpdater(options: CreateHotUpdaterOptions) {
  const defaultChannel = options.defaultChannel ?? 'production';
  const resolvedAppVersion = resolveAppVersion(options.appVersion);
  const texts = resolveHotUpdaterTexts(options.texts);

  const getCurrentChannel = () => {
    if (options.getChannel) return options.getChannel();

    try {
      return HotUpdater.getChannel();
    } catch {
      return defaultChannel;
    }
  };

  const getManifestContext = (): ManifestProviderContext => ({
    platform: getPlatform(),
    appVersion: resolvedAppVersion,
    channel: getCurrentChannel(),
    bundleId: '',
    minBundleId: '',
  });

  const resolver = {
    checkUpdate: async (params: ManifestProviderContext) => {
      const manifest = await options.getManifest(params);
      const decision = resolveUpdateDecisionFromManifest(manifest, params);

      hotUpdaterLog(
        decision.update ? 'info' : 'debug',
        decision.update ? '更新判定结果：需要更新' : '更新判定结果：不需要更新',
        {
          reason: decision.reason,
          details: decision.details,
          manifestSummary: manifest
            ? {
                platform: manifest.platform,
                channel: manifest.channel,
                updatedAt: manifest.updatedAt,
                bundleId: manifest.release?.bundleId ?? null,
                appVersion: manifest.release?.appVersion ?? null,
                minNativeVersion: manifest.release?.minNativeVersion ?? null,
                force: manifest.release?.force ?? null,
              }
            : null,
        }
      );

      return decision.update;
    },
  };

  const getSummary = (): HotUpdaterSummary => {
    const platform = getPlatform();
    const channel = getCurrentChannel();

    return {
      appVersion: resolvedAppVersion,
      channel,
      platform,
      manifestSource: options.describeManifestSource?.({ platform, channel }) ?? 'custom-manifest',
    };
  };

  const getTexts = () => texts;

  const checkManually = async (): Promise<HotUpdaterManualResult> => {
    try {
      hotUpdaterLog('info', '手动检查开始', {
        ...getBundleDiagnostics(defaultChannel),
        manifestSource:
          options.describeManifestSource?.({
            platform: getPlatform(),
            channel: getCurrentChannel(),
          }) ?? 'custom-manifest',
      });

      if (__DEV__) {
        hotUpdaterLog('debug', '手动检查跳过，当前为开发环境');
        return {
          status: 'up-to-date',
          message: texts.releaseOnlyMessage,
        };
      }

      if (HotUpdater.isUpdateDownloaded()) {
        hotUpdaterLog('info', '手动检查发现更新包已下载');
        return {
          status: 'downloaded',
          shouldReload: true,
          message: texts.downloadedMessage,
        };
      }

      const updateInfo = await HotUpdater.checkForUpdate({
        updateStrategy: 'appVersion',
      });

      hotUpdaterLog('info', '手动检查结果', {
        hasUpdate: !!updateInfo,
        shouldForceUpdate: updateInfo?.shouldForceUpdate ?? false,
        id: updateInfo?.id ?? null,
        message: updateInfo?.message ?? null,
        ...getBundleDiagnostics(defaultChannel),
      });

      if (!updateInfo) {
        hotUpdaterLog('debug', '手动检查结果为已是最新版本');
        return {
          status: 'up-to-date',
          message: texts.upToDateMessage,
        };
      }

      hotUpdaterLog('info', '手动检查开始下载更新包', {
        id: updateInfo.id,
        shouldForceUpdate: updateInfo.shouldForceUpdate,
      });
      const updated = await updateInfo.updateBundle();
      hotUpdaterLog('info', '手动检查下载完成', {
        id: updateInfo.id,
        updated,
      });
      if (!updated) {
        return {
          status: 'error',
          message: texts.updateDownloadFailedMessage,
        };
      }

      if (updateInfo.shouldForceUpdate) {
        hotUpdaterLog('warn', '手动检查触发强制重启', {
          id: updateInfo.id,
        });
        await HotUpdater.reload();
        return {
          status: 'downloaded',
          shouldReload: false,
          message: texts.forceUpdateCompletedMessage,
        };
      }

      return {
        status: 'downloaded',
        shouldReload: true,
        message: updateInfo.message ?? texts.downloadedMessage,
      };
    } catch (error) {
      hotUpdaterLog('error', '手动检查失败', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : texts.checkFailedMessage,
      };
    }
  };

  const checkManuallyAndPrompt = async (
    promptOptions: ManualPromptOptions = {}
  ): Promise<HotUpdaterManualResult> => {
    const result = await checkManually();
    const defaultDownloadedTitle =
      result.status === 'downloaded' && result.shouldReload
        ? texts.downloadedReadyTitle
        : texts.downloadedCompletedTitle;
    const promptContext: ManualPromptContext = {
      result,
      titles: {
        upToDateTitle: promptOptions.upToDateTitle ?? texts.upToDateTitle,
        upToDateMessage: promptOptions.upToDateMessage ?? texts.upToDateMessage,
        errorTitle: promptOptions.errorTitle ?? texts.checkFailedTitle,
        downloadedTitle: promptOptions.downloadedTitle ?? defaultDownloadedTitle,
        restartNowText: promptOptions.restartNowText ?? texts.restartNowText,
        restartLaterText: promptOptions.restartLaterText ?? texts.restartLaterText,
      },
      actions: {
        reload: () => HotUpdater.reload(),
      },
    };

    if (promptOptions.promptHandler) {
      await promptOptions.promptHandler(promptContext);
      return result;
    }

    await promptWithDefaultAlert(promptContext);

    return result;
  };

  const prepareLaunch = async (
    launchOptions: PrepareHotUpdaterLaunchOptions = {}
  ): Promise<PrepareHotUpdaterLaunchResult> => {
    try {
      const currentChannel = getCurrentChannel();
      const platform = getPlatform();
      hotUpdaterLog('info', '启动检查开始', {
        ...getBundleDiagnostics(defaultChannel),
        manifestSource:
          options.describeManifestSource?.({ platform, channel: currentChannel }) ??
          'custom-manifest',
        downloadOptionalUpdateInBackground:
          launchOptions.downloadOptionalUpdateInBackground ?? true,
      });
      notifyLaunchState(launchOptions.onStateChange, {
        phase: 'checking',
        message: texts.launchPreparingMessage,
      });

      if (__DEV__) {
        hotUpdaterLog('debug', '启动检查跳过，当前为开发环境');
        notifyLaunchState(launchOptions.onStateChange, {
          phase: 'ready',
          message: null,
        });
        return {
          status: 'ready',
          message: texts.releaseOnlyMessage,
        };
      }

      if (HotUpdater.isUpdateDownloaded()) {
        hotUpdaterLog('info', '启动检查发现更新包已下载');
        notifyLaunchState(launchOptions.onStateChange, {
          phase: 'ready',
          message: null,
        });
        return {
          status: 'ready',
          message: texts.downloadedMessage,
          shouldPromptReload: true,
        };
      }

      const updateInfo = await HotUpdater.checkForUpdate({
        updateStrategy: 'appVersion',
      });
      hotUpdaterLog('info', '启动检查结果', {
        hasUpdate: !!updateInfo,
        shouldForceUpdate: updateInfo?.shouldForceUpdate ?? false,
        id: updateInfo?.id ?? null,
        message: updateInfo?.message ?? null,
        ...getBundleDiagnostics(defaultChannel),
      });

      if (!updateInfo) {
        hotUpdaterLog('debug', '启动检查结果为无更新');
        notifyLaunchState(launchOptions.onStateChange, {
          phase: 'ready',
          message: null,
        });
        return {
          status: 'ready',
          message: null,
          shouldPromptReload: false,
        };
      }

      if (updateInfo.shouldForceUpdate) {
        hotUpdaterLog('warn', '启动阶段开始强制更新', {
          id: updateInfo.id,
        });
        notifyLaunchState(launchOptions.onStateChange, {
          phase: 'updating-force',
          message: updateInfo.message ?? texts.launchForceUpdatingMessage,
        });

        const updated = await updateInfo.updateBundle();
        hotUpdaterLog('warn', '启动阶段强制更新完成', {
          id: updateInfo.id,
          updated,
        });
        if (!updated) {
          const error = new Error(texts.launchForceUpdateFailedMessage);
          launchOptions.onError?.(error);
          notifyLaunchState(launchOptions.onStateChange, {
            phase: 'error',
            message: error.message,
          });
          return {
            status: 'error',
            message: error.message,
          };
        }

        hotUpdaterLog('warn', '启动阶段强制更新后重启应用', {
          id: updateInfo.id,
        });
        await HotUpdater.reload();
        return {
          status: 'reloading',
          message: texts.launchForceUpdateCompletedMessage,
        };
      }

      notifyLaunchState(launchOptions.onStateChange, {
        phase: 'ready',
        message: null,
      });

      if (launchOptions.downloadOptionalUpdateInBackground ?? true) {
        hotUpdaterLog('info', '后台下载更新开始', {
          id: updateInfo.id,
        });
        void updateInfo
          .updateBundle()
          .then((updated: boolean) => {
            hotUpdaterLog('info', '后台下载更新完成', {
              id: updateInfo.id,
              updated,
            });
            if (!updated) {
              throw new Error(texts.launchBackgroundUpdateFailedMessage);
            }

            launchOptions.onOptionalUpdateReady?.({
              message: updateInfo.message ?? texts.launchOptionalUpdateReadyMessage,
              shouldReload: true,
            });
          })
          .catch((error: unknown) => {
            const normalizedError =
              error instanceof Error ? error : new Error(texts.launchBackgroundUpdateFailedMessage);
            hotUpdaterLog('error', '后台下载更新失败', normalizedError);
            launchOptions.onError?.(normalizedError);
          });
      }

      hotUpdaterLog('debug', '启动检查完成，允许进入应用');
      return {
        status: 'ready',
        message: updateInfo.message ?? null,
        shouldPromptReload: false,
      };
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(texts.launchCheckFailedMessage);
      hotUpdaterLog('error', '启动检查失败', normalizedError);
      launchOptions.onError?.(normalizedError);
      notifyLaunchState(launchOptions.onStateChange, {
        phase: 'error',
        message: normalizedError.message,
      });
      return {
        status: 'error',
        message: normalizedError.message,
        shouldPromptReload: false,
      };
    }
  };

  const wrapApp = <P extends React.JSX.IntrinsicAttributes = object>(
    WrappedComponent: React.ComponentType<P>,
    wrapOptions: WrapAppOptions = {}
  ) => {
    const fallbackComponent =
      wrapOptions.fallbackComponent ??
      ((props: { status: string; progress: number; message: string | null }) =>
        React.createElement(DefaultHotUpdaterFallback, {
          ...props,
          ui: {
            ...wrapOptions.defaultUI,
            texts,
          },
        }));

    return HotUpdater.wrap({
      resolver,
      updateStrategy: 'appVersion',
      updateMode: wrapOptions.updateMode ?? 'manual',
      reloadOnForceUpdate: wrapOptions.reloadOnForceUpdate ?? true,
      fallbackComponent,
      onUpdateProcessCompleted: wrapOptions.onUpdateProcessCompleted,
      onError: wrapOptions.onError,
    })(WrappedComponent as React.ComponentType<object>) as React.ComponentType<P>;
  };

  const previewManifest = async () => {
    try {
      const context = getManifestContext();
      hotUpdaterLog('debug', '预览 manifest 开始', {
        ...context,
        ...getBundleDiagnostics(defaultChannel),
        manifestSource:
          options.describeManifestSource?.({
            platform: context.platform,
            channel: context.channel,
          }) ?? 'custom-manifest',
      });
      const manifest = await options.getManifest(context);
      hotUpdaterLog('debug', '预览 manifest 成功', manifest);
      return manifest;
    } catch (error) {
      hotUpdaterLog('error', '预览 manifest 失败', error);
      return null;
    }
  };

  return {
    resolver,
    getCurrentChannel,
    getSummary,
    getTexts,
    checkManually,
    checkManuallyAndPrompt,
    prepareLaunch,
    previewManifest,
    reload: () => HotUpdater.reload(),
    wrapApp,
  };
}

export function createOssHotUpdater(options: CreateOssHotUpdaterOptions) {
  const baseURL = options.manifestBaseURL.replace(/\/+$/, '');
  const appVersion = resolveAppVersion(options.appVersion);

  return createHotUpdater({
    appVersion,
    defaultChannel: options.defaultChannel,
    getChannel: options.getChannel,
    texts: options.texts,
    getManifest: async ({ platform, channel, requestHeaders }) => {
      const manifestUrl = `${baseURL}/${platform}/${channel}/${appVersion}.json?t=${Date.now()}`;
      let manifest = await fetchJsonManifest(manifestUrl, {
        ...(options.requestHeaders ?? {}),
        ...(requestHeaders ?? {}),
      });
      if (manifest === null) {
        const legacyUrl = `${baseURL}/${platform}/${channel}.json?t=${Date.now()}`;
        manifest = await fetchJsonManifest(legacyUrl, {
          ...(options.requestHeaders ?? {}),
          ...(requestHeaders ?? {}),
        });
        if (manifest !== null && manifest.release?.appVersion !== appVersion) return null;
      }
      return manifest;
    },
    describeManifestSource: ({ platform, channel }) =>
      `${baseURL}/${platform}/${channel}/${appVersion}.json`,
  });
}

export function withOssHotUpdater<P extends React.JSX.IntrinsicAttributes = object>(
  WrappedComponent: React.ComponentType<P>,
  options: CreateOssHotUpdaterOptions,
  wrapOptions: WrapAppOptions = {}
) {
  return createOssHotUpdater(options).wrapApp(WrappedComponent, wrapOptions);
}
