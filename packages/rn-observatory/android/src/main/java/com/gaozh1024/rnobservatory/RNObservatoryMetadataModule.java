package com.gaozh1024.rnobservatory;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;

import java.util.HashMap;
import java.util.Map;

public class RNObservatoryMetadataModule extends ReactContextBaseJavaModule {
  public static final String NAME = "RNObservatoryMetadata";

  public RNObservatoryMetadataModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return NAME;
  }

  @Override
  public Map<String, Object> getConstants() {
    return getMetadata();
  }

  private Map<String, Object> getMetadata() {
    Map<String, Object> constants = new HashMap<>();
    String packageName = getReactApplicationContext().getPackageName();
    constants.put("appId", packageName);
    constants.put("packageName", packageName);

    try {
      PackageInfo packageInfo = getReactApplicationContext()
        .getPackageManager()
        .getPackageInfo(packageName, 0);
      constants.put("version", packageInfo.versionName == null ? "" : packageInfo.versionName);
      constants.put("buildNumber", String.valueOf(getVersionCode(packageInfo)));
      constants.put("versionCode", String.valueOf(getVersionCode(packageInfo)));
    } catch (PackageManager.NameNotFoundException ignored) {
      constants.put("version", "");
      constants.put("buildNumber", "");
      constants.put("versionCode", "");
    }

    return constants;
  }

  private long getVersionCode(PackageInfo packageInfo) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      return packageInfo.getLongVersionCode();
    }
    return packageInfo.versionCode;
  }
}
