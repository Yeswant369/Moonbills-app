import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moonbillspos.app',
  appName: 'Cherrys Bakery POS',
  webDir: 'out',

  // ── Production server (Vercel hosted) ──────────────────────
  // The app is served from the live Vercel deployment.
  // Capacitor will load this URL inside the native WebView
  // instead of bundled static files — so Supabase, API routes,
  // and server actions all work normally.
  server: {
    url: 'https://moonbills-app.vercel.app',
    cleartext: false, // HTTPS only — no cleartext needed
  },

  plugins: {
    // No extra plugin config needed; PrinterPlugin is registered natively
  },
};

export default config;
