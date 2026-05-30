import type { CapacitorConfig } from '@capacitor/cli';

// The native shell loads the LIVE production site directly instead of bundled
// dev assets. This is required for authentication to work: a bundled build made
// from the dev environment bakes in the *development* Clerk key, so it signs
// users in against the dev Clerk instance and gets dev-minted tokens — but all
// API calls go to the production server, which validates tokens against the
// *production* Clerk instance and rejects them (every request looks like a
// guest). Loading the production URL makes the WebView origin the production
// domain, so the production Clerk key, the auth proxy, and same-origin session
// cookies all line up exactly like the website does.
const config: CapacitorConfig = {
  appId: 'com.furoys.ava',
  appName: 'A.V.A',
  webDir: 'artifacts/fight-club/dist/public',
  server: {
    url: 'https://AnyoneVsAnyone.replit.app',
    androidScheme: 'https',
  },
};

export default config;
