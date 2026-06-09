const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withProjectBuildGradle,
} = require('@expo/config-plugins');

const PLUGIN_NAME = 'withAliyunPush';
const PLUGIN_VERSION = '0.2.0';

const ALIYUN_MAVEN_REPOSITORY =
  "        maven { url 'https://maven.aliyun.com/nexus/content/repositories/releases/' }";
const HUAWEI_MAVEN_REPOSITORY = "        maven { url 'https://developer.huawei.com/repo/' }";
const HIHONOR_MAVEN_REPOSITORY = "        maven { url 'https://developer.hihonor.com/repo' }";
const PUSH_RECEIVER_NAME = 'com.aliyun.ams.push.AliyunPushMessageReceiver';

const PROGUARD_RULES = `
# Aliyun Push
-keepclasseswithmembernames class ** {
    native <methods>;
}
-keepattributes Signature
-keep class sun.misc.Unsafe { *; }
-keep class com.taobao.** {*;}
-keep class com.alibaba.** {*;}
-keep class com.alipay.** {*;}
-keep class com.ut.** {*;}
-keep class com.ta.** {*;}
-keep class anet.**{*;}
-keep class anetwork.**{*;}
-keep class org.android.spdy.**{*;}
-keep class org.android.agoo.**{*;}
-keep class android.os.**{*;}
-keep class org.json.**{*;}
-dontwarn com.taobao.**
-dontwarn com.alibaba.**
-dontwarn com.alipay.**
-dontwarn anet.**
-dontwarn org.android.spdy.**
-dontwarn org.android.agoo.**
-dontwarn anetwork.**
-dontwarn com.ut.**
-dontwarn com.ta.**
`.trim();

const APP_DELEGATE_METHODS = `

  public override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    AliyunPush.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
  }

  public override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
    AliyunPush.didFailToRegisterForRemoteNotifications(withError: error)
  }

  public override func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    super.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
    AliyunPush.didReceiveRemoteNotification(userInfo, fetchCompletionHandler: completionHandler)
  }

  public func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    AliyunPush.userNotificationCenter(center, willPresent: notification, withCompletionHandler: completionHandler)
  }

  public func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    AliyunPush.userNotificationCenter(center, didReceive: response, withCompletionHandler: completionHandler)
  }
`;

function resolveAliyunPushConfig(projectRoot, configFile = './aliyunPush.config.js') {
  const resolvedPath = path.resolve(projectRoot, configFile);

  if (!fs.existsSync(resolvedPath)) {
    return { enabled: false };
  }

  delete require.cache[resolvedPath];
  const raw = require(resolvedPath);
  return raw?.default ?? raw ?? { enabled: false };
}

function ensureLine(content, line, anchorRegex) {
  if (content.includes(line)) {
    return content;
  }

  return content.replace(anchorRegex, match => `${match}\n${line}`);
}

function appendBlock(content, block, marker) {
  if (content.includes(marker)) {
    return content;
  }

  return `${content.trimEnd()}\n\n${block}\n`;
}

function addPermission(manifest, name) {
  manifest['uses-permission'] = manifest['uses-permission'] || [];
  const exists = manifest['uses-permission'].some(item => item.$['android:name'] === name);
  if (!exists) {
    manifest['uses-permission'].push({ $: { 'android:name': name } });
  }
}

function addMetaData(application, name, value) {
  if (!value) {
    return;
  }

  application['meta-data'] = application['meta-data'] || [];
  const existing = application['meta-data'].find(item => item.$['android:name'] === name);
  if (existing) {
    existing.$['android:value'] = value;
    return;
  }

  application['meta-data'].push({
    $: {
      'android:name': name,
      'android:value': value,
    },
  });
}

function ensureReceiver(application) {
  application.receiver = application.receiver || [];
  const exists = application.receiver.find(item => item.$['android:name'] === PUSH_RECEIVER_NAME);
  if (exists) {
    return;
  }

  application.receiver.push({
    $: {
      'android:name': PUSH_RECEIVER_NAME,
      'android:exported': 'false',
    },
    'intent-filter': [
      { action: [{ $: { 'android:name': 'com.alibaba.push2.action.NOTIFICATION_OPENED' } }] },
      { action: [{ $: { 'android:name': 'com.alibaba.push2.action.NOTIFICATION_REMOVED' } }] },
      { action: [{ $: { 'android:name': 'com.alibaba.sdk.android.push.RECEIVE' } }] },
    ],
  });
}

function findFirstChildFile(root, filename) {
  const entries = fs.existsSync(root) ? fs.readdirSync(root, { withFileTypes: true }) : [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = path.join(root, entry.name, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function patchSwiftAppDelegate(content) {
  let next = content;

  if (!next.includes('import UIKit')) {
    next = next.replace('import Expo\n', 'import Expo\nimport UIKit\n');
  }
  if (!next.includes('import UserNotifications')) {
    next = next.replace('import UIKit\n', 'import UIKit\nimport UserNotifications\n');
  }
  if (!next.includes('import AliyunReactNativePush')) {
    next = next.replace(
      'import UserNotifications\n',
      'import UserNotifications\nimport AliyunReactNativePush\n'
    );
  }
  if (!next.includes('UNUserNotificationCenterDelegate')) {
    next = next.replace(
      'public class AppDelegate: ExpoAppDelegate {',
      'public class AppDelegate: ExpoAppDelegate, UNUserNotificationCenterDelegate {'
    );
  }
  if (!next.includes('UNUserNotificationCenter.current().delegate = self')) {
    next = next.replace(
      'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
      'UNUserNotificationCenter.current().delegate = self\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)'
    );
  }
  if (!next.includes('didRegisterForRemoteNotificationsWithDeviceToken')) {
    next = next.replace(
      '\n}\n\nclass ReactNativeDelegate',
      `${APP_DELEGATE_METHODS}\n}\n\nclass ReactNativeDelegate`
    );
  }

  return next;
}

function withAliyunPushAndroidRepositories(config) {
  return withProjectBuildGradle(config, gradleConfig => {
    let contents = gradleConfig.modResults.contents;
    contents = ensureLine(
      contents,
      ALIYUN_MAVEN_REPOSITORY,
      /allprojects\s*\{\s*repositories\s*\{/
    );
    contents = ensureLine(
      contents,
      HUAWEI_MAVEN_REPOSITORY,
      /allprojects\s*\{\s*repositories\s*\{/
    );
    contents = ensureLine(
      contents,
      HIHONOR_MAVEN_REPOSITORY,
      /allprojects\s*\{\s*repositories\s*\{/
    );
    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });
}

function withAliyunPushIosPodSources(config) {
  return withDangerousMod(config, [
    'ios',
    async modConfig => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const podfilePath = path.join(iosRoot, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podfile = fs.readFileSync(podfilePath, 'utf8');
        if (!podfile.includes("source 'https://github.com/aliyun/aliyun-specs.git'")) {
          podfile = `source 'https://github.com/aliyun/aliyun-specs.git'\n${podfile}`;
        }
        if (!podfile.includes("source 'https://github.com/CocoaPods/Specs.git'")) {
          podfile = `source 'https://github.com/CocoaPods/Specs.git'\n${podfile}`;
        }
        fs.writeFileSync(podfilePath, podfile);
      }

      return modConfig;
    },
  ]);
}

function withAliyunPush(config, options = {}) {
  const projectRoot = config._internal?.projectRoot ?? process.cwd();
  const pushConfig = resolveAliyunPushConfig(projectRoot, options.configFile);

  config = withAliyunPushAndroidRepositories(config);
  config = withAliyunPushIosPodSources(config);

  if (!pushConfig.enabled) {
    return config;
  }

  config = withAndroidManifest(config, manifestConfig => {
    const androidManifest = manifestConfig.modResults;
    const manifest = androidManifest.manifest;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
    const vendors = pushConfig.vendors ?? {};

    addPermission(manifest, 'android.permission.POST_NOTIFICATIONS');
    addPermission(manifest, 'com.hihonor.android.launcher.permission.CHANGE_BADGE');
    addPermission(manifest, 'com.huawei.android.launcher.permission.CHANGE_BADGE');
    addPermission(manifest, 'com.vivo.notification.permission.BADGE_ICON');

    ensureReceiver(application);

    addMetaData(
      application,
      'com.huawei.hms.client.appid',
      vendors.huaweiAppId ? `appid=${vendors.huaweiAppId}` : ''
    );
    addMetaData(application, 'com.vivo.push.api_key', vendors.vivoApiKey);
    addMetaData(application, 'com.vivo.push.app_id', vendors.vivoAppId);
    addMetaData(application, 'com.hihonor.push.app_id', vendors.honorAppId);
    addMetaData(application, 'com.oppo.push.key', vendors.oppoKey ? `id=${vendors.oppoKey}` : '');
    addMetaData(
      application,
      'com.oppo.push.secret',
      vendors.oppoSecret ? `id=${vendors.oppoSecret}` : ''
    );
    addMetaData(
      application,
      'com.xiaomi.push.id',
      vendors.xiaomiAppId ? `id=${vendors.xiaomiAppId}` : ''
    );
    addMetaData(
      application,
      'com.xiaomi.push.key',
      vendors.xiaomiAppKey ? `id=${vendors.xiaomiAppKey}` : ''
    );
    addMetaData(
      application,
      'com.meizu.push.id',
      vendors.meizuAppId ? `id=${vendors.meizuAppId}` : ''
    );
    addMetaData(
      application,
      'com.meizu.push.key',
      vendors.meizuAppKey ? `id=${vendors.meizuAppKey}` : ''
    );
    addMetaData(
      application,
      'com.gcm.push.sendid',
      vendors.fcmSenderId ? `id=${vendors.fcmSenderId}` : ''
    );
    addMetaData(
      application,
      'com.gcm.push.applicationid',
      vendors.fcmAppId ? `id=${vendors.fcmAppId}` : ''
    );
    addMetaData(
      application,
      'com.gcm.push.projectid',
      vendors.fcmProjectId ? `id=${vendors.fcmProjectId}` : ''
    );
    addMetaData(
      application,
      'com.gcm.push.api.key',
      vendors.fcmApiKey ? `id=${vendors.fcmApiKey}` : ''
    );

    return manifestConfig;
  });

  config = withDangerousMod(config, [
    'android',
    async modConfig => {
      const proguardPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      const current = fs.existsSync(proguardPath) ? fs.readFileSync(proguardPath, 'utf8') : '';
      fs.writeFileSync(proguardPath, appendBlock(current, PROGUARD_RULES, '# Aliyun Push'));
      return modConfig;
    },
  ]);

  config = withDangerousMod(config, [
    'ios',
    async modConfig => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const swiftAppDelegatePath = findFirstChildFile(iosRoot, 'AppDelegate.swift');
      if (swiftAppDelegatePath && fs.existsSync(swiftAppDelegatePath)) {
        const content = fs.readFileSync(swiftAppDelegatePath, 'utf8');
        fs.writeFileSync(swiftAppDelegatePath, patchSwiftAppDelegate(content));
      }

      return modConfig;
    },
  ]);

  config = withInfoPlist(config, infoConfig => {
    const enableRemote = pushConfig.ios?.enableBackgroundRemoteNotifications !== false;
    if (enableRemote) {
      infoConfig.modResults.UIBackgroundModes = infoConfig.modResults.UIBackgroundModes || [];
      if (!infoConfig.modResults.UIBackgroundModes.includes('remote-notification')) {
        infoConfig.modResults.UIBackgroundModes.push('remote-notification');
      }
    }
    return infoConfig;
  });

  config = withEntitlementsPlist(config, entitlementsConfig => {
    const apsEnvironment = pushConfig.ios?.apsEnvironment;
    if (apsEnvironment) {
      entitlementsConfig.modResults['aps-environment'] = apsEnvironment;
    }
    return entitlementsConfig;
  });

  return config;
}

module.exports = createRunOncePlugin(withAliyunPush, PLUGIN_NAME, PLUGIN_VERSION);
