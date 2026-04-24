import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initCapacitor } from "./capacitor-init";

initCapacitor().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
