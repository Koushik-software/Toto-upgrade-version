import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.koushiksoftware.totodrive.captain',
  appName: 'TOTO Captain',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1E293B',
      showSpinner: false
    },
    Geolocation: {
      requestPermissions: true
    }
  }
};

export default config;
