import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.koushiksoftware.totodrive.passenger',
  appName: 'TOTO Drive',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FAF8F5',
      showSpinner: false
    },
    Geolocation: {
      requestPermissions: true
    }
  }
};

export default config;
