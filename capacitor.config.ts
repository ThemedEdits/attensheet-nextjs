import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.attensheet.app",
  appName: "AttenSheet",
  webDir: "public",
  server: {
    // Points directly to the live production deployment.
    // Pushes to the GitHub repo 'main' branch trigger Vercel deployments,
    // which immediately reflect inside the downloaded mobile app!
    url: "https://attensheet.vercel.app",
    cleartext: false,
    errorPath: "offline.html",
    allowNavigation: [
      "*.firebaseapp.com",
      "accounts.google.com",
      "*.google.com",
      "*.googleapis.com",
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#07110d",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#07110d",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
