import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lwlup.coaching',
  appName: 'LWL UP',
  webDir: 'public',
  server: {
    url: 'https://lwlup.com',
    cleartext: false,
  },
};

export default config;
