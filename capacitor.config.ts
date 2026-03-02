import type { CapacitorConfig } from '@capacitor/cli';

const appUrl = process.env.CAPACITOR_SERVER_URL?.trim() || 'https://flixnest.app';

const config: CapacitorConfig = {
  appId: 'app.flixnest.web',
  appName: 'FlixNest',
  webDir: 'out',
  server: {
    url: appUrl,
    cleartext: appUrl.startsWith('http://'),
    androidScheme: appUrl.startsWith('https://') ? 'https' : 'http',
  },
};

export default config;
