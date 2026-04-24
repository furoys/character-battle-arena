import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: "#030308" });
  await StatusBar.setOverlaysWebView({ overlay: false });

  if ((StatusBar as any).setNavigationBarColor) {
    await (StatusBar as any).setNavigationBarColor({ color: "#030308" });
  }
  if ((StatusBar as any).setNavigationBarStyle) {
    await (StatusBar as any).setNavigationBarStyle({ style: Style.Dark });
  }
}
