import { createRoot } from "react-dom/client";
import App from "./App";
import { configureNativeApi } from "@/lib/native";
import "./index.css";

void configureNativeApi();

createRoot(document.getElementById("root")!).render(<App />);
