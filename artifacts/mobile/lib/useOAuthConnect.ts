import { useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@clerk/expo";

const API_DOMAIN = process.env.EXPO_PUBLIC_API_DOMAIN ?? process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = API_DOMAIN ? `https://${API_DOMAIN}` : "";
const OAUTH_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : API_BASE;

export function useOAuthConnect() {
  const { getToken } = useAuth();

  const connectOAuth = useCallback(async (provider: "gmail" | "outlook") => {
    const token = await getToken();
    if (!token) throw new Error("No auth token");
    const url = `${OAUTH_BASE}/api/auth/${provider}/connect?mobileToken=${encodeURIComponent(token)}`;
    const completeUrl = `${OAUTH_BASE}/api/mobile-oauth-complete`;
    await WebBrowser.openAuthSessionAsync(url, completeUrl);
  }, [getToken]);

  const disconnectOAuth = useCallback(async (provider: "gmail" | "outlook") => {
    const token = await getToken();
    if (!token) throw new Error("No auth token");
    const res = await fetch(`${API_BASE}/api/auth/${provider}/disconnect`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to disconnect ${provider}`);
  }, [getToken]);

  const fetchConnectedStatus = useCallback(async (): Promise<{ gmail: boolean; outlook: boolean }> => {
    const token = await getToken();
    if (!token) return { gmail: false, outlook: false };
    const res = await fetch(`${API_BASE}/api/accounts/connected`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return { gmail: !!data.gmail, outlook: !!data.outlook };
    }
    return { gmail: false, outlook: false };
  }, [getToken]);

  return { connectOAuth, disconnectOAuth, fetchConnectedStatus };
}
