import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
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
  signInError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  signInError: null,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = Crypto.getRandomBytes(length);
  return Array.from(array)
    .map((b) => chars[b % chars.length])
    .join("");
}

async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string; codeChallengeMethod: "S256" }> {
  const codeVerifier = generateRandomString(64);
  const base64Digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  const codeChallenge = base64Digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" };
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
  const [signInError, setSignInError] = useState<string | null>(null);

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
    setSignInError(null);
    try {
      const discoveryRes = await fetch(`${ISSUER}/.well-known/openid-configuration`);
      if (!discoveryRes.ok) throw new Error("Failed to contact Replit auth server.");
      const discovery = await discoveryRes.json();
      const authEndpoint: string = discovery.authorization_endpoint;

      const { codeVerifier, codeChallenge, codeChallengeMethod } = await generatePKCE();
      const state = generateRandomString(32);
      const nonce = generateRandomString(32);
      const redirectUri = Linking.createURL("callback");

      const authUrl = new URL(authEndpoint);
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile offline_access");
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", codeChallengeMethod);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("nonce", nonce);
      authUrl.searchParams.set("prompt", "login consent");

      const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUri);

      if (result.type !== "success") return;

      const resultUrl = new URL(result.url);
      const code = resultUrl.searchParams.get("code");
      const returnedState = resultUrl.searchParams.get("state");

      if (!code || returnedState !== state) {
        setSignInError("Sign-in was cancelled or the response was invalid. Please try again.");
        return;
      }

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

      if (!exchangeRes.ok) {
        setSignInError("Could not complete sign-in. Please try again.");
        return;
      }

      const { token: newToken } = await exchangeRes.json();
      if (!newToken) {
        setSignInError("No session token received. Please try again.");
        return;
      }

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
    <AuthContext.Provider value={{ user, token, isLoading, signInError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
