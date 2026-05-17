import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClerkProvider, ClerkLoaded, ClerkLoading, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider, useThemeMode } from "@/contexts/ThemeContext";
import { SubscriptionProvider } from "@/lib/subscription";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { setTokenGetter } from "@/lib/authToken";

const API_DOMAIN = process.env.EXPO_PUBLIC_API_DOMAIN ?? process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = API_DOMAIN ? `https://${API_DOMAIN}` : "";

const _apiBaseUrl = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : null;
if (_apiBaseUrl) {
  setBaseUrl(_apiBaseUrl);
}

SplashScreen.preventAutoHideAsync().catch(() => {});

// Force-hide splash after 4 seconds so a slow/failed font download never
// leaves the user staring at a blank white screen.
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 4000);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        console.warn("[QueryClient] Query failed:", error);
        return failureCount < 2;
      },
    },
    mutations: {
      onError: (error) => {
        console.warn("[QueryClient] Mutation failed:", error);
      },
    },
  },
});

const ALLOWED_UNAUTHED_PATHS = ["/login", "/signup"];

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function GmailConnectModal({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const { getToken } = useAuth();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const bg = isDark ? "#0f172a" : "#ffffff";
  const cardBg = isDark ? "#1e293b" : "#f8fafc";
  const fg = isDark ? "#f1f5f9" : "#0f172a";
  const muted = isDark ? "#94a3b8" : "#64748b";
  const border = isDark ? "#334155" : "#e2e8f0";
  const primary = "#3b82f6";

  const handleConnect = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const mobileCompleteUrl = `${API_BASE}/api/mobile-oauth-complete`;
    const url = `${API_BASE}/api/auth/gmail/connect?mobileToken=${encodeURIComponent(token)}`;
    await WebBrowser.openAuthSessionAsync(url, mobileCompleteUrl);
    onDismiss();
  }, [getToken, onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: bg, borderColor: border }]}>
          <View style={[styles.gmailIconWrap, { backgroundColor: "#EA433520" }]}>
            <Feather name="mail" size={28} color="#EA4335" />
          </View>

          <Text style={[styles.modalTitle, { color: fg }]}>Connect Gmail</Text>
          <Text style={[styles.modalBody, { color: muted }]}>
            Connect your Gmail account to read emails, draft replies, and send messages — all from the AI assistant.
          </Text>

          <View style={[styles.featureList, { backgroundColor: cardBg, borderColor: border }]}>
            {[
              { icon: "inbox" as const, text: "Read and manage your inbox" },
              { icon: "send" as const, text: "Send emails directly from AI drafts" },
              { icon: "search" as const, text: "Search across all your messages" },
            ].map(({ icon, text }) => (
              <View key={text} style={styles.featureRow}>
                <Feather name={icon} size={14} color={primary} />
                <Text style={[styles.featureText, { color: fg }]}>{text}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={[styles.connectBtn, { backgroundColor: primary }]}
            onPress={handleConnect}
          >
            <Feather name="link" size={16} color="#fff" />
            <Text style={styles.connectBtnText}>Connect Gmail</Text>
          </Pressable>

          <Pressable style={styles.skipBtn} onPress={onDismiss}>
            <Text style={[styles.skipText, { color: muted }]}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const GMAIL_PROMPT_KEY = "gmail_prompt_dismissed_at";
const GMAIL_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function AuthedStack() {
  const { getToken } = useAuth();
  const [showGmailPrompt, setShowGmailPrompt] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    setTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      try {
        // Check if user dismissed the prompt recently
        const dismissedAt = await AsyncStorage.getItem(GMAIL_PROMPT_KEY);
        if (dismissedAt) {
          const elapsed = Date.now() - parseInt(dismissedAt, 10);
          if (elapsed < GMAIL_PROMPT_COOLDOWN_MS) return;
        }

        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/accounts/connected`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.gmail) {
            setShowGmailPrompt(true);
          }
        }
      } catch {}
    })();
  }, [getToken]);

  const handleDismissGmailPrompt = useCallback(async () => {
    await AsyncStorage.setItem(GMAIL_PROMPT_KEY, String(Date.now()));
    setShowGmailPrompt(false);
  }, []);

  return (
    <ErrorBoundary label="TabsErrorBoundary">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fff" } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <GmailConnectModal
        visible={showGmailPrompt}
        onDismiss={handleDismissGmailPrompt}
      />
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!isSignedIn) {
    const isAllowed = ALLOWED_UNAUTHED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    return (
      <>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fff" } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack>
        {!isAllowed && <Redirect href="/login" />}
      </>
    );
  }

  return <AuthedStack />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#dc2626", marginBottom: 12 }}>
          Configuration Error
        </Text>
        <Text style={{ fontSize: 14, color: "#374151", textAlign: "center", lineHeight: 22 }}>
          {"EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set.\n\nSet this variable in your project secrets and restart the app."}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={publishableKey}
        tokenCache={tokenCache}
        {...(proxyUrl ? { proxyUrl } : {})}
      >
        <ClerkLoading>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        </ClerkLoading>
        <ClerkLoaded>
          <ErrorBoundary label="RootErrorBoundary">
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                <SubscriptionProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                </SubscriptionProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  modal: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  gmailIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  modalBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  featureList: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  connectBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  connectBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
