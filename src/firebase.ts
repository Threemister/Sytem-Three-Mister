/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Add the requested Google Sheets scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Cache the access token in memory and local storage
const TOKEN_KEY = 'threemister_oauth_token';
const CLOUD_EMAIL_KEY = 'threemister_cloud_user_email';
const DEMO_MODE_KEY = 'threemister_is_demo_mode';
const AUTH_CHANNEL_NAME = 'threemister_auth_channel';

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const saveManualCloudToken = (token: string, email = 'ersgroup2002@gmail.com') => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(CLOUD_EMAIL_KEY, email);
      localStorage.removeItem(DEMO_MODE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Listen for cross-tab auth broadcasts (e.g. user signs in via a new tab)
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'AUTH_SUCCESS' && event.data?.token) {
          cachedAccessToken = event.data.token;
          const fallbackUser = auth.currentUser || {
            email: event.data.email || 'ersgroup2002@gmail.com',
            displayName: 'THREE MISTER Cloud',
            uid: 'threemister-cloud-sync'
          };
          if (onAuthSuccess) {
            onAuthSuccess(fallbackUser, event.data.token);
          }
        }
      };
    } catch {
      // Ignore broadcast channel errors in restricted environments
    }
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (!cachedAccessToken && typeof window !== 'undefined') {
      try {
        cachedAccessToken = localStorage.getItem(TOKEN_KEY);
      } catch {
        cachedAccessToken = null;
      }
    }

    if (user && cachedAccessToken && cachedAccessToken !== 'offline-demo-token') {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (cachedAccessToken && cachedAccessToken !== 'offline-demo-token') {
      // Support cross-domain Cloud Sync token on GitHub Pages where Firebase popup wasn't used
      let savedEmail = 'ersgroup2002@gmail.com';
      try {
        savedEmail = localStorage.getItem(CLOUD_EMAIL_KEY) || 'ersgroup2002@gmail.com';
      } catch {}
      const cloudUser = {
        email: savedEmail,
        displayName: 'THREE MISTER Cloud Sync',
        uid: 'threemister-cloud-sync'
      };
      if (onAuthSuccess) onAuthSuccess(cloudUser, cachedAccessToken);
    } else if (!isSigningIn) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari otorisasi Google.');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TOKEN_KEY, credential.accessToken);
        localStorage.removeItem(DEMO_MODE_KEY);

        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
          channel.postMessage({
            type: 'AUTH_SUCCESS',
            token: cachedAccessToken,
            email: result.user.email,
          });
        }
      } catch {
        // Ignore storage errors
      }
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' || 
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      console.info('Google sign-in popup was closed by the user or cancelled.');
      return null;
    }

    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      console.warn('Google sign-in popup was blocked by the browser.');
      const blockedError = new Error('auth/popup-blocked');
      (blockedError as any).code = 'auth/popup-blocked';
      throw blockedError;
    }

    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      console.warn('Firebase unauthorized domain detected:', error?.message);
      const unauthorizedError = new Error('auth/unauthorized-domain');
      (unauthorizedError as any).code = 'auth/unauthorized-domain';
      (unauthorizedError as any).domain = typeof window !== 'undefined' ? window.location.hostname : '';
      throw unauthorizedError;
    }

    console.warn('Google sign-in exception:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const clearExpiredToken = () => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    try {
      cachedAccessToken = localStorage.getItem(TOKEN_KEY);
    } catch {
      cachedAccessToken = null;
    }
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(DEMO_MODE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
};
