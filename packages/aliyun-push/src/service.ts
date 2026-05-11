import { PermissionsAndroid, Platform } from 'react-native';
import { getCurrentPlatformCredentials, hasVendorPushConfig } from './config';
import { pushLogger } from './logger';
import type {
  AliyunPushCallbacks,
  AliyunPushInitContext,
  AliyunPushRuntimeConfig,
  CreateAndroidChannelParams,
  PushResult,
} from './types';

type PushCallback = (event: unknown) => void;

type AliyunPushModule = {
  AliyunPushLogLevel: {
    None: string;
    Error: string;
    Warn: string;
    Info: string;
    Debug: string;
  };
  kAliyunPushSuccessCode: string;
  setLogLevel(level: string): void;
  initPush(appKey?: string, appSecret?: string): Promise<PushResult>;
  getDeviceId(): Promise<string>;
  initAndroidThirdPush(): Promise<PushResult>;
  bindAccount(account: string): Promise<PushResult>;
  unbindAccount(): Promise<PushResult>;
  createAndroidChannel(params: CreateAndroidChannelParams): Promise<PushResult>;
  showNoticeWhenForeground(enabled: boolean): Promise<PushResult>;
  getApnsDeviceToken(): Promise<string>;
  addNotificationCallback(callback: PushCallback): void;
  addNotificationReceivedInApp(callback: PushCallback): void;
  addMessageCallback(callback: PushCallback): void;
  addNotificationOpenedCallback(callback: PushCallback): void;
  addNotificationRemovedCallback(callback: PushCallback): void;
  addNotificationClickedWithNoAction(callback: PushCallback): void;
  addChannelOpenCallback(callback: PushCallback): void;
  addRegisterDeviceTokenSuccessCallback(callback: PushCallback): void;
  addRegisterDeviceTokenFailedCallback(callback: PushCallback): void;
  removePushCallback(): void;
};

const ALIYUN_PUSH_ALREADY_REGISTERED_CODE = 'PUSH_20110';

let cachedAliyunModule: AliyunPushModule | null | undefined;
let cachedDeviceId: string | null = null;
let cachedApnsDeviceToken: string | null = null;
let lastInitContext: AliyunPushInitContext | null = null;
let lastInitSignature: string | null = null;
let initialized = false;
let initPromise: Promise<AliyunPushInitContext | null> | null = null;
let initPromiseSignature: string | null = null;

function getAliyunPushModule(): AliyunPushModule | null {
  if (Platform.OS === 'web') {
    pushLogger.debug('[模块加载] Web 平台跳过原生推送模块');
    return null;
  }

  if (cachedAliyunModule !== undefined) {
    return cachedAliyunModule;
  }

  pushLogger.info('[模块加载] 开始加载 aliyun-react-native-push 原生模块');

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedAliyunModule = require('aliyun-react-native-push') as AliyunPushModule;
    pushLogger.info('[模块加载] 原生模块加载成功');
  } catch (error) {
    pushLogger.error('[模块加载] 原生模块加载失败', error);
    cachedAliyunModule = null;
  }

  return cachedAliyunModule;
}

function ensureEnabled(config: AliyunPushRuntimeConfig) {
  return Boolean(config.enabled) && Platform.OS !== 'web';
}

async function ensureAndroidNotificationPermission(config: AliyunPushRuntimeConfig) {
  if (Platform.OS !== 'android' || config.requestAndroidNotificationPermission === false) {
    pushLogger.debug('[权限] 当前平台无需请求 Android 通知权限');
    return true;
  }

  if (typeof Platform.Version !== 'number' || Platform.Version < 33) {
    pushLogger.debug('[权限] Android < 13，无需 POST_NOTIFICATIONS');
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

  if (!permission) {
    pushLogger.warn('[权限] 未获取到 POST_NOTIFICATIONS 常量，跳过权限请求');
    return true;
  }

  const granted = await PermissionsAndroid.check(permission);
  if (granted) {
    pushLogger.info('[权限] Android 通知权限已授权');
    return true;
  }

  pushLogger.info('[权限] 开始请求 Android 通知权限');
  const result = await PermissionsAndroid.request(permission);
  const success = result === PermissionsAndroid.RESULTS.GRANTED;
  pushLogger[success ? 'info' : 'warn']('[权限] Android 通知权限请求结果', { result });
  return success;
}

function getPlatformName(): 'android' | 'ios' | null {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return Platform.OS;
  }

  return null;
}

function getConfigSignature(config: AliyunPushRuntimeConfig) {
  return JSON.stringify(config);
}

function isInitPushSuccess(mod: AliyunPushModule, result: PushResult) {
  return (
    result.code === mod.kAliyunPushSuccessCode ||
    result.code === ALIYUN_PUSH_ALREADY_REGISTERED_CODE
  );
}

function assertInitPushSuccess(mod: AliyunPushModule, result: PushResult) {
  if (!isInitPushSuccess(mod, result)) {
    throw new Error(`[AliyunPush] 初始化失败: ${result.errorMsg ?? result.code}`);
  }
}

async function performInit(config: AliyunPushRuntimeConfig): Promise<AliyunPushInitContext | null> {
  const mod = getAliyunPushModule();
  const platform = getPlatformName();

  pushLogger.info('[初始化] 开始初始化推送', { platform, enabled: config.enabled });

  if (!mod || !platform || !ensureEnabled(config)) {
    pushLogger.warn('[初始化] 原生模块不可用、平台不支持或推送未启用');
    initialized = false;
    lastInitContext = null;
    lastInitSignature = null;
    return null;
  }

  const credentials = getCurrentPlatformCredentials(platform, config);
  if (!credentials) {
    pushLogger.error('[初始化] 缺少平台凭据', { platform });
    throw new Error(`[AliyunPush] ${platform} 平台缺少 appKey/appSecret 配置。`);
  }

  pushLogger.info('[初始化] 平台凭据已就绪', { platform, appKey: credentials.appKey });
  await ensureAndroidNotificationPermission(config);

  mod.setLogLevel(config.debug ? mod.AliyunPushLogLevel.Debug : mod.AliyunPushLogLevel.Error);
  pushLogger.info('[初始化] 已设置 SDK 日志级别', { debug: config.debug === true });

  const initResult = await mod.initPush(credentials.appKey, credentials.appSecret);
  pushLogger.info('[初始化] initPush 返回', initResult);
  assertInitPushSuccess(mod, initResult);
  if (initResult.code === ALIYUN_PUSH_ALREADY_REGISTERED_CODE) {
    pushLogger.info('[初始化] 原生 SDK 已注册，按幂等初始化成功继续后续流程', initResult);
  }

  let thirdPushResult: PushResult | null = null;
  if (platform === 'android' && config.autoInitThirdPush !== false && hasVendorPushConfig(config)) {
    pushLogger.info('[初始化] 检测到厂商通道配置，开始初始化 Android Third Push');
    thirdPushResult = await mod.initAndroidThirdPush();
    if (thirdPushResult.code !== mod.kAliyunPushSuccessCode) {
      pushLogger.warn('[初始化] 第三方厂商通道初始化失败', thirdPushResult);
    }
  }

  if (platform === 'android' && config.androidChannel) {
    try {
      pushLogger.info('[初始化] 开始创建 Android 通知通道', config.androidChannel);
      await mod.createAndroidChannel(config.androidChannel);
      pushLogger.info('[初始化] Android 通知通道创建完成', {
        id: config.androidChannel.id,
      });
    } catch (error) {
      pushLogger.warn('[初始化] 创建 Android 通知通道失败', error);
    }
  }

  if (platform === 'ios' && config.showNoticeWhenForeground !== false) {
    try {
      pushLogger.info('[初始化] 开启 iOS 前台展示通知');
      await mod.showNoticeWhenForeground(true);
    } catch (error) {
      pushLogger.warn('[初始化] 设置 iOS 前台展示通知失败', error);
    }
  }

  try {
    cachedDeviceId = await mod.getDeviceId();
    pushLogger.info('[初始化] 获取 deviceId 成功', { deviceId: cachedDeviceId });
  } catch (error) {
    pushLogger.warn('[初始化] 获取 deviceId 失败', error);
    cachedDeviceId = null;
  }

  if (platform === 'ios') {
    try {
      cachedApnsDeviceToken = await mod.getApnsDeviceToken();
      pushLogger.info('[初始化] 获取 APNs Device Token 成功', {
        apnsDeviceToken: cachedApnsDeviceToken,
      });
    } catch (error) {
      pushLogger.warn('[初始化] 获取 APNs Device Token 失败', error);
      cachedApnsDeviceToken = null;
    }
  } else {
    cachedApnsDeviceToken = null;
  }

  initialized = true;
  lastInitSignature = getConfigSignature(config);
  lastInitContext = {
    deviceId: cachedDeviceId,
    apnsDeviceToken: cachedApnsDeviceToken,
    initResult,
    thirdPushResult,
  };

  pushLogger.info('[初始化] 推送初始化完成', {
    platform,
    initialized,
    deviceId: cachedDeviceId,
    apnsDeviceToken: cachedApnsDeviceToken,
    thirdPushResult,
  });

  return lastInitContext;
}

export function isAliyunPushConfigured(config: AliyunPushRuntimeConfig) {
  const platform = getPlatformName();
  if (!platform || !ensureEnabled(config)) {
    pushLogger.debug('[配置检查] 推送未启用或当前平台不支持');
    return false;
  }

  return Boolean(getCurrentPlatformCredentials(platform, config));
}

export async function initAliyunPush(
  config: AliyunPushRuntimeConfig
): Promise<AliyunPushInitContext | null> {
  const signature = getConfigSignature(config);

  if (initialized && lastInitContext && lastInitSignature === signature) {
    pushLogger.debug('[初始化] 使用缓存的初始化结果');
    return lastInitContext;
  }

  if (initPromise && initPromiseSignature === signature) {
    pushLogger.debug('[初始化] 复用进行中的初始化任务');
    return initPromise;
  }

  initPromiseSignature = signature;
  initPromise = performInit(config)
    .catch(error => {
      initialized = false;
      lastInitContext = null;
      lastInitSignature = null;
      throw error;
    })
    .finally(() => {
      initPromise = null;
      initPromiseSignature = null;
    });

  return initPromise;
}

export function registerAliyunPushCallbacks(callbacks: AliyunPushCallbacks) {
  const mod = getAliyunPushModule();
  if (!mod) {
    pushLogger.warn('[监听] 原生模块不存在，无法注册回调');
    return;
  }

  pushLogger.info('[监听] 开始注册推送回调');
  mod.removePushCallback();

  if (callbacks.onNotification) {
    mod.addNotificationCallback(callbacks.onNotification);
  }
  if (callbacks.onMessage) {
    mod.addMessageCallback(callbacks.onMessage);
  }
  if (callbacks.onNotificationOpened) {
    mod.addNotificationOpenedCallback(callbacks.onNotificationOpened);
  }
  if (callbacks.onNotificationRemoved) {
    mod.addNotificationRemovedCallback(callbacks.onNotificationRemoved);
  }
  if (callbacks.onNotificationReceivedInApp) {
    mod.addNotificationReceivedInApp(callbacks.onNotificationReceivedInApp);
  }
  if (callbacks.onNotificationClickedWithNoAction) {
    mod.addNotificationClickedWithNoAction(callbacks.onNotificationClickedWithNoAction);
  }
  if (callbacks.onChannelOpen) {
    mod.addChannelOpenCallback(callbacks.onChannelOpen);
  }
  if (callbacks.onRegisterDeviceTokenSuccess) {
    mod.addRegisterDeviceTokenSuccessCallback(callbacks.onRegisterDeviceTokenSuccess);
  }
  if (callbacks.onRegisterDeviceTokenFailed) {
    mod.addRegisterDeviceTokenFailedCallback(callbacks.onRegisterDeviceTokenFailed);
  }
}

export function removeAliyunPushCallbacks() {
  const mod = getAliyunPushModule();
  if (!mod) return;
  pushLogger.info('[监听] 移除所有推送回调');
  mod.removePushCallback();
}

export async function bindAliyunPushAccount(account: string, config: AliyunPushRuntimeConfig) {
  const mod = getAliyunPushModule();
  if (!mod || !ensureEnabled(config) || !account.trim()) {
    pushLogger.warn('[账号绑定] 跳过绑定', {
      hasModule: Boolean(mod),
      enabled: ensureEnabled(config),
      account,
    });
    return null;
  }

  pushLogger.info('[账号绑定] 开始绑定阿里云推送账号', { account: account.trim() });
  const result = await mod.bindAccount(account.trim());
  if (result.code !== mod.kAliyunPushSuccessCode) {
    pushLogger.warn('[账号绑定] 绑定失败', result);
    return null;
  }

  pushLogger.info('[账号绑定] 绑定成功', result);
  return result;
}

export async function unbindAliyunPushAccount(config: AliyunPushRuntimeConfig) {
  const mod = getAliyunPushModule();
  if (!mod || !ensureEnabled(config)) {
    pushLogger.warn('[账号绑定] 跳过解绑', {
      hasModule: Boolean(mod),
      enabled: ensureEnabled(config),
    });
    return null;
  }

  pushLogger.info('[账号绑定] 开始解绑阿里云推送账号');
  const result = await mod.unbindAccount();
  if (result.code !== mod.kAliyunPushSuccessCode) {
    pushLogger.warn('[账号绑定] 解绑失败', result);
    return null;
  }

  pushLogger.info('[账号绑定] 解绑成功', result);
  return result;
}

export function getAliyunPushDeviceId() {
  return cachedDeviceId;
}

export function getAliyunPushApnsDeviceToken() {
  return cachedApnsDeviceToken;
}

export function isAliyunPushInitialized() {
  return initialized;
}

export function resetAliyunPushRuntime() {
  cachedAliyunModule = undefined;
  cachedDeviceId = null;
  cachedApnsDeviceToken = null;
  lastInitContext = null;
  lastInitSignature = null;
  initialized = false;
  initPromise = null;
  initPromiseSignature = null;
}
