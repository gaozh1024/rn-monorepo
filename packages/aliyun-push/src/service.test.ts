import { createRequire } from 'node:module';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindAliyunPushAccount, initAliyunPush, resetAliyunPushRuntime } from './service';
import type { AliyunPushRuntimeConfig } from './types';

const mocks = vi.hoisted(() => {
  const successCode = 'OK';

  return {
    pushModule: {
      AliyunPushLogLevel: {
        Debug: 'Debug',
        Error: 'Error',
        Info: 'Info',
        None: 'None',
        Warn: 'Warn',
      },
      kAliyunPushSuccessCode: successCode,
      setLogLevel: vi.fn(),
      initPush: vi.fn(),
      getDeviceId: vi.fn(),
      initAndroidThirdPush: vi.fn(),
      bindAccount: vi.fn(),
      unbindAccount: vi.fn(),
      createAndroidChannel: vi.fn(),
      showNoticeWhenForeground: vi.fn(),
      getApnsDeviceToken: vi.fn(),
      addNotificationCallback: vi.fn(),
      addNotificationReceivedInApp: vi.fn(),
      addMessageCallback: vi.fn(),
      addNotificationOpenedCallback: vi.fn(),
      addNotificationRemovedCallback: vi.fn(),
      addNotificationClickedWithNoAction: vi.fn(),
      addChannelOpenCallback: vi.fn(),
      addRegisterDeviceTokenSuccessCallback: vi.fn(),
      addRegisterDeviceTokenFailedCallback: vi.fn(),
      removePushCallback: vi.fn(),
    },
    successCode,
  };
});

const nodeRequire = createRequire(import.meta.url);
const moduleLoader = nodeRequire('module') as {
  _load: (request: string, parent: NodeJS.Module | null | undefined, isMain: boolean) => unknown;
};
const originalLoad = moduleLoader._load;

beforeAll(() => {
  vi.spyOn(moduleLoader, '_load').mockImplementation(
    (request: string, parent: NodeJS.Module | null | undefined, isMain: boolean) => {
      if (request === 'aliyun-react-native-push') {
        return mocks.pushModule;
      }

      return originalLoad(request, parent, isMain);
    }
  );
});

afterAll(() => {
  vi.restoreAllMocks();
});

const config: AliyunPushRuntimeConfig = {
  enabled: true,
  debug: true,
  autoInitThirdPush: true,
  android: {
    appKey: 'android-app-key',
    appSecret: 'android-app-secret',
  },
  vendors: {
    huaweiAppId: 'huawei-app-id',
  },
  androidChannel: {
    id: 'default',
    name: '默认通知',
    importance: 4,
    desc: '默认消息通知通道',
  },
};

describe('aliyun push service init', () => {
  beforeEach(() => {
    resetAliyunPushRuntime();
    vi.clearAllMocks();

    mocks.pushModule.initPush.mockResolvedValue({ code: mocks.successCode });
    mocks.pushModule.getDeviceId.mockResolvedValue('device-123');
    mocks.pushModule.initAndroidThirdPush.mockResolvedValue({ code: mocks.successCode });
    mocks.pushModule.createAndroidChannel.mockResolvedValue({ code: mocks.successCode });
    mocks.pushModule.bindAccount.mockResolvedValue({ code: mocks.successCode });
  });

  it('treats PUSH_20110 duplicate registration as idempotent init success', async () => {
    mocks.pushModule.initPush.mockResolvedValueOnce({
      code: 'PUSH_20110',
      errorMsg: '已经调用注册，重复调用无效',
    });

    const context = await initAliyunPush(config);
    const bindResult = await bindAliyunPushAccount('user-1', config);

    expect(context?.deviceId).toBe('device-123');
    expect(context?.initResult.code).toBe('PUSH_20110');
    expect(mocks.pushModule.getDeviceId).toHaveBeenCalled();
    expect(mocks.pushModule.initAndroidThirdPush).toHaveBeenCalled();
    expect(mocks.pushModule.createAndroidChannel).toHaveBeenCalledWith(config.androidChannel);
    expect(mocks.pushModule.bindAccount).toHaveBeenCalledWith('user-1');
    expect(bindResult).toEqual({ code: mocks.successCode });
  });

  it('still rejects unknown init failures', async () => {
    mocks.pushModule.initPush.mockResolvedValueOnce({
      code: 'PUSH_UNKNOWN',
      errorMsg: '初始化失败',
    });

    await expect(initAliyunPush(config)).rejects.toThrow('[AliyunPush] 初始化失败: 初始化失败');
    expect(mocks.pushModule.getDeviceId).not.toHaveBeenCalled();
    expect(mocks.pushModule.bindAccount).not.toHaveBeenCalled();
  });
});
