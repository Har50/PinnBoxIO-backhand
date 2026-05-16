import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";

let rcConfigured = false;

export function initializeRevenueCat(): void {
  if (Platform.OS === "web") return;
  if (rcConfigured) return;
  rcConfigured = true;

  const apiKey =
    Platform.OS === "ios"
      ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY)
      : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY);

  if (!apiKey) {
    console.warn("[RevenueCat] No API key found — purchases will not work on native.");
    return;
  }

  import("react-native-purchases")
    .then(({ default: Purchases }) => {
      Purchases.configure({ apiKey });
    })
    .catch((err) => {
      console.warn("[RevenueCat] configure failed:", err);
      rcConfigured = false;
    });
}

export interface RCOffering {
  monthly: import("react-native-purchases").PurchasesPackage | null;
  annual: import("react-native-purchases").PurchasesPackage | null;
  monthlyPriceString: string | null;
  annualPriceString: string | null;
}

export async function getOfferings(): Promise<RCOffering> {
  if (Platform.OS === "web") {
    return { monthly: null, annual: null, monthlyPriceString: null, annualPriceString: null };
  }
  const { default: Purchases } = await import("react-native-purchases");
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  return {
    monthly: current?.monthly ?? null,
    annual: current?.annual ?? null,
    monthlyPriceString: current?.monthly?.product?.priceString ?? null,
    annualPriceString: current?.annual?.product?.priceString ?? null,
  };
}

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

async function getSecureToken(): Promise<string | null> {
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

async function checkRCProStatus(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { default: Purchases } = await import("react-native-purchases");
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;
  } catch {
    return false;
  }
}

function useSubscriptionContext() {
  const { getToken: getClerkToken } = useAuth();
  const queryClient = useQueryClient();

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const clerkToken = await getClerkToken();
      if (clerkToken) return clerkToken;
    } catch {}
    return getSecureToken();
  }, [getClerkToken]);

  const statusQuery = useQuery<SubscriptionStatus>({
    queryKey: ["subscription", "status"],
    queryFn: async () => {
      if (Platform.OS !== "web") {
        const isPro = await checkRCProStatus();
        if (isPro) {
          return {
            plan: "pro",
            billingCycle: null,
            currency: null,
            expiresAt: null,
            queriesLimit: null,
            storageUsedBytes: 0,
            storageTotalBytes: 25 * 1024 * 1024 * 1024,
          } satisfies SubscriptionStatus;
        }
      }
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
      if (Platform.OS !== "web") {
        const { default: Purchases } = await import("react-native-purchases");
        const offerings = await Purchases.getOfferings();
        const pkg =
          billingCycle === "annual"
            ? offerings.current?.annual
            : offerings.current?.monthly;

        if (!pkg) {
          throw new Error("No offering found for this plan. Please try again later.");
        }

        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const isPro = customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;
        if (!isPro) {
          throw new Error("Purchase completed but Pro entitlement was not activated. Please restore purchases.");
        }
        return customerInfo;
      }

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

  const restorePurchases = useCallback(async () => {
    if (Platform.OS !== "web") {
      const { default: Purchases } = await import("react-native-purchases");
      await Purchases.restorePurchases();
    }
    await queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });
  }, [queryClient]);

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
    restore: restorePurchases,
    isRestoring: false,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
