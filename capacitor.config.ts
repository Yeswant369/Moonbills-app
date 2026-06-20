import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moonbillspos.app',
  appName: 'Cherrys Bakery POS',
  webDir: 'out',

  // ── Development server (live-reload) ───────────────────────
  // When running `npm run dev` locally, Capacitor can point to the
  // Next.js dev server instead of the static `out/` folder.
  // Uncomment the block below when running `npx cap run android/ios` in dev:
  //
  // server: {
  //   url: 'http://192.168.1.X:3000',   // ← replace with your Mac's LAN IP
  //   cleartext: true,
  // },

  plugins: {
    // No extra plugin config needed; PrinterPlugin is registered natively
  },
};

export default config;
