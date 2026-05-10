import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initCapacitor } from "./capacitor-init";
import { setBaseUrl } from "@workspace/api-client-react";
import { Capacitor } from "@capacitor/core";

// On Capacitor Android/iOS the app is served from the local bundle — there is
// no server at "localhost". Point every API call at the production server so
// that useListCharacters (and all other React Query hooks) work in native builds.
if (Capacitor.isNativePlatform()) {
  setBaseUrl("https://AnyoneVsAnyone.replit.app");
}

initCapacitor().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
