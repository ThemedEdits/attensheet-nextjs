import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.attensheet.app",
  appName: "AttenSheet",
  webDir: "public",
  server: {
    url: "https://attensheet.vercel.app",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#07110d",
  },
};

export default config;
