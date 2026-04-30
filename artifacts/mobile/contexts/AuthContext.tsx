import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const SECURE_STORE_KEY = "commshub_session_token";
const PKCE_STORAGE_KEY = "commshub_pkce_state";
const ISSUER = "https://replit.com/oidc";
const CLIENT_ID = process.env.EXPO_PUBLIC_REPL_ID ?? "";
const APP_SCHEME = "pinnboxio";
const API_DOMAIN = process.env.EXPO_PUBLIC_API_DOMAIN ?? process.env.EXPO_PUBLIC_DOMAIN;
const AUTH_REDIRECT_DOMAIN = process.env.EXPO_PUBLIC_AUTH_REDIRECT_DOMAIN ?? API_DOMAIN;
const API_BASE = API_DOMAIN ? `https://${API_DOMAIN}` : "";
const AUTH_REDIRECT_BASE = AUTH_REDIRECT_DOMAIN ? `https://${AUTH_REDIRECT_DOMAIN}` : "";
const MOBILE_OIDC_REDIRECT_URI = `${AUTH_REDIRECT_BASE}/api/mobile-auth/callback`;

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signInError: string | null;
  signIn: () => Promise<void>;
  signUp: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  signInError: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let array: Uint8Array;
  if (Platform.OS === "web") {
    array = new Uint8Array(length);
    (globalThis.crypto ?? (globalThis as any).msCrypto).getRandomValues(array);
  } else {
    const { getRandomValues } = require("expo-crypto");
    array = getRandomValues(new Uint8Array(length));
  }
  return Array.from(array).map((b) => chars[b % chars.length]).join("");
}

async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string; codeChallengeMethod: "S256" }> {
  const codeVerifier = generateRandomString(64);
  let codeChallenge: string;
  if (Platform.OS === "web") {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    codeChallenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } else {
    const Crypto = await import("expo-crypto");
    const base64Digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    codeChallenge = base64Digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" };
}

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem(SECURE_STORE_KEY) : null;
    }
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync(SECURE_STORE_KEY);
  } catch {
    return null;
  }
}

async function saveToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(SECURE_STORE_KEY, token);
  } else {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(SECURE_STORE_KEY, token);
  }
}

async function removeToken(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.removeItem(SECURE_STORE_KEY);
  } else {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
  }
}

async function fetchCurrentUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

function getWebCallbackUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/callback`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);

  const completeWebCallback = useCallback(async (code: string, storedState: string, returnedState: string) => {
    if (returnedState !== storedState) {
      setSignInError("Authentication response was invalid. Please try again.");
      setIsLoading(false);
      return;
    }

    const stored = Platform.OS === "web" ? sessionStorage.getItem(PKCE_STORAGE_KEY) : null;
    if (!stored) {
      setSignInError("Authentication session expired. Please try again.");
      setIsLoading(false);
      return;
    }

    let pkce: { codeVerifier: string; nonce: string };
    try {
      pkce = JSON.parse(stored);
    } catch {
      setSignInError("Authentication session was corrupted. Please try again.");
      setIsLoading(false);
      return;
    }

    sessionStorage.removeItem(PKCE_STORAGE_KEY);

    try {
      const redirectUri = getWebCallbackUrl();
      const exchangeRes = await fetch(`${API_BASE}/api/mobile-auth/token-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: pkce.codeVerifier,
          redirect_uri: redirectUri,
          state: returnedState,
          nonce: pkce.nonce,
        }),
      });

      if (!exchangeRes.ok) {
        setSignInError("Could not complete authentication. Please try again.");
        setIsLoading(false);
        return;
      }

      const { token: newToken } = await exchangeRes.json();
      if (!newToken) {
        setSignInError("No session token received. Please try again.");
        setIsLoading(false);
        return;
      }

      const u = await fetchCurrentUser(newToken);
      if (!u) {
        setSignInError("Could not load your profile. Please try again.");
        setIsLoading(false);
        return;
      }

      await saveToken(newToken);
      setToken(newToken);
      setUser(u);
      setSignInError(null);

      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/");
      }
    } catch (err) {
      console.error("Token exchange error:", err);
      setSignInError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const storedState = sessionStorage.getItem("commshub_oauth_state");

        if (code && state && storedState) {
          sessionStorage.removeItem("commshub_oauth_state");
          await completeWebCallback(code, storedState, state);
          return;
        }
      }

      const stored = await getToken();
      if (stored) {
        const u = await fetchCurrentUser(stored);
        if (u) {
          setUser(u);
          setToken(stored);
        } else {
          await removeToken();
        }
      }
      setIsLoading(false);
    })();
  }, [completeWebCallback]);

  const startAuthFlow = useCallback(async (screenHint?: "signup") => {
    setSignInError(null);
    try {
      const discoveryRes = await fetch(`${ISSUER}/.well-known/openid-configuration`);
      if (!discoveryRes.ok) throw new Error("Failed to contact Replit auth server.");
      const discovery = await discoveryRes.json();
      const authEndpoint: string = discovery.authorization_endpoint;

      const { codeVerifier, codeChallenge, codeChallengeMethod } = await generatePKCE();
      const state = generateRandomString(32);
      const nonce = generateRandomString(32);

      if (Platform.OS === "web") {
        const redirectUri = getWebCallbackUrl();

        sessionStorage.setItem("commshub_oauth_state", state);
        sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify({ codeVerifier, nonce }));

        const authUrl = new URL(authEndpoint);
        authUrl.searchParams.set("client_id", CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "openid email profile offline_access");
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", codeChallengeMethod);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("nonce", nonce);
        if (screenHint) authUrl.searchParams.set("screen_hint", screenHint);

        window.location.href = authUrl.toString();
        return;
      }

      // --- Server-side token exchange via polling ---
      // Pre-register the PKCE session with the server so it can exchange the
      // code itself on the callback, eliminating deep-link dependency in Expo Go.
      // Always route auth through AUTH_REDIRECT_BASE (production) so the PKCE
      // session and poll live on the same stable server as the OAuth callback.
      const AUTH_BASE = AUTH_REDIRECT_BASE || API_BASE;
      const prepareRes = await fetch(`${AUTH_BASE}/api/mobile-auth/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          code_verifier: codeVerifier,
          nonce,
          redirect_uri: MOBILE_OIDC_REDIRECT_URI,
        }),
      });
      if (!prepareRes.ok) {
        setSignInError("Could not start authentication. Please try again.");
        return;
      }

      // Use the registered app scheme as the session-close trigger.
      // ASWebAuthenticationSession (iOS) closes the browser when it sees
      // a redirect to this scheme — even inside Expo Go, since it only
      // monitors for the scheme rather than routing to the app.
      // The actual auth result comes via polling, not this URL.
      const appCallbackUri = `${APP_SCHEME}://callback`;

      const authUrl = new URL(authEndpoint);
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", MOBILE_OIDC_REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile offline_access");
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", codeChallengeMethod);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("nonce", nonce);
      if (screenHint) authUrl.searchParams.set("screen_hint", screenHint);

      // Poll for the session token.
      // The server exchanges the code on its callback route and stores the result;
      // polling retrieves it without requiring a working deep link.
      let pollToken: string | null = null;
      let pollError: string | null = null;
      let forceStop = false; // set after browser closes + grace period

      const pollPromise = new Promise<void>((resolve) => {
        const MAX_POLLS = 150; // 5 min hard limit
        let count = 0;
        async function poll() {
          if (forceStop || count >= MAX_POLLS) { resolve(); return; }
          count++;
          try {
            const r = await fetch(`${AUTH_BASE}/api/mobile-auth/poll/${encodeURIComponent(state)}`, {
              headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            });
            if (r.ok) {
              const data = await r.json();
              if (data.status === "complete" && data.token) {
                pollToken = data.token;
                resolve();
                return;
              }
              if (data.status === "error") {
                pollError = data.error ?? "sign_in_failed";
                resolve();
                return;
              }
            }
          } catch { /* network hiccup — retry */ }
          setTimeout(poll, 2000);
        }
        setTimeout(poll, 2000);
      });

      // Open the browser — for standalone builds the JS deep link closes it instantly.
      // For Expo Go the user must close manually after seeing "You're signed in!".
      await WebBrowser.openAuthSessionAsync(authUrl.toString(), appCallbackUri);

      // Browser is closed. Give the server up to 15s to process the callback and
      // for the poll to pick it up (the callback may still be in-flight).
      await Promise.race([
        pollPromise,
        new Promise<void>((resolve) => setTimeout(() => { forceStop = true; resolve(); }, 15000)),
      ]);

      if (pollError || !pollToken) {
        setSignInError(
          pollError === "session_expired"
            ? "Session expired. Please try again."
            : pollError
              ? "Could not complete sign-in. Please try again."
              : "Sign-in was cancelled. If you approved access, wait a moment and try again."
        );
        return;
      }

      const newToken = pollToken;
      const u = await fetchCurrentUser(newToken);
      if (!u) {
        setSignInError("Could not load your profile. Please try again.");
        return;
      }

      await saveToken(newToken);
      setToken(newToken);
      setUser(u);
      setSignInError(null);
    } catch (err) {
      console.error("Sign-in error:", err);
      setSignInError("An unexpected error occurred. Please check your connection and try again.");
    }
  }, []);

  const signIn = useCallback(() => startAuthFlow(), [startAuthFlow]);
  const signUp = useCallback(() => startAuthFlow("signup"), [startAuthFlow]);

  const signOut = useCallback(async () => {
    const currentToken = token;
    setUser(null);
    setToken(null);
    setSignInError(null);
    await removeToken();

    if (currentToken) {
      try {
        await fetch(`${API_BASE}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch {}
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signInError, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
