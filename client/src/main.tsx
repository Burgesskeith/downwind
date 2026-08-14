import { createRoot } from "react-dom/client";
import App from "./App";
import { configureNativeApi } from "@/lib/native";
import { initAnalytics } from "@/lib/analytics";
import "./index.css";

async function bootstrap() {
  // Finish native API wiring before analytics so Capacitor is definitely up.
  await configureNativeApi();
  await initAnalytics();
}

void bootstrap();

createRoot(document.getElementById("root")!).render(<App />);
