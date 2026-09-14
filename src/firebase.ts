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
const DEMO_MODE_KEY = 'threemister_is_demo_mode';
const AUTH_CHANNEL_NAME = 'threemister_auth_channel';

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Listen for cross-tab auth broadcasts (e.g. user signs in via a new tab)
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'AUTH_SUCCESS' && event.data?.token) {
          cachedAccessToken = event.data.token;
          if (auth.currentUser && onAuthSuccess) {
            onAuthSuccess(auth.currentUser, event.data.token);
          }
        }
      };
    } catch {
      // Ignore broadcast channel errors in restricted environments
    }
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken && typeof window !== 'undefined') {
        try {
          cachedAccessToken = localStorage.getItem(TOKEN_KEY);
        } catch {
          cachedAccessToken = null;
        }
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
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
    console.error('Sign in error:', error);
    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      const blockedError = new Error('auth/popup-blocked');
      (blockedError as any).code = 'auth/popup-blocked';
      throw blockedError;
    }
    throw error;
  } finally {
    isSigningIn = false;
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
