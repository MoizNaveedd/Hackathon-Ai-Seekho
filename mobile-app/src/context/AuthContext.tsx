/**
 * Karigar.ai - Auth Context
 *
 * Handles:
 *  - Persisting the signed-in user session across app restarts (AsyncStorage)
 *  - Calling /sso_login after a successful Google Sign-In
 *  - Exposing the resolved backend `user_id` to the rest of the app
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { ssoLogin, type GoogleUserData, type SSOLoginResponse } from "../services/apiService";

// ─────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────
const STORAGE_KEY_GOOGLE_USER = "@karigar:google_user";
const STORAGE_KEY_BACKEND_USER = "@karigar:backend_user";

// ─────────────────────────────────────────────
// Shape of what we persist / expose
// ─────────────────────────────────────────────
export interface AuthUser {
  /** Raw Google Sign-In result */
  googleData: GoogleUserData;
  /** Backend user record returned by /sso_login */
  backendUser: SSOLoginResponse;
}

interface AuthContextValue {
  /** null = not yet loaded from storage; undefined = not signed in */
  authUser: AuthUser | null | undefined;
  /** true while reading from AsyncStorage on first launch */
  isLoading: boolean;
  /** Call after a successful GoogleSignin.signIn() */
  handleGoogleSignIn: (googleData: GoogleUserData) => Promise<void>;
  /** Signs out locally and from Google */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // null = loading, undefined = not signed in, AuthUser = signed in
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore persisted session
  useEffect(() => {
    (async () => {
      try {
        const [googleRaw, backendRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_GOOGLE_USER),
          AsyncStorage.getItem(STORAGE_KEY_BACKEND_USER),
        ]);

        if (googleRaw && backendRaw) {
          const googleData: GoogleUserData = JSON.parse(googleRaw);
          const backendUser: SSOLoginResponse = JSON.parse(backendRaw);
          console.log("🔑 Restored session for user_id:", backendUser.user?.id);
          setAuthUser({ googleData, backendUser });
        } else {
          setAuthUser(undefined);
        }
      } catch (err) {
        console.warn("⚠️ Failed to restore session:", err);
        setAuthUser(undefined);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /**
   * Called after a successful Google Sign-In.
   * Calls /sso_login, stores everything, then sets auth state.
   */
  const handleGoogleSignIn = useCallback(async (googleData: GoogleUserData) => {
    console.log("🚀 Calling /sso_login...");
    try {
      const backendUser = await ssoLogin(googleData);
      console.log("✅ /sso_login success, user_id:", backendUser.user.id, "name:", backendUser.user.name);

      // Persist to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_GOOGLE_USER, JSON.stringify(googleData)),
        AsyncStorage.setItem(STORAGE_KEY_BACKEND_USER, JSON.stringify(backendUser)),
      ]);

      setAuthUser({ googleData, backendUser });
    } catch (err) {
      console.error("❌ /sso_login failed:", err);
      // Still allow local sign-in with a stub user_id so app is usable
      const fallback: SSOLoginResponse = {
        message: "fallback",
        user: { id: -1, name: "", email: "", google_id: "", photo: "", location: "", latitude: 0, longitude: 0 },
      };
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_GOOGLE_USER, JSON.stringify(googleData)),
        AsyncStorage.setItem(STORAGE_KEY_BACKEND_USER, JSON.stringify(fallback)),
      ]);
      setAuthUser({ googleData, backendUser: fallback });
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch (err) {
      console.warn("Google sign-out error:", err);
    }
    await AsyncStorage.multiRemove([STORAGE_KEY_GOOGLE_USER, STORAGE_KEY_BACKEND_USER]);
    setAuthUser(undefined);
  }, []);

  return (
    <AuthContext.Provider value={{ authUser, isLoading, handleGoogleSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
