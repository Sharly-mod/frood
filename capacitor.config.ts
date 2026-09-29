import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native mobile shell (Play Store / App Store).
 *
 * The app runs its normal Web build; the native WebView loads the deployed
 * website (CAPACITOR_SERVER_URL) instead of bundling the server-dependent
 * routes (Stripe APIs) locally:
 *
 *   CAPACITOR_SERVER_URL=https://frood.app npx cap sync
 *
 * See README → "Distribution mobile (Play Store / App Store)".
 */
const config: CapacitorConfig = {
  appId: "com.frood.app",
  appName: "Frood",
  webDir: "mobile/www",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://frood.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;