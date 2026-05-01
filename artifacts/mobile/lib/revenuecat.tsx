import React, { createContext, useContext, useEffect } from "react";
import { Platform } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useAuth } from "@/contexts/AuthContext";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";

function getRevenueCatApiKey(): string | null {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    return null;
  }
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }
  if (Platform.OS === "ios") {
    return REVENUECAT_IOS_API_KEY;
  }
  if (Platform.OS === "android") {
    return REVENUECAT_ANDROID_API_KEY;
  }
  return REVENUECAT_TEST_API_KEY;
}

function getPurchasesModule(): any | null {
  if (Platform.OS === "web") return null;
  try {
    return require("react-native-purchases").default;
  } catch {
    return null;
  }
}

export function initializeRevenueCat(): void {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn("[RevenueCat] API keys not configured — skipping initialization.");
    return;
  }
  const Purchases = getPurchasesModule();
  if (!Purchases) {
    console.warn("[RevenueCat] Native module not available — skipping initialization.");
    return;
  }
  try {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    console.log("[RevenueCat] Configured successfully.");
  } catch (err) {
    console.warn("[RevenueCat] Configuration failed:", err);
  }
}

function useSubscriptionContext() {
  const { user } = useAuth();
  const Purchases = getPurchasesModule();
  const apiKey = getRevenueCatApiKey();
  const isAvailable = Boolean(Purchases && apiKey);

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info", user?.id],
    queryFn: async () => {
      if (!Purchases) throw new Error("RevenueCat not available");
      return Purchases.getCustomerInfo();
    },
    enabled: isAvailable && Boolean(user?.id),
    staleTime: 60 * 1000,
    retry: false,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      if (!Purchases) throw new Error("RevenueCat not available");
      return Purchases.getOfferings();
    },
    enabled: isAvailable,
    staleTime: 300 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!isAvailable || !user?.id) return;
    let cancelled = false;

    async function identifyCustomer() {
      try {
        await Purchases.logIn(user!.id);
        if (!cancelled) {
          await Promise.all([customerInfoQuery.refetch(), offeringsQuery.refetch()]);
        }
      } catch (err: any) {
        console.warn("[RevenueCat] Login error:", err?.message);
      }
    }

    identifyCustomer();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isAvailable]);

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: any) => {
      if (!Purchases) throw new Error("RevenueCat not available");
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!Purchases) throw new Error("RevenueCat not available");
      return Purchases.restorePurchases();
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  return {
    customerInfo: customerInfoQuery.data ?? null,
    offerings: offeringsQuery.data ?? null,
    isSubscribed,
    isAvailable,
    isLoading: isAvailable ? (customerInfoQuery.isLoading || offeringsQuery.isLoading) : false,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    error: purchaseMutation.error,
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
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
