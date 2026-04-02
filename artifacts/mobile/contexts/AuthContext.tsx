import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const SECURE_STORE_KEY = "commshub_session_token";
const ISSUER = "https://replit.com/oidc";
const CLIENT_ID = process.env.EXPO_PUBLIC_REPL_ID ?? "";
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

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
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function base64urlEncode(buffer: Uint8Array): string {
  let str = "";
  for (let i = 0; i < buffer.length; i++) {
    str += String.fromCharCode(buffer[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array)
    .map((b) => chars[b % chars.length])
    .join("");
}

async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = generateRandomString(64);

  if (
    typeof crypto !== "undefined" &&
    crypto.subtle &&
    typeof TextEncoder !== "undefined"
  ) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const codeChallenge = base64urlEncode(new Uint8Array(digest));
    return { codeVerifier, codeChallenge };
  }

  return { codeVerifier, codeChallenge: codeVerifier };
}

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(SECURE_STORE_KEY);
    }
    return await SecureStore.getItemAsync(SECURE_STORE_KEY);
  } catch {
    return null;
  }
}

async function saveToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(SECURE_STORE_KEY, token);
  } else {
    await SecureStore.setItemAsync(SECURE_STORE_KEY, token);
  }
}

async function removeToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(SECURE_STORE_KEY);
  } else {
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
  }, []);

  const signIn = useCallback(async () => {
    try {
      const discoveryRes = await fetch(`${ISSUER}/.well-known/openid-configuration`);
      const discovery = await discoveryRes.json();
      const authEndpoint: string = discovery.authorization_endpoint;

      const { codeVerifier, codeChallenge } = await generatePKCE();
      const state = generateRandomString(32);
      const nonce = generateRandomString(32);
      const redirectUri = "mobile://callback";

      const authUrl = new URL(authEndpoint);
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile offline_access");
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("nonce", nonce);
      authUrl.searchParams.set("prompt", "login consent");

      const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUri);

      if (result.type !== "success") return;

      const resultUrl = new URL(result.url);
      const code = resultUrl.searchParams.get("code");
      const returnedState = resultUrl.searchParams.get("state");

      if (!code || returnedState !== state) return;

      const exchangeRes = await fetch(`${API_BASE}/api/mobile-auth/token-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          state,
          nonce,
        }),
      });

      if (!exchangeRes.ok) return;

      const { token: newToken } = await exchangeRes.json();
      if (!newToken) return;

      const u = await fetchCurrentUser(newToken);
      if (!u) return;

      await saveToken(newToken);
      setToken(newToken);
      setUser(u);
    } catch (err) {
      console.error("Sign-in error:", err);
    }
  }, []);

  const signOut = useCallback(async () => {
    const currentToken = token;
    setUser(null);
    setToken(null);
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
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
