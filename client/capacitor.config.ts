import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.downwind.paddling",
  appName: "Downwind Paddling",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
