import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.04520665efff45e69c707c0c38ad61d2',
  appName: 'VivaVault',
  webDir: 'dist',
  server: {
    url: 'https://04520665-efff-45e6-9c70-7c0c38ad61d2.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
