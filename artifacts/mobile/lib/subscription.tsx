import React, { createContext, useContext, useCallback } from "react";
import { Platform } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";

export interface SubscriptionStatus {
  plan: "free" | "pro";
  billingCycle: "monthly" | "annual" | null;
  currency: "usd" | "inr" | null;
  expiresAt: string | null;
  queriesLimit: number | null;
  storageUsedBytes: number;
  storageTotalBytes: number;
}

const API_DOMAIN = process.env.EXPO_PUBLIC_API_DOMAIN ?? process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = API_DOMAIN ? `https://${API_DOMAIN}` : "";

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem("commshub_session_token") : null;
    }
    const SecureStore = await import("expo-secure-store");
    return SecureStore.getItemAsync("commshub_session_token");
  } catch {
    return null;
  }
}

function detectCurrency(): "usd" | "inr" {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    if (locale.includes("-IN") || locale.toLowerCase().includes("_in")) return "inr";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "inr";
  } catch {}
  return "usd";
}

function useSubscriptionContext() {
  const { getToken: getClerkToken } = useAuth();
  const queryClient = useQueryClient();

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const clerkToken = await getClerkToken();
      if (clerkToken) return clerkToken;
    } catch {}
    return getToken();
  }, [getClerkToken]);

  const statusQuery = useQuery<SubscriptionStatus>({
    queryKey: ["subscription", "status"],
    queryFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/api/subscription/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch subscription status");
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ billingCycle, currency }: { billingCycle: "monthly" | "annual"; currency: "usd" | "inr" }) => {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/api/payments/razorpay/pro/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ billingCycle, currency }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? "Failed to create order");
      }
      const { checkoutUrl } = await res.json();
      if (!checkoutUrl) throw new Error("No checkout URL returned");

      const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
        dismissButtonStyle: "close",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));
      return result;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/api/subscription/cancel`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to cancel subscription");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });
    },
  });

  const status = statusQuery.data ?? null;
  const isSubscribed = status?.plan === "pro";

  return {
    status,
    isSubscribed,
    isLoading: statusQuery.isLoading,
    isAvailable: true,
    currency: detectCurrency(),
    purchase: purchaseMutation.mutateAsync,
    cancel: cancelMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isCancelling: cancelMutation.isPending,
    error: purchaseMutation.error,
    refetch: statusQuery.refetch,
    restore: async () => {
      await queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });
    },
    isRestoring: false,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}

export function initializeRevenueCat(): void {}
export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";
