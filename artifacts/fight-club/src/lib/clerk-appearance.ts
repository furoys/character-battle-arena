import { dark } from "@clerk/themes";
import { getAppOrigin, isNativePlatform } from "@/lib/api-fetch";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    get logoImageUrl() {
      // On Capacitor native builds, Vite's BASE_URL is a relative path like "."
      // which would produce a malformed URL (e.g. "https://example.com./logo.svg").
      // Use the production absolute URL directly when on native.
      if (isNativePlatform()) return `${getAppOrigin()}/logo.svg`;
      return `${getAppOrigin()}${basePath}/logo.svg`;
    },
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#ff0055",
    colorForeground: "#ffffff",
    colorMutedForeground: "rgba(255,255,255,0.55)",
    colorDanger: "#ff3b30",
    colorBackground: "#0c0d18",
    colorInput: "#15172a",
    colorInputForeground: "#ffffff",
    colorNeutral: "rgba(255,255,255,0.12)",
    fontFamily: "'Rajdhani', system-ui, sans-serif",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox:
      "bg-[#0c0d18] rounded-md w-[400px] max-w-full overflow-hidden border-2 border-primary/30 shadow-[0_0_40px_rgba(255,0,85,0.2)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none !px-6 !py-6",
    footer:
      "!shadow-none !border-0 !bg-[#08090f] !rounded-none border-t border-primary/15 !py-3",
    headerTitle:
      "font-display text-2xl uppercase tracking-widest text-primary",
    headerSubtitle: "text-sm text-white/60",
    socialButtonsBlockButton:
      "border border-white/15 bg-white/5 hover:bg-white/10 text-white",
    socialButtonsBlockButtonText:
      "text-sm font-bold uppercase tracking-wider text-white",
    formFieldLabel:
      "text-[10px] font-bold uppercase tracking-widest text-white/70",
    formFieldInput:
      "bg-[#15172a] border border-white/10 text-white focus:border-primary/60",
    formButtonPrimary:
      "bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest",
    footerAction: "text-xs",
    footerActionText: "text-white/55",
    footerActionLink:
      "text-primary hover:text-primary/80 font-bold uppercase tracking-wider",
    dividerLine: "bg-white/10",
    dividerText: "text-white/45 text-[10px] uppercase tracking-widest",
    identityPreviewEditButton: "text-primary hover:text-primary/80",
    formFieldSuccessText: "text-emerald-400 text-xs",
    alertText: "text-white text-sm",
    alert: "border border-destructive/40 bg-destructive/10",
    otpCodeFieldInput: "bg-[#15172a] border border-white/10 text-white",
    formFieldRow: "gap-2",
    main: "gap-3",
    logoBox: "justify-center mb-2",
    logoImage: "h-12 w-auto",
  },
};
