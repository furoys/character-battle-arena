import { Capacitor } from "@capacitor/core";

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#030308" });
    await StatusBar.setOverlaysWebView({ overlay: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bar = StatusBar as any;
    if (typeof bar.setNavigationBarColor === "function") {
      await bar.setNavigationBarColor({ color: "#030308" });
    }
    if (typeof bar.setNavigationBarStyle === "function") {
      await bar.setNavigationBarStyle({ style: Style.Dark });
    }
  } catch {
    // StatusBar plugin not available on this platform — skip silently.
  }
}
