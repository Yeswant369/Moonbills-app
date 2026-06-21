import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moonbillspos.app',
  appName: 'Cherrys Bakery POS',
  webDir: 'out',
  server: {
    url: 'https://moonbills-app.vercel.app',
    cleartext: false,
    allowNavigation: [
      '*.clerk.accounts.dev',
      'moonbills-app.vercel.app'
    ]
  },
  plugins: {
    // No extra plugin config needed; PrinterPlugin is registered natively
  }
};

export default config;