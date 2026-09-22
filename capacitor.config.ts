import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.attensheet.app",
  appName: "AttenSheet",
  webDir: "public",
  server: {
    url: "https://attensheet.vercel.app",
    cleartext: true,
    allowNavigation: ["*"],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#07110d",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#07110d",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
