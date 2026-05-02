import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
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
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useThemeMode } from "@/contexts/ThemeContext";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

const REQUIRED_ENV: Record<string, string | undefined> = {
  EXPO_PUBLIC_DOMAIN: process.env.EXPO_PUBLIC_DOMAIN,
  EXPO_PUBLIC_REPL_ID: process.env.EXPO_PUBLIC_REPL_ID,
};
const MISSING_ENV = Object.entries(REQUIRED_ENV)
  .filter(([, v]) => !v)
  .map(([k]) => k);

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

setAuthTokenGetter(async () => {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem("commshub_session_token") : null;
    }
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync("commshub_session_token");
  } catch {
    return null;
  }
});

SplashScreen.preventAutoHideAsync();

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

const ALLOWED_UNAUTHED_PATHS = ["/login", "/signup", "/callback"];

const API_DOMAIN = process.env.EXPO_PUBLIC_API_DOMAIN ?? process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = API_DOMAIN ? `https://${API_DOMAIN}` : "";

function GmailConnectModal({
  visible,
  token,
  onDismiss,
}: {
  visible: boolean;
  token: string | null;
  onDismiss: () => void;
}) {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const bg = isDark ? "#0f172a" : "#ffffff";
  const cardBg = isDark ? "#1e293b" : "#f8fafc";
  const fg = isDark ? "#f1f5f9" : "#0f172a";
  const muted = isDark ? "#94a3b8" : "#64748b";
  const border = isDark ? "#334155" : "#e2e8f0";
  const primary = "#3b82f6";

  const handleConnect = useCallback(async () => {
    if (!token) return;
    const url = `${API_BASE}/api/auth/gmail/connect?mobileToken=${encodeURIComponent(token)}`;
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
    onDismiss();
  }, [token, onDismiss]);

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

function AuthedStack({ token }: { token: string | null }) {
  const [showGmailPrompt, setShowGmailPrompt] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!token || checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      try {
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
  }, [token]);

  return (
    <ErrorBoundary label="TabsErrorBoundary">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <GmailConnectModal
        visible={showGmailPrompt}
        token={token}
        onDismiss={() => setShowGmailPrompt(false)}
      />
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  const { user, token, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    const isAllowed = ALLOWED_UNAUTHED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="callback" />
        </Stack>
        {!isAllowed && <Redirect href="/login" />}
      </>
    );
  }

  return <AuthedStack token={token} />;
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

  if (!fontsLoaded && !fontError) return null;

  if (MISSING_ENV.length > 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#dc2626", marginBottom: 12 }}>
          Configuration Error
        </Text>
        <Text style={{ fontSize: 14, color: "#374151", textAlign: "center", lineHeight: 22 }}>
          {"The following required environment variables are not set:\n\n" + MISSING_ENV.join("\n")}
        </Text>
        <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 16, textAlign: "center" }}>
          Set these variables in your project secrets and restart the app.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary label="RootErrorBoundary">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
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
