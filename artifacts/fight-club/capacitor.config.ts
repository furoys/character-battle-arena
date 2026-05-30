import { CapacitorConfig } from "@capacitor/cli";

// ⚠️ NOT the active config. The Android project is synced from the ROOT
// /capacitor.config.ts (appId com.furoys.ava). This file is stale/unused —
// do not edit it expecting it to affect the built APK. Kept only for history.
const config: CapacitorConfig = {
  appId: "app.replit.anyonevsanyone.twa",
  appName: "A.v.A — Anyone vs Anyone",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
  plugins: {
    StatusBar: {
      style: "Dark",
      backgroundColor: "#030308",
      overlaysWebView: false,
    },
  },
};

export default config;
