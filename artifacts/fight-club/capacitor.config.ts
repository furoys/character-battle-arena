import { CapacitorConfig } from "@capacitor/cli";

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
