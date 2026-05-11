export const PermissionsAndroid = {
  PERMISSIONS: {
    POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
  },
  RESULTS: {
    GRANTED: 'granted',
  },
  check: async () => true,
  request: async () => 'granted',
};

export const Platform = {
  OS: 'android',
  Version: 33,
};
