import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.downwind.paddling",
  appName: "Downwind Paddling",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  // Avoid SwiftPM package identity collision for @capacitor-firebase/analytics.
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/analytics": {
            symlink: true,
          },
        },
      },
    },
  },
};

export default config;
